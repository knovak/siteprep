import {placeInstantInRow} from '../../phase-1/src/day-model.mjs';
import {loadActiveDataset} from '../../phase-9/src/dataset.mjs';
import {forecastFromTile} from '../../phase-9/src/forecast.mjs';

function requestParts(request) {
  if (!request?.context?.input?.display || !request.context.place || !request.context.coast) {
    throw new Error('Stored forecast requires input, place and coast context');
  }
  if (!request.station || !Number.isFinite(request.station.latitude) || !Number.isFinite(request.station.longitude)) {
    throw new Error('Stored forecast requires a station with coordinates');
  }
  if (!request.timeZone || !Array.isArray(request.rows) || request.rows.length !== 5) {
    throw new Error('Stored forecast requires a time zone and five local-day rows');
  }
  const start = request.rows[0]?.startUtc;
  const end = request.rows.at(-1)?.endUtc;
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) {
    throw new Error('Stored forecast rows need valid UTC bounds');
  }
  return {start, end};
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

export async function forecastHarmonicFixture({store, request, descriptor}) {
  const {start, end} = requestParts(request);
  const active = await loadActiveDataset(store);
  if (!active.ready) {
    const error = new Error(`Stored harmonic dataset is unavailable: ${active.reason}`);
    error.code = 'stored-dataset-unavailable';
    throw error;
  }
  if (active.active.dataset.id !== descriptor.dataRef.id
      || active.active.dataset.version !== descriptor.dataRef.version) {
    const error = new Error('The active harmonic dataset does not match the provider registry');
    error.code = 'stored-dataset-version-mismatch';
    throw error;
  }

  const raw = forecastFromTile(active.tile, {
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
      height: event.height,
      unit: event.unit,
    });
  }

  return {
    input: {display: request.context.input.display},
    place: {...request.context.place},
    coast: {...request.context.coast},
    station: {
      provider: descriptor.id,
      country: request.station.country ?? 'FR',
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
      country: request.station.country ?? 'FR',
      stationId: raw.point.id,
      stationName: raw.point.name,
      stationKind: 'model-point',
      referenceStationId: null,
      datum: raw.point.datum,
      sourceUrl: raw.dataset.sourceUrl,
      licenceUrl: raw.dataset.sourceDoi,
      attribution: raw.dataset.attribution,
      retrievedAt: raw.dataset.preparedAt,
      datasetVersion: raw.dataset.version,
      dataClass: raw.dataset.dataClass,
      approximate: true,
    }],
    warnings: [{
      code: 'approximate-fallback',
      message: 'Stage 1 harmonic fixture only; this is not FES2022 and is not for navigation.',
    }],
  };
}
