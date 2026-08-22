function finiteCoordinate(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function normalizedStation(station) {
  if (!station.id || !station.name || station.latitude === null || station.longitude === null) return null;
  return Object.freeze(station);
}

export function normalizeNoaaStations(payload, providerConfig) {
  const stations = payload?.stations ?? payload?.stationList;
  if (!Array.isArray(stations)) throw new TypeError('NOAA catalogue must contain stations');
  return stations.map((station) => normalizedStation({
    provider: 'noaa',
    country: providerConfig.country,
    id: String(station.id ?? ''),
    code: String(station.id ?? ''),
    name: String(station.name ?? '').trim(),
    latitude: finiteCoordinate(station.lat, -90, 90),
    longitude: finiteCoordinate(station.lng, -180, 180),
    jurisdiction: station.state ? `${providerConfig.country}-${station.state}` : providerConfig.country,
    datum: providerConfig.datum,
    kind: station.type === 'R' ? 'reference' : station.type === 'S' ? 'subordinate' : 'unknown',
    referenceStationId: station.reference_id || null,
    active: true,
    sourceUrl: providerConfig.catalogueUrl
  })).filter(Boolean);
}

export function normalizeChsStations(payload, providerConfig, metadataById = {}) {
  if (!Array.isArray(payload)) throw new TypeError('CHS catalogue must be an array');
  return payload.filter((station) => (
    Array.isArray(station.timeSeries) && station.timeSeries.some((series) => series?.code === 'wlp-hilo')
  )).map((station) => {
    const metadata = metadataById[station.id] ?? {};
    const kind = metadata.isTideTableReferencePort === true
      ? 'reference'
      : metadata.referencePortStationId
        ? 'subordinate'
        : 'unknown';
    return normalizedStation({
      provider: 'chs',
      country: providerConfig.country,
      id: String(station.id ?? ''),
      code: String(station.code ?? ''),
      name: String(station.officialName ?? '').trim(),
      latitude: finiteCoordinate(station.latitude, -90, 90),
      longitude: finiteCoordinate(station.longitude, -180, 180),
      jurisdiction: metadata.provinceCode ? `${providerConfig.country}-${metadata.provinceCode}` : providerConfig.country,
      datum: providerConfig.datum,
      kind,
      referenceStationId: metadata.referencePortStationId ?? null,
      active: true,
      sourceUrl: providerConfig.catalogueUrl
    });
  }).filter(Boolean);
}

export function normalizeStationCatalogues(raw, config) {
  return [
    ...normalizeNoaaStations(raw.noaa, config.providers.noaa),
    ...normalizeChsStations(raw.chs.stations, config.providers.chs, raw.chs.metadataById)
  ];
}

async function fetchJson(fetchImpl, url, signal) {
  const response = await fetchImpl(url, { signal });
  if (!response?.ok) throw new Error(`Station catalogue returned HTTP ${response?.status ?? 'error'}`);
  return response.json();
}

export async function fetchStationCatalogues({ config, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
  if (!config?.providers?.noaa?.catalogueUrl || !config?.providers?.chs?.catalogueUrl) {
    throw new TypeError('Station catalogue fetch requires NOAA and CHS configuration');
  }
  if (typeof fetchImpl !== 'function') throw new TypeError('Station catalogue fetch requires fetch');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError('Station catalogue timeout must be positive');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [noaa, chs] = await Promise.all([
      fetchJson(fetchImpl, config.providers.noaa.catalogueUrl, controller.signal),
      fetchJson(fetchImpl, config.providers.chs.catalogueUrl, controller.signal)
    ]);
    return normalizeStationCatalogues({ noaa, chs: { stations: chs, metadataById: {} } }, config);
  } finally {
    clearTimeout(timeout);
  }
}

export async function readThroughStationCatalogue({
  storage,
  cacheKey = 'tide-here.station-catalogue.v2',
  now = Date.now(),
  ttlMs,
  fetchCatalogue
}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Catalogue storage must provide getItem and setItem');
  }
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new RangeError('Catalogue cache TTL must be positive');
  if (typeof fetchCatalogue !== 'function') throw new TypeError('fetchCatalogue must be a function');

  const cachedText = await storage.getItem(cacheKey);
  if (cachedText) {
    try {
      const cached = JSON.parse(cachedText);
      if (Number.isFinite(cached.savedAt) && now - cached.savedAt < ttlMs && Array.isArray(cached.stations)) {
        return { stations: cached.stations, source: 'cache', savedAt: cached.savedAt };
      }
    } catch {
      // A malformed cache is a miss; the provider result replaces it below.
    }
  }

  const stations = await fetchCatalogue();
  if (!Array.isArray(stations)) throw new TypeError('fetchCatalogue must return an array');
  await storage.setItem(cacheKey, JSON.stringify({ savedAt: now, stations }));
  return { stations, source: 'provider', savedAt: now };
}
