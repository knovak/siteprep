import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {
  ACTIVE_REGISTRY_KEY,
  initializeProviderRegistry,
  loadActiveProviderRegistry,
} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {australiaDatasetBundle} from '../../phase-11/src/australia-importer.mjs';
import {fesSourceOfficial} from '../fixtures/fes-source-official.mjs';
import {stageFourProviderRegistry} from '../fixtures/provider-registry.mjs';
import {fesDatasetBundle, prepareFesDataset} from './fes-preparer.mjs';

const fesPreparedOfficial = await prepareFesDataset(fesSourceOfficial);

export async function initializeStageFour(store, {now = () => new Date()} = {}) {
  const existingRegistry = await loadActiveProviderRegistry(store);
  const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();
  const australia = await initializeJsonDataset(store, australiaDatasetBundle(australiaPreparedOfficial), {now});
  const fes = await initializeJsonDataset(store, await fesDatasetBundle(fesPreparedOfficial), {now});
  const existingFes = existingRegistry.ready
    ? existingRegistry.registry.providers.find(provider => provider.id === 'fes2022')
    : null;
  const registry = existingFes?.dataRef?.id?.startsWith('fes2022b-global-coast')
    ? {
        created: [],
        updated: [],
        unchanged: [ACTIVE_REGISTRY_KEY],
        registry: {
          id: existingRegistry.registry.id,
          version: existingRegistry.registry.version,
        },
        activeRegistryKey: ACTIVE_REGISTRY_KEY,
        preserved: true,
      }
    : await initializeProviderRegistry(store, stageFourProviderRegistry, {now});
  return {stage: 4, australia, fes, registry};
}
