import {placeInstantInRow} from '../../phase-1/src/day-model.mjs';
import {closestPoint, forecastFromTile} from '../../phase-9/src/forecast.mjs';
import {
  loadVerifiedDatasetObject,
  verifyDatasetVersion,
} from '../../phase-10/src/json-dataset.mjs';

function requestParts(request) {
  if (!request?.context?.input?.display || !request.context.place || !request.context.coast) {
    throw new Error('FES forecast requires input, place and coast context');
  }
  if (!request.station || !Number.isFinite(request.station.latitude) || !Number.isFinite(request.station.longitude)) {
    throw new Error('FES forecast requires model-point coordinates');
  }
  if (!request.timeZone || !Array.isArray(request.rows) || request.rows.length !== 5) {
    throw new Error('FES forecast requires a time zone and five local-day rows');
  }
  const start = request.rows[0]?.startUtc;
  const end = request.rows.at(-1)?.endUtc;
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) >= Date.parse(end)) {
    throw new Error('FES forecast rows need valid UTC bounds');
  }
  return {start, end};
}

function inExpandedBounds(entry, latitude, longitude) {
  const padding = entry.maximumDistanceKm / 90;
  return latitude >= entry.bounds.south - padding
    && latitude <= entry.bounds.north + padding
    && longitude >= entry.bounds.west - padding
    && longitude <= entry.bounds.east + padding;
}

function emptyDays(rows) {
  return rows.map(row => ({
    date: row.date,
    tides: [],
    sunrise: [],
    sunset: [],
    moonrise: [],
    moonset: [],
    moonPhase: null,
  }));
}

function metres(event) {
  if (event.unit === 'm') return event.height;
  if (event.unit === 'cm') return event.height / 100;
  throw new Error(`Unsupported harmonic height unit: ${event.unit}`);
}

async function loadCandidateTiles(store, descriptor, latitude, longitude) {
  const verified = await verifyDatasetVersion(store, descriptor.dataRef);
  if (!verified.ready) {
    const error = new Error(`FES dataset is unavailable: ${verified.reason}`);
    error.code = 'stored-dataset-unavailable';
    throw error;
  }
  const loadedIndex = await loadVerifiedDatasetObject(store, verified, 'tile-index');
  if (!loadedIndex.ready || loadedIndex.value.schema !== 'tide-here/fes-tile-index/v1') {
    const error = new Error('FES tile index is unavailable or invalid');
    error.code = 'stored-dataset-version-mismatch';
    throw error;
  }
  const entries = loadedIndex.value.inventory.filter(entry => inExpandedBounds(entry, latitude, longitude));
  if (entries.length === 0) {
    const error = new Error('No initialized FES water point covers this location');
    error.code = 'coverage-unavailable';
    throw error;
  }
  const tiles = [];
  for (const entry of entries) {
    const loaded = await loadVerifiedDatasetObject(store, verified, entry.objectName);
    if (!loaded.ready || loaded.value.schema !== 'tide-here/harmonic-tile/v1') {
      const error = new Error(`FES tile is unavailable: ${entry.objectName}`);
      error.code = 'stored-dataset-unavailable';
      throw error;
    }
    tiles.push(loaded.value);
  }
  return {dataset: verified.manifest.dataset, tiles};
}

function requestedCoordinates(request) {
  const latitude = Number(request?.latitude);
  const longitude = Number(request?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('FES resolution requires valid coordinates');
  }
  return {latitude, longitude};
}

export async function resolveFesModelPoint({store, request, descriptor}) {
  const coordinates = requestedCoordinates(request);
  const loaded = await loadCandidateTiles(store, descriptor, coordinates.latitude, coordinates.longitude);
  const match = closestPoint(loaded.tiles.flatMap(tile => tile.tile.points), coordinates);
  if (!match) {
    const error = new Error('No initialized FES water point covers this location');
    error.code = 'coverage-unavailable';
    throw error;
  }
  const point = match.point;
  return {
    provider: descriptor.id,
    station: {
      provider: descriptor.id,
      country: point.country ?? null,
      id: point.id,
      name: point.name,
      kind: 'model-point',
      latitude: point.latitude,
      longitude: point.longitude,
      timeZone: point.timeZone,
      datum: point.datum,
      referenceStationId: null,
    },
    coast: {
      name: point.name,
      distanceKm: match.distanceKm,
    },
  };
}

export async function forecastFesFallback({store, request, descriptor}) {
  const {start, end} = requestParts(request);
  const loaded = await loadCandidateTiles(
    store,
    descriptor,
    request.station.latitude,
    request.station.longitude,
  );
  const tileDocument = {
    schema: 'tide-here/harmonic-tile/v1',
    dataset: loaded.dataset,
    tile: {
      id: 'selected-candidate-tiles',
      points: loaded.tiles.flatMap(tile => tile.tile.points),
    },
  };
  const raw = forecastFromTile(tileDocument, {
    latitude: request.station.latitude,
    longitude: request.station.longitude,
    start,
    end,
  });
  const days = emptyDays(request.rows);
  for (const event of raw.tides) {
    const placement = placeInstantInRow(event.at, request.rows, request.timeZone);
    if (!placement) continue;
    days[placement.rowIndex].tides.push({
      type: event.type,
      at: placement.instantUtc,
      localTime: placement.localTime,
      offsetMinutes: placement.offsetMinutes,
      offset: placement.offset,
      height: metres(event),
      unit: 'm',
    });
  }
  const warnings = [{
    code: 'approximate-fallback',
    message: 'Harmonic-model result only; weather and storm surge are not included. Not for navigation.',
  }];
  if (!raw.dataset.isFes2022) warnings.push({
    code: 'fixture-data',
    message: 'Synthetic Stage 4 fixture only; no FES2022 atlas values are included.',
  });
  return {
    input: {display: request.context.input.display},
    place: {...request.context.place},
    coast: {...request.context.coast},
    station: {
      provider: descriptor.id,
      country: request.station.country ?? null,
      id: raw.point.id,
      name: raw.point.name,
      kind: 'model-point',
      datum: raw.point.datum,
      referenceStationId: null,
    },
    timeZone: request.timeZone,
    days,
    sources: [{
      provider: descriptor.id,
      country: request.station.country ?? null,
      stationId: raw.point.id,
      stationName: raw.point.name,
      stationKind: 'model-point',
      referenceStationId: null,
      datum: raw.point.datum,
      sourceUrl: raw.dataset.sourceUrl,
      licenceUrl: raw.dataset.licenceUrl ?? null,
      licenceReference: raw.dataset.licenceReference,
      disclaimer: raw.dataset.disclaimer ?? null,
      attribution: raw.dataset.attribution,
      retrievedAt: raw.dataset.preparedAt,
      datasetVersion: raw.dataset.version,
      dataClass: raw.dataset.dataClass,
      approximate: true,
      official: false,
    }],
    warnings,
  };
}
