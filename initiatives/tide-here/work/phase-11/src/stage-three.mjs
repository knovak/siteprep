import {stageOneFixture} from '../../phase-9/fixtures/brest-stage-one.mjs';
import {initializeDataset} from '../../phase-9/src/dataset.mjs';
import {initializeJsonDataset} from '../../phase-10/src/json-dataset.mjs';
import {initializeProviderRegistry} from '../../phase-10/src/provider-registry.mjs';
import {loadAustraliaPreparedOfficial} from '../fixtures/australia-prepared-official.mjs';
import {stageThreeProviderRegistry} from '../fixtures/provider-registry.mjs';
import {australiaDatasetBundle} from './australia-importer.mjs';

export async function initializeStageThree(store, {now = () => new Date()} = {}) {
  const harmonic = await initializeDataset(store, stageOneFixture, {now});
  const australiaPreparedOfficial = await loadAustraliaPreparedOfficial();
  const australia = await initializeJsonDataset(store, australiaDatasetBundle(australiaPreparedOfficial), {now});
  const registry = await initializeProviderRegistry(store, stageThreeProviderRegistry, {now});
  return {stage: 3, harmonic, australia, registry};
}
