import {placeInstantInRow} from '../../phase-1/src/day-model.mjs';
import {loadDatasetObject} from '../../phase-10/src/json-dataset.mjs';

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

async function loadAustralianDataset(store, descriptor) {
  const loaded = await loadDatasetObject(store, descriptor.dataRef, 'predictions');
  if (!loaded.ready) {
    const error = new Error(`Australian dataset is unavailable: ${loaded.reason}`);
    error.code = 'stored-dataset-unavailable';
    throw error;
  }
  if (loaded.value.schema !== 'tide-here/australia-standard-ports/v1') {
    const error = new Error('Australian dataset schema does not match the provider');
    error.code = 'stored-dataset-version-mismatch';
    throw error;
  }
  return loaded.value;
}

function validateRequest(request) {
  if (!request?.context?.input?.display || !request.context.place || !request.context.coast) {
    throw new Error('Australian forecast requires input, place and coast context');
  }
  if (!request.station?.id || !request.timeZone || !Array.isArray(request.rows) || request.rows.length !== 5) {
    throw new Error('Australian forecast requires a station, time zone and five local-day rows');
  }
  if (request.rows.some(row => !/^\d{4}-\d{2}-\d{2}$/.test(row.date))) {
    throw new Error('Australian forecast rows need local dates');
  }
}

export async function australianStationCatalogue({store, descriptor}) {
  const dataset = await loadAustralianDataset(store, descriptor);
  return dataset.stations.map(station => ({...station}));
}

export async function forecastAustralianStandardPort({store, request, descriptor}) {
  validateRequest(request);
  const dataset = await loadAustralianDataset(store, descriptor);
  if (request.rows.some(row => Number(row.date.slice(0, 4)) !== dataset.dataset.year)) {
    const error = new Error(`Australian predictions are loaded only for ${dataset.dataset.year}`);
    error.code = 'dataset-year-unavailable';
    throw error;
  }
  if (request.rows.some(row => row.date < dataset.dataset.coverageStart || row.date > dataset.dataset.coverageEnd)) {
    const error = new Error(`Australian prediction coverage is ${dataset.dataset.coverageStart} through ${dataset.dataset.coverageEnd}`);
    error.code = 'dataset-date-unavailable';
    throw error;
  }
  const station = dataset.stations.find(item => item.id === request.station.id);
  if (!station) {
    const error = new Error('Australian standard port is not in the active dataset');
    error.code = 'coverage-unavailable';
    throw error;
  }
  if (request.timeZone !== station.timeZone) throw new Error('Forecast time zone does not match the Australian port');

  const days = emptyDays(request.rows);
  const events = dataset.events.filter(event => event.stationId === station.id);
  for (const event of events) {
    const placement = placeInstantInRow(event.at, request.rows, station.timeZone);
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
  const eventCount = days.reduce((sum, day) => sum + day.tides.length, 0);
  const warnings = [];
  if (eventCount === 0) warnings.push({
    code: 'tides-unavailable',
    message: `No stored Australian predictions are available for these ${dataset.dataset.year} dates.`,
  });
  if (!dataset.dataset.isOfficial) warnings.push({
    code: 'fixture-data',
    message: 'Synthetic Stage 3 fixture only; no Bureau or Australian Hydrographic Office predictions are included.',
  });

  return {
    input: {display: request.context.input.display},
    place: {...request.context.place},
    coast: {...request.context.coast},
    station: {
      provider: descriptor.id,
      country: station.country,
      id: station.id,
      name: station.name,
      kind: station.kind,
      datum: station.datum,
      referenceStationId: station.referenceStationId,
    },
    timeZone: station.timeZone,
    days,
    sources: [{
      provider: descriptor.id,
      country: station.country,
      stationId: station.id,
      stationName: station.name,
      stationKind: station.kind,
      referenceStationId: station.referenceStationId,
      datum: station.datum,
      sourceUrl: station.sourceUrl ?? dataset.dataset.sourceUrl,
      licenceUrl: dataset.dataset.licenceUrl ?? null,
      licenceReference: dataset.dataset.licenceReference,
      attribution: dataset.dataset.attribution,
      disclaimer: dataset.dataset.disclaimer ?? null,
      retrievedAt: dataset.dataset.preparedAt,
      datasetVersion: dataset.dataset.version,
      dataClass: dataset.dataset.dataClass,
      approximate: !dataset.dataset.isOfficial,
      official: dataset.dataset.isOfficial,
    }],
    warnings,
  };
}
