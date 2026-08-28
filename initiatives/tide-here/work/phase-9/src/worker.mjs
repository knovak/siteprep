import {stageOneFixture} from '../fixtures/brest-stage-one.mjs';
import {initializeDataset, loadActiveDataset} from './dataset.mjs';
import {forecastFromTile} from './forecast.mjs';
import {R2ObjectStore} from './object-store.mjs';

function json(value, status = 200, headers = {}) {
  return Response.json(value, {
    status,
    headers: {'cache-control': 'no-store', ...headers},
  });
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function canInitialize(request, env) {
  const url = new URL(request.url);
  if (isLoopback(url.hostname)) return true;
  if (!env.INIT_TOKEN) return false;
  return request.headers.get('authorization') === `Bearer ${env.INIT_TOKEN}`;
}

export function createStageOneApp({
  storeFactory = env => new R2ObjectStore(env.TIDE_DATA),
  fixture = stageOneFixture,
  now = () => new Date(),
} = {}) {
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
          if (!canInitialize(request, env)) {
            return json({error: 'Initializer authorization required', code: 'init-forbidden'}, 403);
          }
          return json(await initializeDataset(store, fixture, {now}));
        }

        if (request.method === 'GET' && url.pathname === '/health') {
          const active = await loadActiveDataset(store);
          if (!active.ready) return json(active, 503);
          return json({
            ready: true,
            dataset: active.active.dataset,
            dataClass: active.manifest.dataset.dataClass,
            isFes2022: active.manifest.dataset.isFes2022,
          });
        }

        if (request.method === 'GET' && url.pathname === '/forecast') {
          const active = await loadActiveDataset(store);
          if (!active.ready) return json({...active, code: 'storage-not-ready'}, 503);
          for (const parameter of ['lat', 'lon', 'start']) {
            if (!url.searchParams.has(parameter)) throw new Error(`Missing ${parameter} parameter`);
          }
          const forecast = forecastFromTile(active.tile, {
            latitude: Number(url.searchParams.get('lat')),
            longitude: Number(url.searchParams.get('lon')),
            start: url.searchParams.get('start'),
            days: url.searchParams.has('days') ? Number(url.searchParams.get('days')) : 5,
          });
          return json(forecast);
        }

        return json({error: 'Not found'}, 404);
      } catch (error) {
        const status = error.code === 'coverage-unavailable' ? 404 : 400;
        return json({error: error.message, code: error.code ?? 'invalid-request'}, status);
      }
    },
  };
}

const worker = {
  fetch(request, env) {
    return createStageOneApp().fetch(request, env);
  },
};

export default worker;
