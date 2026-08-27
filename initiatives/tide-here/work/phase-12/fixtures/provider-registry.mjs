import {stageThreeProviderRegistry} from '../../phase-11/fixtures/provider-registry.mjs';

const providers = stageThreeProviderRegistry.providers.map(provider => (
  provider.id === 'fes2022'
    ? {
        ...provider,
        status: 'fixture',
        dataRef: {id: 'fes-shaped-global-sample', version: '2026-08-27'},
        attribution: 'Synthetic FES-shaped Stage 4 fixture; no FES2022 atlas values included.',
      }
    : {...provider}
));

export const stageFourProviderRegistry = Object.freeze({
  ...stageThreeProviderRegistry,
  version: 'stage-4-v1',
  preparedAt: '2026-08-27T18:00:00.000Z',
  providers,
});
