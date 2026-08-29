import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../../phase-11/fixtures/australia-prepared-official.mjs';
import {australiaDatasetBundle} from '../../phase-11/src/australia-importer.mjs';
import {fesSourceOfficial} from '../fixtures/fes-source-official.mjs';
import {stageFourProviderRegistry} from '../fixtures/provider-registry.mjs';
import {fesDatasetBundle, prepareFesDataset} from './fes-preparer.mjs';

const fesPreparedOfficial = await prepareFesDataset(fesSourceOfficial);

export async function initializeStageFour(store, {now = () => new Date()} = {}) {
  const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();
  const australia = await initializeJsonDataset(store, australiaDatasetBundle(australiaPreparedOfficial), {now});
  const fes = await initializeJsonDataset(store, await fesDatasetBundle(fesPreparedOfficial), {now});
  const registry = await initializeProviderRegistry(store, stageFourProviderRegistry, {now});
  return {stage: 4, australia, fes, registry};
}
