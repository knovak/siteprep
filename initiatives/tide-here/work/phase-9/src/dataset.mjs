export const ACTIVE_MANIFEST_KEY = 'tide-data/active.json';

const encoder = new TextEncoder();

export async function sha256(value) {
  const bytes = encoder.encode(String(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function parseJsonObject(body, label) {
  let value;
  try {
    value = JSON.parse(body);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value;
}

function safelyParseJsonObject(body) {
  try {
    return parseJsonObject(body, 'Stored object');
  } catch {
    return null;
  }
}

function validateFixture(fixture) {
  if (fixture?.schema !== 'tide-here/harmonic-tile/v1') throw new Error('Unsupported harmonic tile schema');
  if (!fixture.dataset?.id || !fixture.dataset?.version) throw new Error('Dataset id and version are required');
  if (fixture.dataset.isFes2022 !== false || fixture.dataset.dataClass !== 'test-fixture') {
    throw new Error('Stage 1 accepts only a non-FES test fixture');
  }
  if (!Array.isArray(fixture.tile?.points) || fixture.tile.points.length === 0) {
    throw new Error('At least one harmonic point is required');
  }
  for (const point of fixture.tile.points) {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      throw new Error('Every harmonic point needs numeric coordinates');
    }
    if (!Array.isArray(point.constituents) || point.constituents.length < 4) {
      throw new Error('Every harmonic point needs at least four constituents');
    }
    for (const constituent of point.constituents) {
      if (!constituent.name || !Number.isFinite(constituent.amplitude) || !Number.isFinite(constituent.phase)) {
        throw new Error('Constituent name, amplitude and phase are required');
      }
    }
  }
}

async function unchangedObject(store, key, body) {
  const existing = await store.get(key);
  return existing?.body === body;
}

async function putUnlessUnchanged(store, key, body, checksum, result, {immutable = false} = {}) {
  if (await unchangedObject(store, key, body)) {
    result.unchanged.push(key);
    return;
  }
  const existed = Boolean(await store.get(key));
  if (existed && immutable) throw new Error(`Immutable dataset object conflicts with ${key}`);
  await store.put(key, body, {customMetadata: {sha256: checksum}});
  result[existed ? 'updated' : 'created'].push(key);
}

export async function initializeDataset(store, fixture, {now = () => new Date()} = {}) {
  validateFixture(fixture);
  const result = {created: [], updated: [], unchanged: []};
  const prefix = `tide-data/datasets/${fixture.dataset.id}/${fixture.dataset.version}`;
  const tileKey = `${prefix}/tiles/${fixture.tile.id}.json`;
  const datasetManifestKey = `${prefix}/manifest.json`;

  const tileBody = JSON.stringify({
    schema: fixture.schema,
    dataset: fixture.dataset,
    tile: fixture.tile,
  });
  const tileChecksum = await sha256(tileBody);
  await putUnlessUnchanged(store, tileKey, tileBody, tileChecksum, result, {immutable: true});

  const existingManifestObject = await store.get(datasetManifestKey);
  let datasetManifest = existingManifestObject
    ? safelyParseJsonObject(existingManifestObject.body)
    : null;
  const manifestMatches = datasetManifest
    && datasetManifest.schema === 'tide-here/dataset-manifest/v1'
    && datasetManifest.dataset?.id === fixture.dataset.id
    && datasetManifest.dataset?.version === fixture.dataset.version
    && datasetManifest.tile?.key === tileKey
    && datasetManifest.tile?.sha256 === tileChecksum;

  if (!manifestMatches) {
    datasetManifest = {
      schema: 'tide-here/dataset-manifest/v1',
      dataset: fixture.dataset,
      initializedAt: now().toISOString(),
      tile: {key: tileKey, sha256: tileChecksum},
    };
  }
  const datasetManifestBody = JSON.stringify(datasetManifest);
  const datasetManifestChecksum = await sha256(datasetManifestBody);
  await putUnlessUnchanged(
    store,
    datasetManifestKey,
    datasetManifestBody,
    datasetManifestChecksum,
    result,
    {immutable: true},
  );

  const existingActiveObject = await store.get(ACTIVE_MANIFEST_KEY);
  let active = existingActiveObject ? safelyParseJsonObject(existingActiveObject.body) : null;
  const activeMatches = active
    && active.schema === 'tide-here/active-dataset/v1'
    && active.manifest?.key === datasetManifestKey
    && active.manifest?.sha256 === datasetManifestChecksum;
  if (!activeMatches) {
    active = {
      schema: 'tide-here/active-dataset/v1',
      dataset: {id: fixture.dataset.id, version: fixture.dataset.version},
      activatedAt: now().toISOString(),
      manifest: {key: datasetManifestKey, sha256: datasetManifestChecksum},
    };
  }
  const activeBody = JSON.stringify(active);
  await putUnlessUnchanged(store, ACTIVE_MANIFEST_KEY, activeBody, await sha256(activeBody), result);

  return {
    ...result,
    dataset: active.dataset,
    activeManifestKey: ACTIVE_MANIFEST_KEY,
  };
}

export async function loadActiveDataset(store) {
  const activeObject = await store.get(ACTIVE_MANIFEST_KEY);
  if (!activeObject) return {ready: false, reason: 'not-initialized'};

  const active = safelyParseJsonObject(activeObject.body);
  if (!active || active.schema !== 'tide-here/active-dataset/v1' || !active.manifest?.key) {
    return {ready: false, reason: 'active-manifest-invalid'};
  }
  const manifestObject = await store.get(active.manifest?.key);
  if (!manifestObject) return {ready: false, reason: 'dataset-manifest-missing'};
  if (await sha256(manifestObject.body) !== active.manifest.sha256) {
    return {ready: false, reason: 'dataset-manifest-checksum-mismatch'};
  }

  const manifest = safelyParseJsonObject(manifestObject.body);
  if (!manifest
      || manifest.schema !== 'tide-here/dataset-manifest/v1'
      || manifest.dataset?.id !== active.dataset?.id
      || manifest.dataset?.version !== active.dataset?.version
      || !manifest.tile?.key) {
    return {ready: false, reason: 'dataset-manifest-invalid'};
  }
  const tileObject = await store.get(manifest.tile?.key);
  if (!tileObject) return {ready: false, reason: 'tile-missing'};
  if (await sha256(tileObject.body) !== manifest.tile.sha256) {
    return {ready: false, reason: 'tile-checksum-mismatch'};
  }

  const tile = safelyParseJsonObject(tileObject.body);
  if (!tile
      || tile.schema !== 'tide-here/harmonic-tile/v1'
      || tile.dataset?.id !== manifest.dataset.id
      || tile.dataset?.version !== manifest.dataset.version) {
    return {ready: false, reason: 'tile-invalid'};
  }
  return {ready: true, active, manifest, tile};
}
