import {createProviderGatewayApp} from '../../phase-10/src/gateway.mjs';
import {forecastHarmonicFixture} from '../../phase-10/src/stored-provider.mjs';
import {australianStationCatalogue, forecastAustralianStandardPort} from './australia-provider.mjs';
import {initializeStageThree} from './stage-three.mjs';

export function createStageThreeApp(options = {}) {
  return createProviderGatewayApp({
    initialize: initializeStageThree,
    forecastAdapters: {
      fes2022: forecastHarmonicFixture,
      'australia-standard-ports': forecastAustralianStandardPort,
    },
    stationCatalogues: {
      'australia-standard-ports': australianStationCatalogue,
    },
    ...options,
  });
}

const worker = {
  fetch(request, env) {
    return createStageThreeApp().fetch(request, env);
  },
};

export default worker;
