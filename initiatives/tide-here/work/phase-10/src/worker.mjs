import {createProviderGatewayApp} from './gateway.mjs';
import {initializeStageTwo} from './stage-two.mjs';
import {forecastHarmonicFixture} from './stored-provider.mjs';

export function createStageTwoApp(options = {}) {
  return createProviderGatewayApp({
    initialize: initializeStageTwo,
    forecastAdapters: {fes2022: forecastHarmonicFixture},
    ...options,
  });
}

const worker = {
  fetch(request, env) {
    return createStageTwoApp().fetch(request, env);
  },
};

export default worker;
