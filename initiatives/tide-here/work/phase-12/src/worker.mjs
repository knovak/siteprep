import {createProviderGatewayApp} from '../../phase-10/src/gateway.mjs';
import {australianStationCatalogue, forecastAustralianStandardPort} from '../../phase-11/src/australia-provider.mjs';
import {forecastFesFallback} from './fes-provider.mjs';
import {initializeStageFour} from './stage-four.mjs';

export function createStageFourApp(options = {}) {
  return createProviderGatewayApp({
    initialize: initializeStageFour,
    forecastAdapters: {
      fes2022: forecastFesFallback,
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
    return createStageFourApp().fetch(request, env);
  },
};

export default worker;
