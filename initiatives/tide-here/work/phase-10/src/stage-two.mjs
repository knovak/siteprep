import {stageOneFixture} from '../../phase-9/fixtures/brest-stage-one.mjs';
import {initializeDataset} from '../../phase-9/src/dataset.mjs';
import {stageTwoProviderRegistry} from '../fixtures/provider-registry.mjs';
import {initializeProviderRegistry} from './provider-registry.mjs';

export async function initializeStageTwo(store, {now = () => new Date()} = {}) {
  const harmonic = await initializeDataset(store, stageOneFixture, {now});
  const registry = await initializeProviderRegistry(store, stageTwoProviderRegistry, {now});
  return {stage: 2, harmonic, registry};
}
