import {stageThreeProviderRegistry} from '../../phase-11/fixtures/provider-registry.mjs';

const providers = stageThreeProviderRegistry.providers.map(provider => (
  provider.id === 'fes2022'
    ? {
        ...provider,
        status: 'active',
        dataRef: {id: 'fes2022b-native-validation', version: '2026-02-03-r2'},
        attribution: 'FES2022 Tide product funded by CNES and produced by LEGOS, NOVELTIS and CLS; transformed by Tide Here into native-mesh harmonic points.',
      }
    : provider.id === 'australia-standard-ports'
      ? {
          ...provider,
          requiredDatasetSchema: 'tide-here/australia-standard-ports/v3',
          dataRef: {...provider.dataRef, version: `${provider.dataRef.version}-ports-r2`, verification: 'manifest-and-selected-objects'},
        }
      : {...provider}
));

export const stageFourProviderRegistry = Object.freeze({
  ...stageThreeProviderRegistry,
  version: 'stage-4-v9-au-ports-r2',
  preparedAt: '2026-08-29T20:21:49.000Z',
  providers,
});
