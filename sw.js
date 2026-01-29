const CACHE_VERSION = 'v1769687700';
const ROOT_PATH = (() => {
  const { pathname } = new URL(self.registration.scope);
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
})();
const withRoot = (path) => `${ROOT_PATH}${path}`;
const CORE_ASSETS = [
  ROOT_PATH,
  withRoot('index.html'),
  withRoot('manifest.webmanifest')
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`siteprep-${CACHE_VERSION}`).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key.startsWith('siteprep-') && key !== `siteprep-${CACHE_VERSION}`)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(`siteprep-${CACHE_VERSION}`).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
