import {createTidePredictor} from '@neaps/tide-predictor';

const EARTH_RADIUS_KM = 6371.0088;

function radians(value) {
  return value * Math.PI / 180;
}

export function distanceKm(a, b) {
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const latitudeA = radians(a.latitude);
  const latitudeB = radians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function closestPoint(points, input) {
  const candidates = points.map(point => ({point, distanceKm: distanceKm(input, point)}))
    .sort((left, right) => left.distanceKm - right.distanceKm);
  const closest = candidates[0];
  if (!closest || closest.distanceKm > closest.point.maximumDistanceKm) return null;
  return closest;
}

export function forecastFromTile(tileDocument, {latitude, longitude, start, days = 5}) {
  const startDate = new Date(start);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Invalid latitude');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Invalid longitude');
  if (!Number.isFinite(startDate.getTime())) throw new Error('Invalid start instant');
  if (!Number.isInteger(days) || days < 1 || days > 7) throw new Error('Days must be an integer from 1 to 7');

  const match = closestPoint(tileDocument.tile.points, {latitude, longitude});
  if (!match) {
    const error = new Error('No initialized harmonic point covers this location');
    error.code = 'coverage-unavailable';
    throw error;
  }

  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
  const predictor = createTidePredictor(match.point.constituents, {
    nodeCorrections: 'schureman',
  });
  const tides = predictor.getExtremesPrediction({start: startDate, end: endDate})
    .map(event => ({
      type: event.high ? 'high' : 'low',
      at: event.time.toISOString(),
      height: event.level,
      unit: match.point.units,
    }));

  return {
    schema: 'tide-here/harmonic-forecast-spike/v1',
    input: {latitude, longitude, start: startDate.toISOString(), days},
    point: {
      id: match.point.id,
      name: match.point.name,
      latitude: match.point.latitude,
      longitude: match.point.longitude,
      distanceKm: match.distanceKm,
      timeZone: match.point.timeZone,
      datum: match.point.datum,
    },
    dataset: tileDocument.dataset,
    engine: {
      package: '@neaps/tide-predictor',
      version: '0.11.0',
      nodeCorrections: 'schureman',
    },
    tides,
    warnings: [
      'Stage 1 feasibility result only; this fixture is not FES2022 and is not for navigation.',
    ],
  };
}
