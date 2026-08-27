import {stageTwoProviderRegistry} from '../../phase-10/fixtures/provider-registry.mjs';

const providers = stageTwoProviderRegistry.providers.map(provider => (
  provider.id === 'australia-standard-ports'
    ? {
        ...provider,
        status: 'fixture',
        dataRef: {id: 'australia-standard-ports-sample', version: '2026-sample-v2'},
        attribution: 'Synthetic Tide Here test fixture; no Bureau or Australian Hydrographic Office predictions included.',
      }
    : {...provider}
));

export const stageThreeProviderRegistry = Object.freeze({
  ...stageTwoProviderRegistry,
  version: 'stage-3-v2',
  preparedAt: '2026-08-27T23:15:00.000Z',
  providers,
});
