// Fetches one calendar year of high/low predictions for a browser-direct
// station (NOAA or CHS) and reduces it to an extremity record. The request has
// the same shape as the forecast request; only the date range differs.
import { buildExtremityRecord, classifyExtrema } from './extremity.mjs';

function yearBounds(year) {
  if (!Number.isInteger(year)) throw new TypeError('A calendar year is required');
  return { from: `${year}-01-01T00:00:00Z`, to: `${year + 1}-01-01T00:00:00Z` };
}

function inYear(instant, year) {
  return typeof instant === 'string' && instant.slice(0, 4) === String(year);
}

export function noaaYearUrl({ station, year, config }) {
  yearBounds(year);
  const query = new URLSearchParams({
    product: 'predictions',
    application: 'tide-here',
    begin_date: `${year}0101`,
    end_date: `${year}1231`,
    datum: station.datum || config.datum,
    station: station.id,
    time_zone: 'gmt',
    units: 'metric',
    interval: 'hilo',
    format: 'json'
  });
  return `${config.predictionUrl}?${query}`;
}

export function chsYearUrl({ station, year, config }) {
  const { from, to } = yearBounds(year);
  const base = config.predictionUrl.replace('{stationId}', encodeURIComponent(station.id));
  return `${base}?${new URLSearchParams({ 'time-series-code': 'wlp-hilo', from, to })}`;
}

export function noaaYearEvents(payload, year) {
  if (!Array.isArray(payload?.predictions)) throw new TypeError('NOAA prediction payload is malformed');
  return payload.predictions
    .filter((row) => inYear(row?.t, year))
    .map((row) => ({ type: row.type === 'H' ? 'high' : row.type === 'L' ? 'low' : null, height: Number(row.v) }))
    .filter((event) => event.type && Number.isFinite(event.height));
}

export function chsYearEvents(payload, year) {
  if (!Array.isArray(payload)) throw new TypeError('CHS prediction payload is malformed');
  const rows = payload
    .map((row) => ({ at: row?.eventDate, height: Number(row?.value) }))
    .filter((row) => Number.isFinite(Date.parse(row.at)) && Number.isFinite(row.height))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  const types = classifyExtrema(rows.map((row) => row.height));
  return rows
    .map((row, index) => ({ type: types[index], height: row.height, at: new Date(row.at).toISOString() }))
    .filter((row) => row.type && inYear(row.at, year))
    .map(({ type, height }) => ({ type, height }));
}

const SOURCES = Object.freeze({
  noaa: Object.freeze({ url: noaaYearUrl, events: noaaYearEvents }),
  chs: Object.freeze({ url: chsYearUrl, events: chsYearEvents })
});

export function isDirectExtremityProvider(provider) {
  return Object.hasOwn(SOURCES, provider);
}

export async function fetchDirectExtremityRecord({ station, year, config, fetchImpl, signal, timeoutMs = 10000, now = () => new Date() }) {
  const source = SOURCES[station?.provider];
  const providerConfig = config?.providers?.[station?.provider];
  if (!source || !providerConfig) throw new RangeError(`No direct extremity source for ${station?.provider}`);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  try {
    const response = await fetchImpl(source.url({ station, year, config: providerConfig }), { signal: controller.signal, priority: 'low' });
    if (!response?.ok) throw new Error(`Provider returned HTTP ${response?.status ?? 'error'}`);
    const events = source.events(await response.json(), year);
    return buildExtremityRecord({
      provider: station.provider,
      stationId: station.id,
      datum: station.datum || providerConfig.datum,
      unit: 'm',
      year,
      events,
      computedAt: now()
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
