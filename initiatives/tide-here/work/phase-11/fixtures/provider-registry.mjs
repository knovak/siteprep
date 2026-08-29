import {stageTwoProviderRegistry} from '../../phase-10/fixtures/provider-registry.mjs';

const providers = stageTwoProviderRegistry.providers.map(provider => (
  provider.id === 'australia-standard-ports'
    ? {
        ...provider,
        status: 'active',
        dataRef: {id: 'australia-bom-annual-tides', version: '2026-bom-v2'},
        attribution: '© Commonwealth of Australia 2025, Bureau of Meteorology.',
      }
    : {...provider}
));

export const stageThreeProviderRegistry = Object.freeze({
  ...stageTwoProviderRegistry,
  version: 'stage-3-v5',
  preparedAt: '2026-08-29T01:20:58.000Z',
  providers,
});
