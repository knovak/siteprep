import {stageThreeProviderRegistry} from '../../phase-11/fixtures/provider-registry.mjs';

const providers = stageThreeProviderRegistry.providers.map(provider => (
  provider.id === 'fes2022'
    ? {
        ...provider,
        status: 'active',
        dataRef: {id: 'fes2022b-native-validation', version: '2026-02-03-r2'},
        attribution: 'FES2022 Tide product funded by CNES and produced by LEGOS, NOVELTIS and CLS; transformed by Tide Here into native-mesh harmonic points.',
      }
    : {...provider}
));

export const stageFourProviderRegistry = Object.freeze({
  ...stageThreeProviderRegistry,
  version: 'stage-4-v7',
  preparedAt: '2026-08-29T20:21:49.000Z',
  providers,
});
