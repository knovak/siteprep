import {sha256} from '../../phase-9/src/dataset.mjs';

function parseObject(body) {
  try {
    const value = JSON.parse(body);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

async function putImmutable(store, key, body, checksum, result) {
  const existing = await store.get(key);
  if (existing?.body === body) {
    result.unchanged.push(key);
    return;
  }
  if (existing) throw new Error(`Immutable dataset object conflicts with ${key}`);
  await store.put(key, body, {customMetadata: {sha256: checksum}});
  result.created.push(key);
}

async function putPointer(store, key, body, checksum, result) {
  const existing = await store.get(key);
  if (existing?.body === body) {
    result.unchanged.push(key);
    return;
  }
  await store.put(key, body, {customMetadata: {sha256: checksum}});
  result[existing ? 'updated' : 'created'].push(key);
}

export function datasetManifestKey({id, version}) {
  return `tide-data/datasets/${id}/${version}/manifest.json`;
}

export function datasetActiveKey(id) {
  return `tide-data/datasets/${id}/active.json`;
}

function validateBundle(bundle) {
  if (bundle?.schema !== 'tide-here/json-dataset-bundle/v1') throw new Error('Unsupported JSON dataset bundle');
  if (!bundle.dataset?.id || !bundle.dataset?.version || !bundle.dataset?.schema || !bundle.dataset?.preparedAt) {
    throw new Error('Dataset id, version, schema and preparedAt are required');
  }
  const names = Object.keys(bundle.objects ?? {});
  if (names.length === 0 || names.some(name => !/^[a-z0-9][a-z0-9-]*$/.test(name))) {
    throw new Error('Dataset object names must be non-empty lowercase identifiers');
  }
}

function validateDatasetIdentity(dataset) {
  if (!dataset?.id || !dataset?.version || !dataset?.schema || !dataset?.preparedAt) {
    throw new Error('Dataset id, version, schema and preparedAt are required');
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(dataset.id)
      || !/^[a-z0-9][a-z0-9.-]*$/.test(dataset.version)) {
    throw new Error('Dataset id and version must be safe storage identifiers');
  }
  return dataset;
}

function validateObjectName(name) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name ?? '')) throw new Error('Dataset object name is invalid');
  return name;
}

export async function initializeJsonDataset(store, bundle, {now = () => new Date()} = {}) {
  validateBundle(bundle);
  const result = {created: [], updated: [], unchanged: []};
  const prefix = `tide-data/datasets/${bundle.dataset.id}/${bundle.dataset.version}`;
  const objects = [];

  for (const [name, value] of Object.entries(bundle.objects).sort(([left], [right]) => left.localeCompare(right))) {
    const key = `${prefix}/${name}.json`;
    const body = JSON.stringify(value);
    const checksum = await sha256(body);
    await putImmutable(store, key, body, checksum, result);
    objects.push({name, key, sha256: checksum});
  }

  const manifest = {
    schema: 'tide-here/dataset-manifest/v1',
    dataset: bundle.dataset,
    preparedAt: bundle.dataset.preparedAt,
    objects,
  };
  const manifestKey = datasetManifestKey(bundle.dataset);
  const manifestBody = JSON.stringify(manifest);
  const manifestChecksum = await sha256(manifestBody);
  await putImmutable(store, manifestKey, manifestBody, manifestChecksum, result);

  const activeKey = datasetActiveKey(bundle.dataset.id);
  const existingActive = await store.get(activeKey);
  const existingValue = existingActive ? parseObject(existingActive.body) : null;
  const matches = existingValue
    && existingValue.schema === 'tide-here/active-dataset/v1'
    && existingValue.manifest?.key === manifestKey
    && existingValue.manifest?.sha256 === manifestChecksum;
  const active = matches ? existingValue : {
    schema: 'tide-here/active-dataset/v1',
    dataset: {id: bundle.dataset.id, version: bundle.dataset.version},
    activatedAt: now().toISOString(),
    manifest: {key: manifestKey, sha256: manifestChecksum},
  };
  const activeBody = JSON.stringify(active);
  await putPointer(store, activeKey, activeBody, await sha256(activeBody), result);

  return {...result, dataset: active.dataset, manifestKey, activeKey};
}

export async function importJsonDatasetObject(store, {
  dataset,
  name,
  body,
  checksum,
}) {
  validateDatasetIdentity(dataset);
  validateObjectName(name);
  if (typeof body !== 'string' || !/^[a-f0-9]{64}$/.test(checksum ?? '')) {
    throw new Error('Imported dataset object body and SHA-256 are required');
  }
  const actual = await sha256(body);
  if (actual !== checksum) throw new Error(`Imported dataset object checksum does not match ${name}`);
  const result = {created: [], updated: [], unchanged: []};
  const key = `tide-data/datasets/${dataset.id}/${dataset.version}/${name}.json`;
  await putImmutable(store, key, body, checksum, result);
  return {...result, name, key, sha256: checksum};
}

