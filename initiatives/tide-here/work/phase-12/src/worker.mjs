import {createProviderGatewayApp} from '../../phase-10/src/gateway.mjs';
import {
  australianStationCatalogue,
  extremityAustralianStandardPort,
  forecastAustralianStandardPort,
} from '../../phase-11/src/australia-provider.mjs';
import {extremityFesFallback, forecastFesFallback, resolveFesModelPoint} from './fes-provider.mjs';
import {importFesDataset} from './fes-importer.mjs';
import {initializeStageFour} from './stage-four.mjs';

export function createStageFourApp(options = {}) {
  return createProviderGatewayApp({
    initialize: initializeStageFour,
    importDataset: importFesDataset,
    forecastAdapters: {
      fes2022: forecastFesFallback,
      'australia-standard-ports': forecastAustralianStandardPort,
    },
    stationResolvers: {
      fes2022: resolveFesModelPoint,
    },
    extremityAdapters: {
      fes2022: extremityFesFallback,
      'australia-standard-ports': extremityAustralianStandardPort,
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
