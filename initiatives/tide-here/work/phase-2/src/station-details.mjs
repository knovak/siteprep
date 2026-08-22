const NOAA_TIME_ZONES = Object.freeze({
  '-11': 'Pacific/Pago_Pago',
  '-9': 'America/Anchorage',
  '-8': 'America/Los_Angeles',
  '-7': 'America/Denver',
  '-6': 'America/Chicago',
  '-5': 'America/New_York',
  '-4': 'America/Puerto_Rico',
  '6': 'Etc/GMT-6',
  '7': 'Etc/GMT-7',
  '9': 'Pacific/Palau',
  '10': 'Pacific/Guam',
  '12': 'Pacific/Kwajalein',
  '13': 'Pacific/Apia'
});

function noaaTimeZone(metadata) {
  const offset = Number(metadata?.timezonecorr);
  const state = String(metadata?.state || '');
  const longitude = Number(metadata?.lng);
  if (state === 'HI') return 'Pacific/Honolulu';
  if (state === 'AS') return 'Pacific/Pago_Pago';
  if (state === 'GU') return 'Pacific/Guam';
  if (state === 'PR' || state === 'VI') return 'America/Puerto_Rico';
  if (state === 'AK' && offset === -10) return 'America/Adak';
  if (offset === -10) return longitude < -165 ? 'Pacific/Honolulu' : 'Pacific/Tahiti';
  return NOAA_TIME_ZONES[String(offset)] || null;
}

function metadataUrl(providerConfig, station) {
  if (!providerConfig?.stationMetadataUrl) throw new TypeError(`Missing ${station.provider} station metadata URL`);
  return providerConfig.stationMetadataUrl.replace('{stationId}', encodeURIComponent(station.id));
}

function chsDetails(station, metadata) {
  const kind = metadata?.isTideTableReferencePort === true
    ? 'reference'
    : metadata?.referencePortStationId
      ? 'subordinate'
      : station.kind;
  return {
    ...station,
    jurisdiction: metadata?.provinceCode ? `CA-${metadata.provinceCode}` : station.jurisdiction,
    kind,
    referenceStationId: metadata?.referencePortStationId ?? station.referenceStationId,
    timeZone: String(metadata?.timeZoneCode || '')
  };
}

function noaaDetails(station, payload) {
  const metadata = payload?.stations?.find((entry) => String(entry.id) === String(station.id)) ?? payload?.stations?.[0];
  return { ...station, timeZone: noaaTimeZone(metadata) || '' };
}

function validDetails(station) {
  if (!station?.timeZone) throw new RangeError(`No coast time zone is available for ${station?.provider || 'unknown'} station ${station?.id || ''}`);
  try {
    new Intl.DateTimeFormat('en', { timeZone: station.timeZone }).format(0);
  } catch {
    throw new RangeError(`Invalid coast time zone: ${station.timeZone}`);
  }
  return Object.freeze(station);
}

export function normalizeStationDetails(station, payload) {
  if (!station?.id || !station?.provider) throw new TypeError('Station details require a normalized station');
  if (station.provider === 'noaa') return validDetails(noaaDetails(station, payload));
  if (station.provider === 'chs') return validDetails(chsDetails(station, payload));
  throw new RangeError(`Unknown station provider: ${station.provider}`);
}

export async function fetchStationDetails({ station, config, fetchImpl = globalThis.fetch }) {
  if (typeof fetchImpl !== 'function') throw new TypeError('Station details require fetch');
  const providerConfig = config?.providers?.[station?.provider];
  const response = await fetchImpl(metadataUrl(providerConfig, station));
  if (!response?.ok) throw new Error(`Station metadata returned HTTP ${response?.status ?? 'error'}`);
  return normalizeStationDetails(station, await response.json());
}

export async function readThroughStationDetails({
  storage,
  station,
  now = Date.now(),
  ttlMs,
  fetchDetails
}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Station-details storage must provide getItem and setItem');
  }
  if (!station?.provider || !station?.id) throw new TypeError('Station details require a station identity');
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new RangeError('Station-details cache TTL must be positive');
  if (typeof fetchDetails !== 'function') throw new TypeError('fetchDetails must be a function');
  const cacheKey = `tide-here.station-details.v1.${station.provider}.${station.id}`;
  const cachedText = await storage.getItem(cacheKey);
  if (cachedText) {
    try {
      const cached = JSON.parse(cachedText);
      if (Number.isFinite(cached.savedAt) && now - cached.savedAt < ttlMs && cached.station?.timeZone) {
        return { station: validDetails(cached.station), source: 'cache', savedAt: cached.savedAt };
      }
    } catch {
      // A malformed cache is a miss.
    }
  }
  const detailedStation = validDetails(await fetchDetails());
  await storage.setItem(cacheKey, JSON.stringify({ savedAt: now, station: detailedStation }));
  return { station: detailedStation, source: 'provider', savedAt: now };
}
