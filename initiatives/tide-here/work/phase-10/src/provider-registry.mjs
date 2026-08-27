import {sha256} from '../../phase-9/src/dataset.mjs';
import {verifyDatasetVersion} from './json-dataset.mjs';

export const ACTIVE_REGISTRY_KEY = 'tide-data/provider-registries/active.json';

const STATUSES = new Set(['active', 'planned', 'fixture']);
const EXECUTIONS = new Set(['browser-direct', 'server-stored']);

function parseObject(body) {
  try {
    const value = JSON.parse(body);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function validateProviderRegistry(registry) {
  if (registry?.schema !== 'tide-here/provider-registry/v1') throw new Error('Unsupported provider registry schema');
  if (!registry.id || !registry.version || !registry.preparedAt) throw new Error('Registry id, version and preparedAt are required');
  if (!Array.isArray(registry.providers) || registry.providers.length === 0) throw new Error('Registry providers are required');
  const ids = new Set();
  for (const provider of registry.providers) {
    if (!provider.id || ids.has(provider.id)) throw new Error(`Provider id is missing or duplicated: ${provider.id ?? ''}`);
    ids.add(provider.id);
    if (!STATUSES.has(provider.status)) throw new Error(`Invalid status for ${provider.id}`);
    if (!EXECUTIONS.has(provider.execution)) throw new Error(`Invalid execution for ${provider.id}`);
    if (!Array.isArray(provider.countryCodes) || provider.countryCodes.length === 0) {
      throw new Error(`Country coverage is required for ${provider.id}`);
    }
    if (!Number.isFinite(provider.priority) || typeof provider.fallback !== 'boolean') {
      throw new Error(`Priority and fallback are required for ${provider.id}`);
    }
    if (provider.execution === 'server-stored' && provider.status !== 'planned' && !provider.dataRef) {
      throw new Error(`Stored provider ${provider.id} requires a dataset reference`);
    }
    if (provider.execution === 'browser-direct' && provider.dataRef) {
      throw new Error(`Browser provider ${provider.id} cannot reference stored data`);
    }
  }
  return registry;
}

export function providerById(registry, id) {
  return validateProviderRegistry(registry).providers.find(provider => provider.id === id) ?? null;
}

export function selectProvider(registry, {countryCode, includeFixtures = false} = {}) {
  const eligible = validateProviderRegistry(registry).providers.filter(provider => (
    provider.status === 'active' || (includeFixtures && provider.status === 'fixture')
  ));
  const exact = eligible.filter(provider => !provider.fallback && provider.countryCodes.includes(countryCode));
  const fallback = eligible.filter(provider => provider.fallback && provider.countryCodes.includes('*'));
  if (exact.length > 0) return exact.sort((left, right) => right.priority - left.priority)[0];
  return fallback.sort((left, right) => right.priority - left.priority)[0] ?? null;
}

function registryKey(registry) {
  return `tide-data/provider-registries/${registry.id}/${registry.version}/registry.json`;
}

async function verifiedReferences(store, registry) {
  const references = [];
  for (const provider of registry.providers.filter(item => item.dataRef)) {
    const verified = await verifyDatasetVersion(store, provider.dataRef);
    if (!verified.ready) throw new Error(`Dataset for ${provider.id} is not ready: ${verified.reason}`);
    references.push({
      provider: provider.id,
      dataset: provider.dataRef,
      manifestKey: verified.manifestKey,
      manifestSha256: verified.manifestSha256,
    });
  }
  return references;
}

async function writeImmutable(store, key, body, checksum, result) {
  const existing = await store.get(key);
  if (existing?.body === body) {
    result.unchanged.push(key);
    return;
  }
  if (existing) throw new Error(`Immutable provider registry conflicts with ${key}`);
  await store.put(key, body, {customMetadata: {sha256: checksum}});
  result.created.push(key);
}

async function writePointer(store, key, body, checksum, result) {
  const existing = await store.get(key);
  if (existing?.body === body) {
    result.unchanged.push(key);
    return;
  }
  await store.put(key, body, {customMetadata: {sha256: checksum}});
  result[existing ? 'updated' : 'created'].push(key);
}

export async function initializeProviderRegistry(store, registry, {now = () => new Date()} = {}) {
  validateProviderRegistry(registry);
  const references = await verifiedReferences(store, registry);
  const result = {created: [], updated: [], unchanged: []};
  const key = registryKey(registry);
  const body = JSON.stringify(registry);
  const checksum = await sha256(body);
  await writeImmutable(store, key, body, checksum, result);

  const existingActive = await store.get(ACTIVE_REGISTRY_KEY);
  const existingValue = existingActive ? parseObject(existingActive.body) : null;
  const matches = existingValue
    && existingValue.schema === 'tide-here/active-provider-registry/v1'
    && existingValue.registry?.key === key
    && existingValue.registry?.sha256 === checksum
    && JSON.stringify(existingValue.verifiedDatasets) === JSON.stringify(references);
  const active = matches ? existingValue : {
    schema: 'tide-here/active-provider-registry/v1',
    registry: {id: registry.id, version: registry.version, key, sha256: checksum},
    activatedAt: now().toISOString(),
    verifiedDatasets: references,
  };
  const activeBody = JSON.stringify(active);
  await writePointer(store, ACTIVE_REGISTRY_KEY, activeBody, await sha256(activeBody), result);
  return {...result, registry: {id: registry.id, version: registry.version}, activeRegistryKey: ACTIVE_REGISTRY_KEY};
}

export async function loadActiveProviderRegistry(store) {
  const activeObject = await store.get(ACTIVE_REGISTRY_KEY);
  if (!activeObject) return {ready: false, reason: 'provider-registry-not-initialized'};
  const active = parseObject(activeObject.body);
  if (!active || active.schema !== 'tide-here/active-provider-registry/v1' || !active.registry?.key) {
    return {ready: false, reason: 'active-provider-registry-invalid'};
  }
  const registryObject = await store.get(active.registry.key);
  if (!registryObject) return {ready: false, reason: 'provider-registry-missing'};
  if (await sha256(registryObject.body) !== active.registry.sha256) {
    return {ready: false, reason: 'provider-registry-checksum-mismatch'};
  }
  const registry = parseObject(registryObject.body);
  try {
    validateProviderRegistry(registry);
  } catch {
    return {ready: false, reason: 'provider-registry-invalid'};
  }
  try {
    const references = await verifiedReferences(store, registry);
    if (JSON.stringify(references) !== JSON.stringify(active.verifiedDatasets)) {
      return {ready: false, reason: 'provider-dataset-activation-mismatch'};
    }
  } catch {
    return {ready: false, reason: 'provider-dataset-unavailable'};
  }
  return {ready: true, active, registry};
}
