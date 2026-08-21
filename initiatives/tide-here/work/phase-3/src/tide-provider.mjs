import { placeInstantInRow } from '../../phase-1/src/day-model.mjs';

export const TIDES_UNAVAILABLE = 'tides-unavailable';

function requestBounds(rows) {
  if (!Array.isArray(rows) || rows.length !== 5) throw new RangeError('Tide requests require exactly five local-day rows');
  const from = rows[0]?.startUtc;
  const to = rows.at(-1)?.endUtc;
  if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from) >= Date.parse(to)) {
    throw new RangeError('Tide request rows have invalid UTC bounds');
  }
  return { from, to };
}

function isoCompactDate(instant) {
  return new Date(instant).toISOString().slice(0, 10).replaceAll('-', '');
}

export function buildNoaaRequest({ station, rows, config }) {
  const { from, to } = requestBounds(rows);
  const query = new URLSearchParams({
    product: 'predictions',
    application: 'tide-here',
    begin_date: isoCompactDate(from),
    end_date: isoCompactDate(to),
    datum: station.datum || config.datum,
    station: station.id,
    time_zone: 'gmt',
    units: 'metric',
    interval: 'hilo',
    format: 'json'
  });
  return `${config.predictionUrl}?${query}`;
}

export function buildChsRequest({ station, rows, config }) {
  const { from, to } = requestBounds(rows);
  const base = config.predictionUrl.replace('{stationId}', encodeURIComponent(station.id));
  const query = new URLSearchParams({
    'time-series-code': 'wlp-hilo',
    from,
    to
  });
  return `${base}?${query}`;
}

function parseNoaaInstant(value) {
  if (typeof value !== 'string') return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}:00Z`
    : value;
  return Number.isFinite(Date.parse(normalized)) ? new Date(normalized).toISOString() : null;
}

function parseChsInstant(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function alternatingTypes(values) {
  const score = (firstHigh) => {
    const highs = [];
    const lows = [];
    values.forEach((value, index) => ((index % 2 === 0) === firstHigh ? highs : lows).push(value));
    const average = (items) => items.reduce((sum, item) => sum + item, 0) / Math.max(items.length, 1);
    return average(highs) - average(lows);
  };
  const firstHigh = score(true) >= score(false);
  return values.map((_, index) => ((index % 2 === 0) === firstHigh ? 'high' : 'low'));
}

function tideInRow({ type, instant, height }, rows, timeZone) {
  if (!['high', 'low'].includes(type) || !Number.isFinite(height)) return null;
  const placement = placeInstantInRow(instant, rows, timeZone);
  if (!placement) return null;
  return {
    rowIndex: placement.rowIndex,
    tide: {
      type,
      at: placement.instantUtc,
      localTime: placement.localTime,
      offsetMinutes: placement.offsetMinutes,
      offset: placement.offset,
      height,
      unit: 'm'
    }
  };
}

export function normalizeNoaaPredictions(payload, { rows, timeZone }) {
  if (!Array.isArray(payload?.predictions)) throw new TypeError('NOAA prediction payload is malformed');
  const events = payload.predictions.map((prediction) => {
    const instant = parseNoaaInstant(prediction?.t);
    return instant ? tideInRow({
      type: prediction.type === 'H' ? 'high' : prediction.type === 'L' ? 'low' : null,
      instant,
      height: Number(prediction.v)
    }, rows, timeZone) : null;
  }).filter(Boolean);
  if (events.length === 0) throw new RangeError('NOAA returned no valid predictions in range');
  return events;
}

export function normalizeChsPredictions(payload, { rows, timeZone }) {
  if (!Array.isArray(payload)) throw new TypeError('CHS prediction payload is malformed');
  const parsed = payload.map((prediction) => ({
    instant: parseChsInstant(prediction?.eventDate),
    height: Number(prediction?.value)
  })).filter((prediction) => prediction.instant && Number.isFinite(prediction.height));
  if (parsed.length === 0) throw new RangeError('CHS returned no valid predictions in range');
  const types = alternatingTypes(parsed.map((prediction) => prediction.height));
  const events = parsed.map((prediction, index) => tideInRow({ ...prediction, type: types[index] }, rows, timeZone)).filter(Boolean);
  if (events.length === 0) throw new RangeError('CHS returned no valid predictions in range');
  return events;
}

function sourceDetails({ station, config, requestUrl, retrievedAt }) {
  return Object.freeze({
    provider: station.provider,
    country: station.country,
    stationId: station.id,
    stationName: station.name,
    stationKind: station.kind,
    referenceStationId: station.referenceStationId || null,
    datum: station.datum || config.datum,
    sourceUrl: requestUrl,
    licenceUrl: config.licenceUrl,
    attribution: config.attribution,
    retrievedAt
  });
}

function stationDetails(station, config) {
  return Object.freeze({
    provider: station.provider,
    country: station.country,
    id: station.id,
    name: station.name,
    kind: station.kind,
    datum: station.datum || config.datum,
    referenceStationId: station.referenceStationId || null
  });
}

function emptyDays(rows) {
  return rows.map((row) => ({
    date: row.date,
    tides: [],
    sunrise: [],
    sunset: [],
    moonrise: [],
    moonset: [],
    moonPhase: null
  }));
}

function normalizedForecast({ context, station, timeZone, rows, config, source, events, warning }) {
  const days = emptyDays(rows);
  for (const event of events) days[event.rowIndex].tides.push(event.tide);
  return Object.freeze({
    input: Object.freeze({ display: context.input.display }),
    place: Object.freeze({ ...context.place }),
    coast: Object.freeze({ ...context.coast }),
    station: stationDetails(station, config),
    timeZone,
    days,
    sources: [source],
    warnings: warning ? [Object.freeze({ code: TIDES_UNAVAILABLE, message: warning })] : []
  });
}

async function fetchJson(fetchImpl, requestUrl, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(requestUrl, { signal: controller.signal });
    if (!response?.ok) throw new Error(`Provider returned HTTP ${response?.status ?? 'error'}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function adapterFor(provider) {
  if (provider === 'noaa') return { buildRequest: buildNoaaRequest, normalize: normalizeNoaaPredictions };
  if (provider === 'chs') return { buildRequest: buildChsRequest, normalize: normalizeChsPredictions };
  throw new RangeError(`Unknown tide provider: ${provider}`);
}

export class TideProvider {
  constructor({ config, fetchImpl = globalThis.fetch, timeoutMs = 8000, now = () => new Date() }) {
    if (!config?.providers) throw new TypeError('TideProvider requires provider configuration');
    if (typeof fetchImpl !== 'function') throw new TypeError('TideProvider requires fetch');
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.now = now;
  }

  async forecast({ context, station, timeZone, rows }) {
    const providerConfig = this.config.providers[station.provider];
    if (!providerConfig) throw new RangeError(`Missing configuration for ${station.provider}`);
    const adapter = adapterFor(station.provider);
    const requestUrl = adapter.buildRequest({ station, rows, config: providerConfig });
    const retrievedAt = this.now().toISOString();
    const source = sourceDetails({ station, config: providerConfig, requestUrl, retrievedAt });
    try {
      const payload = await fetchJson(this.fetchImpl, requestUrl, this.timeoutMs);
      const events = adapter.normalize(payload, { rows, timeZone });
      return normalizedForecast({ context, station, timeZone, rows, config: providerConfig, source, events });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? `${providerConfig.attribution} request timed out.`
        : `${providerConfig.attribution} predictions are unavailable.`;
      return normalizedForecast({ context, station, timeZone, rows, config: providerConfig, source, events: [], warning: message });
    }
  }
}
