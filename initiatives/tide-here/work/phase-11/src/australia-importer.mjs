import {describeInstant} from '../../phase-1/src/day-model.mjs';

const DATA_CLASSES = new Set(['test-fixture', 'licensed-source']);

function finiteCoordinate(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) throw new Error(`Invalid ${label}`);
  return number;
}

function parseLocalEvent(date, time, utcOffset, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !/^\d{2}:\d{2}:\d{2}$/.test(time)
      || !/^[+-]\d{2}:\d{2}$/.test(utcOffset)) {
    throw new Error(`Invalid local prediction time: ${date} ${time} ${utcOffset}`);
  }
  const instant = new Date(`${date}T${time}${utcOffset}`);
  if (!Number.isFinite(instant.getTime())) throw new Error(`Invalid local prediction time: ${date} ${time} ${utcOffset}`);
  const described = describeInstant(instant, timeZone);
  if (described.localDate !== date || described.localTime !== time || described.offset !== utcOffset) {
    throw new Error(`Prediction offset does not match ${timeZone}: ${date} ${time} ${utcOffset}`);
  }
  return instant.toISOString();
}

function validateMetadata(metadata) {
  if (!metadata?.datasetId || !metadata.datasetVersion || !Number.isInteger(metadata.sourceYear)) {
    throw new Error('Australian source metadata needs dataset id, version and year');
  }
  for (const field of ['preparedAt', 'coverageStart', 'coverageEnd', 'dataClass', 'sourceName', 'attribution', 'licenceReference']) {
    if (!metadata[field]) throw new Error(`Australian source metadata is missing ${field}`);
  }
  if (!Number.isFinite(Date.parse(metadata.preparedAt))) throw new Error('Australian source preparedAt is invalid');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.coverageStart)
      || !/^\d{4}-\d{2}-\d{2}$/.test(metadata.coverageEnd)
      || metadata.coverageStart > metadata.coverageEnd) {
    throw new Error('Australian source coverage dates are invalid');
  }
  if (!DATA_CLASSES.has(metadata.dataClass)) throw new Error('Australian source data class is invalid');
  if (metadata.dataClass !== 'test-fixture' && !metadata.sourceUrl) {
    throw new Error('Licensed Australian source data requires a source URL');
  }
}

export function importAustralianAnnualSource(source) {
  if (source?.schema !== 'tide-here/australia-standard-ports-source/v1') {
    throw new Error('Unsupported Australian source schema');
  }
  validateMetadata(source.metadata);
  if (!Array.isArray(source.ports) || source.ports.length === 0) throw new Error('Australian source has no ports');
  const ids = new Set();
  const eventKeys = new Set();
  const stations = [];
  const events = [];

  for (const port of source.ports) {
    if (!port.id || ids.has(port.id)) throw new Error(`Australian port id is missing or duplicated: ${port.id ?? ''}`);
    ids.add(port.id);
    if (!port.name || !port.state || !port.timeZone || !port.datum) throw new Error(`Australian port metadata is incomplete: ${port.id}`);
    try {
      new Intl.DateTimeFormat('en-AU', {timeZone: port.timeZone}).format(0);
    } catch {
      throw new Error(`Invalid IANA time zone for ${port.id}`);
    }
    const station = {
      provider: 'australia-standard-ports',
      country: 'AU',
      id: port.id,
      code: port.id,
      name: port.name,
      latitude: finiteCoordinate(port.latitude, -90, 90, `latitude for ${port.id}`),
      longitude: finiteCoordinate(port.longitude, -180, 180, `longitude for ${port.id}`),
      jurisdiction: `AU-${port.state}`,
      timeZone: port.timeZone,
      datum: port.datum,
      kind: 'reference',
      referenceStationId: null,
      active: true,
    };
    stations.push(station);
    if (!Array.isArray(port.predictions) || port.predictions.length === 0) throw new Error(`Australian port has no predictions: ${port.id}`);
    for (const prediction of port.predictions) {
      if (!['high', 'low'].includes(prediction.type)) throw new Error(`Invalid tide type for ${port.id}`);
      const at = parseLocalEvent(prediction.date, prediction.time, prediction.utcOffset, port.timeZone);
      if (Number(prediction.date.slice(0, 4)) !== source.metadata.sourceYear) {
        throw new Error(`Prediction year does not match the source year for ${port.id}`);
      }
      if (prediction.date < source.metadata.coverageStart || prediction.date > source.metadata.coverageEnd) {
        throw new Error(`Prediction falls outside the declared coverage for ${port.id}`);
      }
      const height = Number(prediction.heightM);
      if (!Number.isFinite(height)) throw new Error(`Invalid tide height for ${port.id}`);
      const eventKey = `${port.id}|${prediction.date}|${prediction.time}|${prediction.type}`;
      if (eventKeys.has(eventKey)) throw new Error(`Duplicate prediction for ${port.id}`);
      eventKeys.add(eventKey);
      events.push({
        stationId: port.id,
        localDate: prediction.date,
        sourceLocalTime: prediction.time,
        sourceUtcOffset: prediction.utcOffset,
        at,
        type: prediction.type,
        height,
        unit: 'm',
      });
    }
  }

  stations.sort((left, right) => left.id.localeCompare(right.id));
  events.sort((left, right) => left.stationId.localeCompare(right.stationId) || Date.parse(left.at) - Date.parse(right.at));
  const metadata = source.metadata;
  return {
    schema: 'tide-here/australia-standard-ports/v1',
    dataset: {
      id: metadata.datasetId,
      version: metadata.datasetVersion,
      schema: 'tide-here/australia-standard-ports/v1',
      year: metadata.sourceYear,
      coverageStart: metadata.coverageStart,
      coverageEnd: metadata.coverageEnd,
      preparedAt: new Date(metadata.preparedAt).toISOString(),
      dataClass: metadata.dataClass,
      sourceName: metadata.sourceName,
      sourceUrl: metadata.sourceUrl,
      attribution: metadata.attribution,
      licenceReference: metadata.licenceReference,
      isOfficial: metadata.dataClass === 'licensed-source',
    },
    stations,
    events,
  };
}

export function australiaDatasetBundle(prepared) {
  validatePreparedAustralianDataset(prepared);
  return {
    schema: 'tide-here/json-dataset-bundle/v1',
    dataset: prepared.dataset,
    objects: {predictions: prepared},
  };
}

export function validatePreparedAustralianDataset(prepared) {
  if (prepared?.schema !== 'tide-here/australia-standard-ports/v1') throw new Error('Prepared Australian data is invalid');
  const dataset = prepared.dataset;
  for (const field of ['id', 'version', 'schema', 'preparedAt', 'dataClass', 'attribution', 'licenceReference']) {
    if (!dataset?.[field]) throw new Error(`Prepared Australian data is missing ${field}`);
  }
  if (!DATA_CLASSES.has(dataset.dataClass)) throw new Error('Prepared Australian data class is invalid');
  if (dataset.dataClass !== 'test-fixture' && !dataset.sourceUrl) {
    throw new Error('Prepared licensed Australian data requires a source URL');
  }
  if (!Number.isInteger(dataset.year) || !dataset.coverageStart || !dataset.coverageEnd) {
    throw new Error('Prepared Australian data needs year coverage');
  }
  if (!Array.isArray(prepared.stations) || prepared.stations.length === 0
      || !Array.isArray(prepared.events) || prepared.events.length === 0) {
    throw new Error('Prepared Australian data needs stations and events');
  }
  return prepared;
}
