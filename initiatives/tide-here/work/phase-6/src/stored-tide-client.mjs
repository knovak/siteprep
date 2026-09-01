export const AUSTRALIAN_PROVIDER_ID = 'australia-standard-ports';
export const FES_PROVIDER_ID = 'fes2022';

export async function loadAvailableStations({direct, stored}) {
  if (typeof direct !== 'function' || typeof stored !== 'function') {
    throw new TypeError('Station loading requires direct and stored provider functions');
  }
  const [directResult, storedResult] = await Promise.allSettled([direct(), stored()]);
  const directStations = directResult.status === 'fulfilled' && Array.isArray(directResult.value)
    ? directResult.value
    : [];
  const storedStations = storedResult.status === 'fulfilled' && Array.isArray(storedResult.value)
    ? storedResult.value
    : [];
  const stations = [...directStations, ...storedStations];
  if (!stations.length) throw new Error('No tide station catalogue is available');
  return Object.freeze(stations);
}

function emptyDays(rows) {
  return rows.map((row) => ({
    date: row.date,
    tides: [],
    sunrise: [],
    sunset: [],
    moonrise: [],
    moonset: [],
    moonPhase: null,
  }));
}

function normalizedStation(station, provider) {
  const latitude = Number(station?.latitude);
  const longitude = Number(station?.longitude);
  if (!station?.id || !station.name || !station.timeZone || !station.datum
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Stored station catalogue contains an invalid station');
  }
  return Object.freeze({
    ...station,
    provider,
    latitude,
    longitude,
  });
}

function unavailableForecast({context, station, timeZone, rows}) {
  return Object.freeze({
    input: Object.freeze({display: context.input.display}),
    place: Object.freeze({...context.place}),
    coast: Object.freeze({...context.coast}),
    station: Object.freeze({
      provider: station.provider,
      country: station.country,
      id: station.id,
      name: station.name,
      kind: station.kind,
      datum: station.datum,
      referenceStationId: station.referenceStationId ?? null,
    }),
    timeZone,
    days: Object.freeze(emptyDays(rows).map(Object.freeze)),
    sources: Object.freeze([]),
    warnings: Object.freeze([Object.freeze({
      code: 'tides-unavailable',
      message: 'Stored tide predictions are unavailable.',
    })]),
  });
}

function completeForecast(value) {
  return Boolean(
    value?.input?.display
    && value?.place?.name
    && value?.coast?.name
    && value?.station?.id
    && value?.timeZone
    && Array.isArray(value?.days)
    && value.days.length === 5
    && Array.isArray(value?.sources)
    && Array.isArray(value?.warnings)
  );
}

export class StoredTideClient {
  constructor({
    provider = AUSTRALIAN_PROVIDER_ID,
    fetchImpl = globalThis.fetch,
    stationFixtures = null,
    timeoutMs = 10000,
  } = {}) {
    if (!provider || typeof fetchImpl !== 'function') throw new TypeError('Stored tide client requires provider and fetch');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError('Stored tide client timeout must be positive');
    this.provider = provider;
    this.fetchImpl = fetchImpl;
    this.stationFixtures = stationFixtures;
    this.timeoutMs = timeoutMs;
    this.stationPromise = null;
  }

  async fetchJson(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(path, {...options, signal: controller.signal});
      if (!response?.ok) throw new Error(`Stored tide service returned HTTP ${response?.status ?? 'error'}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async stations() {
    if (!this.stationPromise) {
      this.stationPromise = (async () => {
        const payload = this.stationFixtures
          ? {provider: this.provider, stations: this.stationFixtures}
          : await this.fetchJson(`/stations?provider=${encodeURIComponent(this.provider)}`);
        if (payload?.provider !== this.provider || !Array.isArray(payload.stations)) {
          throw new Error('Stored station catalogue does not match its provider');
        }
        return Object.freeze(payload.stations.map((station) => normalizedStation(station, this.provider)));
      })();
    }
    return this.stationPromise;
  }

  async resolve({latitude, longitude, name = null}) {
    try {
      const value = await this.fetchJson('/resolve', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          provider: this.provider,
          latitude,
          longitude,
          ...(typeof name === 'string' && name.trim() ? {displayName: name.trim()} : {}),
        }),
      });
      if (value?.provider !== this.provider || !value.station || !value.coast) {
        throw new Error('Stored tide service returned an invalid location resolution');
      }
      const station = normalizedStation(value.station, this.provider);
      const distanceKm = Number(value.coast.distanceKm);
      if (!value.coast.name || !Number.isFinite(distanceKm) || distanceKm < 0) {
        throw new Error('Stored tide service returned an invalid model coast');
      }
      return Object.freeze({
        station,
        coast: Object.freeze({...value.coast, distanceKm}),
      });
    } catch {
      return null;
    }
  }

  async forecast({context, station, timeZone, rows}) {
    try {
      const value = await this.fetchJson('/forecast', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          provider: this.provider,
          context,
          station: this.provider === FES_PROVIDER_ID
            ? {id: station.id, latitude: station.latitude, longitude: station.longitude, country: station.country ?? null}
            : {id: station.id},
          timeZone,
          rows,
        }),
      });
      if (!completeForecast(value)) throw new Error('Stored tide service returned an invalid forecast');
      return value;
    } catch {
      return unavailableForecast({context, station, timeZone, rows});
    }
  }
}
