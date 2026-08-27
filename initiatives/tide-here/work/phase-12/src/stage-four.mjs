import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {australiaPreparedSample} from '../../phase-11/fixtures/australia-prepared-sample.mjs';
import {australiaDatasetBundle} from '../../phase-11/src/australia-importer.mjs';
import {fesPreparedSample} from '../fixtures/fes-prepared-sample.mjs';
import {stageFourProviderRegistry} from '../fixtures/provider-registry.mjs';
import {fesDatasetBundle} from './fes-preparer.mjs';

export async function initializeStageFour(store, {now = () => new Date()} = {}) {
  const australia = await initializeJsonDataset(store, australiaDatasetBundle(australiaPreparedSample), {now});
  const fes = await initializeJsonDataset(store, await fesDatasetBundle(fesPreparedSample), {now});
  const registry = await initializeProviderRegistry(store, stageFourProviderRegistry, {now});
  return {stage: 4, australia, fes, registry};
}
