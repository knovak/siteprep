import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {
  ACTIVE_REGISTRY_KEY,
  initializeProviderRegistry,
  loadActiveProviderRegistry,
} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {australiaShardedDatasetBundle} from '../../phase-11/src/australia-importer.mjs';
import {fesSourceOfficial} from '../fixtures/fes-source-official.mjs';
import {stageFourProviderRegistry} from '../fixtures/provider-registry.mjs';
import {fesDatasetBundle, prepareFesDataset} from './fes-preparer.mjs';

const fesPreparedOfficial = await prepareFesDataset(fesSourceOfficial);

export async function initializeStageFour(store, {now = () => new Date()} = {}) {
  const existingRegistry = await loadActiveProviderRegistry(store);
  const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();
  const australia = await initializeJsonDataset(store, australiaShardedDatasetBundle(australiaPreparedOfficial), {now});
  const fes = await initializeJsonDataset(store, await fesDatasetBundle(fesPreparedOfficial), {now});
  const existingFes = existingRegistry.ready
    ? existingRegistry.registry.providers.find(provider => provider.id === 'fes2022')
    : null;
  const globalFes = existingFes?.dataRef?.id?.startsWith('fes2022b-global-coast');
  const australiaDescriptor = stageFourProviderRegistry.providers.find(provider => provider.id === 'australia-standard-ports');
  const existingAustralia = existingRegistry.ready
    ? existingRegistry.registry.providers.find(provider => provider.id === 'australia-standard-ports')
    : null;
  const alreadyMigrated = globalFes
    && JSON.stringify(existingAustralia?.dataRef) === JSON.stringify(australiaDescriptor.dataRef);
  const registryDefinition = globalFes ? {
    ...existingRegistry.registry,
    version: alreadyMigrated
      ? existingRegistry.registry.version
      : `${existingRegistry.registry.version.replace(/-au-ports-r[12]$/, '')}-au-ports-r2`,
    providers: existingRegistry.registry.providers.map(provider => (
      provider.id === 'australia-standard-ports' ? australiaDescriptor : provider
    )),
  } : stageFourProviderRegistry;
  const registry = alreadyMigrated ? {
    created: [],
    updated: [],
    unchanged: [ACTIVE_REGISTRY_KEY],
    registry: {id: registryDefinition.id, version: registryDefinition.version},
    activeRegistryKey: ACTIVE_REGISTRY_KEY,
    preserved: true,
  } : await initializeProviderRegistry(store, registryDefinition, {now, verifyObjectsFor: ['australia-standard-ports']});
  return {stage: 4, australia, fes, registry};
}
