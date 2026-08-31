import {createStageFourApp} from '../../phase-12/src/worker.mjs';

const API_PATHS = new Set(['/init', '/health', '/providers', '/stations', '/resolve', '/forecast']);

async function providerForLog(request, pathname) {
  if (pathname === '/stations') return new URL(request.url).searchParams.get('provider');
  if (pathname !== '/resolve' && pathname !== '/forecast') return null;
  try {
    const value = await request.clone().json();
    return typeof value?.provider === 'string' ? value.provider : null;
  } catch {
    return null;
  }
}

export function createStageFiveApp({logger = console, ...options} = {}) {
  const stageFour = createStageFourApp(options);
  return {
    async fetch(request, env = {}, context = {}) {
      const pathname = new URL(request.url).pathname;
      if (!API_PATHS.has(pathname)) return new Response('Not found', {status: 404});
      const provider = await providerForLog(request, pathname);
      const startedAt = Date.now();
      let response;
      try {
        response = await stageFour.fetch(request, env, context);
        return response;
      } finally {
        logger.info(JSON.stringify({
          event: 'tide-here-request',
          route: pathname,
          method: request.method,
          status: response?.status ?? 500,
          provider,
          durationMs: Date.now() - startedAt,
        }));
      }
    },
  };
}