export async function activateImportedJsonDataset(store, {
  dataset,
  objects,
}, {now = () => new Date()} = {}) {
  validateDatasetIdentity(dataset);
  if (!Array.isArray(objects) || objects.length === 0) throw new Error('Imported dataset inventory is required');
  const names = new Set();
  const prefix = `tide-data/datasets/${dataset.id}/${dataset.version}`;
  const manifestObjects = [];
  for (const object of objects) {
    const name = validateObjectName(object?.name);
    if (names.has(name) || !/^[a-f0-9]{64}$/.test(object?.sha256 ?? '')) {
      throw new Error('Imported dataset inventory is duplicated or invalid');
    }
    names.add(name);
    const key = `${prefix}/${name}.json`;
    const stored = await store.get(key);
    if (!stored || await sha256(stored.body) !== object.sha256) {
      throw new Error(`Imported dataset object is missing or invalid: ${name}`);
    }
    manifestObjects.push({name, key, sha256: object.sha256});
  }
  const result = {created: [], updated: [], unchanged: []};
  const manifest = {
    schema: 'tide-here/dataset-manifest/v1',
    dataset,
    preparedAt: dataset.preparedAt,
    objects: manifestObjects,
  };
  const manifestKey = datasetManifestKey(dataset);
  const manifestBody = JSON.stringify(manifest);
  const manifestChecksum = await sha256(manifestBody);
  await putImmutable(store, manifestKey, manifestBody, manifestChecksum, result);

  const activeKey = datasetActiveKey(dataset.id);
  const existingActive = await store.get(activeKey);
  const existingValue = existingActive ? parseObject(existingActive.body) : null;
  const matches = existingValue
    && existingValue.schema === 'tide-here/active-dataset/v1'
    && existingValue.manifest?.key === manifestKey
    && existingValue.manifest?.sha256 === manifestChecksum;
  const active = matches ? existingValue : {
    schema: 'tide-here/active-dataset/v1',
    dataset: {id: dataset.id, version: dataset.version},
    activatedAt: now().toISOString(),
    manifest: {key: manifestKey, sha256: manifestChecksum},
  };
  const activeBody = JSON.stringify(active);
  await putPointer(store, activeKey, activeBody, await sha256(activeBody), result);
  return {...result, dataset: active.dataset, manifestKey, activeKey};
}

export async function verifyDatasetVersion(store, reference, {
  verifyObjects = reference?.verification !== 'manifest-and-selected-objects',
} = {}) {
  const manifestKey = datasetManifestKey(reference);
  const manifestObject = await store.get(manifestKey);
  if (!manifestObject) return {ready: false, reason: 'dataset-manifest-missing', reference};
  const manifest = parseObject(manifestObject.body);
  if (!manifest
      || manifest.schema !== 'tide-here/dataset-manifest/v1'
      || manifest.dataset?.id !== reference.id
      || manifest.dataset?.version !== reference.version) {
    return {ready: false, reason: 'dataset-manifest-invalid', reference};
  }

  const entries = Array.isArray(manifest.objects)
    ? manifest.objects
    : manifest.tile ? [{name: 'tile', ...manifest.tile}] : [];
  if (entries.length === 0) return {ready: false, reason: 'dataset-objects-missing', reference};
  if (verifyObjects) {
    for (const entry of entries) {
      const object = await store.get(entry.key);
      if (!object) return {ready: false, reason: 'dataset-object-missing', reference, object: entry.name};
      if (await sha256(object.body) !== entry.sha256) {
        return {ready: false, reason: 'dataset-object-checksum-mismatch', reference, object: entry.name};
      }
    }
  }
  return {
    ready: true,
    reference,
    manifest,
    manifestKey,
    manifestSha256: await sha256(manifestObject.body),
  };
}

export async function loadDatasetObject(store, reference, name) {
  const verified = await verifyDatasetVersion(store, reference);
  if (!verified.ready) return verified;
  return loadVerifiedDatasetObject(store, verified, name);
}

export async function loadVerifiedDatasetObject(store, verified, name) {
  if (!verified?.ready || !verified.manifest) {
    return {ready: false, reason: 'dataset-not-verified', reference: verified?.reference, object: name};
  }
  const entry = verified.manifest.objects?.find(object => object.name === name);
  if (!entry) return {ready: false, reason: 'dataset-object-not-declared', reference: verified.reference, object: name};
  const object = await store.get(entry.key);
  if (!object) return {ready: false, reason: 'dataset-object-missing', reference: verified.reference, object: name};
  if (await sha256(object.body) !== entry.sha256) {
    return {ready: false, reason: 'dataset-object-checksum-mismatch', reference: verified.reference, object: name};
  }
  const value = parseObject(object.body);
  return value
    ? {...verified, value, object: entry}
    : {ready: false, reason: 'dataset-object-invalid', reference: verified.reference, object: name};
}
