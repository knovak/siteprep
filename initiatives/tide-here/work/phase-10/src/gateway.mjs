import {R2ObjectStore} from '../../phase-9/src/object-store.mjs';
import {loadActiveProviderRegistry, providerById} from './provider-registry.mjs';

function json(value, status = 200, headers = {}) {
  return Response.json(value, {status, headers: {'cache-control': 'no-store', ...headers}});
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function canInitialize(request, env) {
  if (isLoopback(new URL(request.url).hostname)) return true;
  return Boolean(env.INIT_TOKEN)
    && request.headers.get('authorization') === `Bearer ${env.INIT_TOKEN}`;
}

async function requestJson(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Expected an application/json request');
  }
  const value = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  return value;
}

function publicProviders(registry) {
  return registry.providers.map(provider => ({...provider}));
}

function errorStatus(error) {
  if (error.code === 'provider-not-found') return 404;
  if (error.code === 'direct-provider-required' || error.code === 'provider-not-ready') return 409;
  if (error.code === 'dataset-year-unavailable' || error.code === 'dataset-date-unavailable') return 422;
  if (error.code?.includes('unavailable') || error.code?.includes('mismatch')) return 503;
  return 400;
}

export function createProviderGatewayApp({
  initialize,
  forecastAdapters = {},
  stationCatalogues = {},
  storeFactory = env => new R2ObjectStore(env.TIDE_DATA),
  now = () => new Date(),
} = {}) {
  if (typeof initialize !== 'function') throw new Error('Provider gateway requires an initializer');
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      let store;
      try {
        store = storeFactory(env);
      } catch (error) {
        return json({error: error.message, code: 'storage-unavailable'}, 503);
      }

      try {
        if (url.pathname === '/init') {
          if (request.method !== 'POST') return json({error: 'Use POST /init'}, 405, {allow: 'POST'});
          if (!canInitialize(request, env)) return json({error: 'Initializer authorization required', code: 'init-forbidden'}, 403);
          return json(await initialize(store, {now}));
        }

        const active = await loadActiveProviderRegistry(store);
        if (request.method === 'GET' && url.pathname === '/health') {
          if (!active.ready) return json(active, 503);
          return json({
            ready: true,
            registry: {id: active.registry.id, version: active.registry.version},
            providers: active.registry.providers.map(provider => ({
              id: provider.id,
              status: provider.status,
              execution: provider.execution,
              dataset: provider.dataRef ?? null,
            })),
          });
        }
        if (!active.ready) return json({...active, code: 'storage-not-ready'}, 503);

        if (request.method === 'GET' && url.pathname === '/providers') {
          return json({registry: {id: active.registry.id, version: active.registry.version}, providers: publicProviders(active.registry)});
        }

        if (request.method === 'GET' && url.pathname === '/stations') {
          const providerId = url.searchParams.get('provider');
          const descriptor = providerById(active.registry, providerId);
          if (!descriptor) return json({error: 'Unknown provider', code: 'provider-not-found'}, 404);
          const catalogue = stationCatalogues[providerId];
          if (!catalogue) return json({error: 'Station catalogue is not served here', code: 'provider-not-ready'}, 409);
          return json({provider: providerId, stations: await catalogue({store, descriptor})});
        }

        if (request.method === 'POST' && url.pathname === '/forecast') {
          const body = await requestJson(request);
          const descriptor = providerById(active.registry, body.provider);
          if (!descriptor) {
            const error = new Error('Unknown provider');
            error.code = 'provider-not-found';
            throw error;
          }
          if (descriptor.execution === 'browser-direct') {
            const error = new Error(`${descriptor.name} remains a direct browser provider`);
            error.code = 'direct-provider-required';
            throw error;
          }
          const adapter = forecastAdapters[descriptor.id];
          if (!adapter) {
            const error = new Error(`${descriptor.name} is not ready`);
            error.code = 'provider-not-ready';
            throw error;
          }
          return json(await adapter({store, request: body, descriptor, now}));
        }

        return json({error: 'Not found'}, 404);
      } catch (error) {
        return json({error: error.message, code: error.code ?? 'invalid-request'}, errorStatus(error));
      }
    },
  };
}
