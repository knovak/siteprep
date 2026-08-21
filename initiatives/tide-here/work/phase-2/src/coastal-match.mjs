const EARTH_RADIUS_KM = 6371.0088;

function radians(degrees) {
  return degrees * Math.PI / 180;
}

function assertPlace(place) {
  if (!Number.isFinite(place?.latitude) || place.latitude < -90 || place.latitude > 90) throw new RangeError('Place latitude is out of range');
  if (!Number.isFinite(place?.longitude) || place.longitude < -180 || place.longitude > 180) throw new RangeError('Place longitude is out of range');
}

export function greatCircleDistanceKm(a, b) {
  assertPlace(a);
  assertPlace(b);
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const latitudeA = radians(a.latitude);
  const latitudeB = radians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function rankStations(place, stations) {
  assertPlace(place);
  if (!Array.isArray(stations)) throw new TypeError('Stations must be an array');
  return stations.map((station) => ({
    station,
    distanceKm: greatCircleDistanceKm(place, station)
  })).sort((a, b) => a.distanceKm - b.distanceKm || a.station.provider.localeCompare(b.station.provider) || a.station.id.localeCompare(b.station.id));
}

function candidate(entry) {
  return {
    provider: entry.station.provider,
    country: entry.station.country,
    id: entry.station.id,
    code: entry.station.code,
    name: entry.station.name,
    jurisdiction: entry.station.jurisdiction,
    kind: entry.station.kind,
    referenceStationId: entry.station.referenceStationId,
    latitude: entry.station.latitude,
    longitude: entry.station.longitude,
    distanceKm: Number(entry.distanceKm.toFixed(2))
  };
}

export function matchCoast(place, stations, config) {
  const ranked = rankStations(place, stations);
  if (ranked.length === 0 || ranked[0].distanceKm > config.maximumKm) {
    return {
      status: 'coverage-unavailable',
      code: 'coverage-unavailable',
      station: null,
      candidates: [],
      nearestDistanceKm: ranked[0] ? Number(ranked[0].distanceKm.toFixed(2)) : null,
      supportedCountries: [...new Set(stations.map((station) => station.country))].sort()
    };
  }

  const closest = ranked[0];
  const next = ranked[1];
  const clearlyCloser = !next || closest.distanceKm <= config.clarityRatio * next.distanceKm;
  if (closest.distanceKm <= config.automaticKm && clearlyCloser) {
    return {
      status: 'accepted',
      code: null,
      station: closest.station,
      coast: { name: closest.station.name, distanceKm: Number(closest.distanceKm.toFixed(2)) },
      candidates: []
    };
  }

  return {
    status: 'coast-choice-required',
    code: 'coast-choice-required',
    station: null,
    candidates: ranked.filter((entry) => entry.distanceKm <= config.maximumKm).slice(0, config.maxChoices).map(candidate)
  };
}
