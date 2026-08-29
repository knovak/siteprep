import {sha256} from '../../phase-9/src/dataset.mjs';

const DATA_CLASSES = new Set(['test-fixture', 'licensed-source']);
const encoder = new TextEncoder();

function finite(value, minimum, maximum, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) throw new Error(`Invalid ${label}`);
  return number;
}

function validateDataset(dataset) {
  for (const field of ['id', 'version', 'schema', 'preparedAt', 'displayName', 'dataClass', 'model', 'attribution', 'licenceReference', 'engine']) {
    if (!dataset?.[field]) throw new Error(`FES source dataset is missing ${field}`);
  }
  if (!DATA_CLASSES.has(dataset.dataClass)) throw new Error('FES source data class is invalid');
  if (!Number.isFinite(Date.parse(dataset.preparedAt))) throw new Error('FES source preparedAt is invalid');
  if (typeof dataset.isFes2022 !== 'boolean') throw new Error('FES source must declare whether it is FES2022');
  if (dataset.dataClass === 'licensed-source') {
    if (!dataset.isFes2022 || !/FES2022/i.test(dataset.model) || !dataset.sourceUrl) {
      throw new Error('A licensed production source must identify FES2022 and its source URL');
    }
  } else if (dataset.isFes2022) {
    throw new Error('A test fixture cannot identify itself as FES2022');
  }
}

function validateBounds(bounds, id) {
  const normalized = {
    south: finite(bounds?.south, -90, 90, `south bound for ${id}`),
    west: finite(bounds?.west, -180, 180, `west bound for ${id}`),
    north: finite(bounds?.north, -90, 90, `north bound for ${id}`),
    east: finite(bounds?.east, -180, 180, `east bound for ${id}`),
  };
  if (normalized.south >= normalized.north || normalized.west >= normalized.east) {
    throw new Error(`Invalid tile bounds for ${id}`);
  }
  return normalized;
}

function validatePoint(point, tileId, dataClass) {
  if (!point?.id || !point.name || !point.timeZone || !point.datum || point.water !== true) {
    throw new Error(`FES point metadata is incomplete for ${tileId}`);
  }
  try {
    new Intl.DateTimeFormat('en', {timeZone: point.timeZone}).format(0);
  } catch {
    throw new Error(`Invalid IANA time zone for ${point.id}`);
  }
  const constituents = point.constituents;
  const minimum = dataClass === 'licensed-source' ? 34 : 4;
  if (!Array.isArray(constituents) || constituents.length < minimum) {
    throw new Error(`FES point ${point.id} requires at least ${minimum} constituents`);
  }
  const names = new Set();
  for (const constituent of constituents) {
    if (!constituent?.name || names.has(constituent.name)
        || !Number.isFinite(constituent.amplitude) || constituent.amplitude < 0
        || !Number.isFinite(constituent.phase)) {
      throw new Error(`Invalid or duplicate constituent for ${point.id}`);
    }
    names.add(constituent.name);
  }
  return {
    ...point,
    latitude: finite(point.latitude, -90, 90, `latitude for ${point.id}`),
    longitude: finite(point.longitude, -180, 180, `longitude for ${point.id}`),
    maximumDistanceKm: finite(point.maximumDistanceKm, 0.001, 500, `maximum distance for ${point.id}`),
  };
}

function objectName(tileId) {
  const normalized = `tile-${tileId}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) throw new Error(`Invalid FES tile id: ${tileId}`);
  return normalized;
}

export async function prepareFesDataset(source) {
  if (source?.schema !== 'tide-here/fes-source-extract/v1') throw new Error('Unsupported FES source schema');
  validateDataset(source.dataset);
  if (!Array.isArray(source.tiles) || source.tiles.length === 0) throw new Error('FES source contains no tiles');
  const ids = new Set();
  const names = new Set();
  const tiles = {};
  const inventory = [];

  for (const sourceTile of source.tiles) {
    if (!sourceTile?.id || ids.has(sourceTile.id)) throw new Error(`FES tile id is missing or duplicated: ${sourceTile?.id ?? ''}`);
    ids.add(sourceTile.id);
    const name = objectName(sourceTile.id);
    if (names.has(name)) throw new Error(`FES tile object name is duplicated: ${name}`);
    names.add(name);
    const bounds = validateBounds(sourceTile.bounds, sourceTile.id);
    if (!Array.isArray(sourceTile.points) || sourceTile.points.length === 0) throw new Error(`FES tile has no points: ${sourceTile.id}`);
    const pointIds = new Set();
    const points = sourceTile.points.map(point => {
      if (pointIds.has(point?.id)) throw new Error(`Duplicate point in FES tile ${sourceTile.id}`);
      pointIds.add(point?.id);
      return validatePoint(point, sourceTile.id, source.dataset.dataClass);
    });
    const tile = {
      schema: 'tide-here/harmonic-tile/v1',
      dataset: source.dataset,
      tile: {id: sourceTile.id, bounds, points},
    };
    const body = JSON.stringify(tile);
    tiles[name] = tile;
    inventory.push({
      id: sourceTile.id,
      objectName: name,
      bounds,
      maximumDistanceKm: Math.max(...points.map(point => point.maximumDistanceKm)),
      pointCount: points.length,
      bytes: encoder.encode(body).byteLength,
      sha256: await sha256(body),
    });
  }

  inventory.sort((left, right) => left.id.localeCompare(right.id));
  return {
    schema: 'tide-here/fes-prepared-dataset/v1',
    dataset: {...source.dataset},
    tileIndex: {
      schema: 'tide-here/fes-tile-index/v1',
      dataset: {id: source.dataset.id, version: source.dataset.version},
      inventory,
    },
    tiles,
  };
}

export async function validatePreparedFesDataset(prepared) {
  if (prepared?.schema !== 'tide-here/fes-prepared-dataset/v1') throw new Error('Prepared FES dataset is invalid');
  validateDataset(prepared.dataset);
  const index = prepared.tileIndex;
  if (index?.schema !== 'tide-here/fes-tile-index/v1'
      || index.dataset?.id !== prepared.dataset.id
      || index.dataset?.version !== prepared.dataset.version
      || !Array.isArray(index.inventory) || index.inventory.length === 0) {
    throw new Error('Prepared FES tile index is invalid');
  }
  const declared = new Set();
  for (const entry of index.inventory) {
    if (!entry?.objectName || declared.has(entry.objectName)) throw new Error('Prepared FES inventory contains a duplicate object');
    declared.add(entry.objectName);
    const tile = prepared.tiles?.[entry.objectName];
    if (!tile) throw new Error(`Prepared FES tile is missing: ${entry.objectName}`);
    const body = JSON.stringify(tile);
    if (encoder.encode(body).byteLength !== entry.bytes || await sha256(body) !== entry.sha256) {
      throw new Error(`Prepared FES inventory does not match ${entry.objectName}`);
    }
  }
  if (Object.keys(prepared.tiles ?? {}).some(name => !declared.has(name))) {
    throw new Error('Prepared FES dataset contains an undeclared tile');
  }
  return prepared;
}

export async function fesDatasetBundle(prepared) {
  await validatePreparedFesDataset(prepared);
  return {
    schema: 'tide-here/json-dataset-bundle/v1',
    dataset: prepared.dataset,
    objects: {'tile-index': prepared.tileIndex, ...prepared.tiles},
  };
}
