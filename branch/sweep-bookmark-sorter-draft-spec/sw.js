const CACHE_VERSION = 'v1786811382';
const ROOT_PATH = (() => {
  const { pathname } = new URL(self.registration.scope);
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
})();
const withRoot = (path) => `${ROOT_PATH}${path}`;
const CORE_ASSETS = [
  ROOT_PATH,
  withRoot('index.html'),
  withRoot('manifest.webmanifest'),
  withRoot('shared_assets/favicon.png'),
  withRoot('shared_assets/icon-192.png'),
  withRoot('shared_assets/icon-512.png'),
  withRoot('shared_assets/icon-192-maskable.png'),
  withRoot('shared_assets/icon-512-maskable.png')
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
        if (response.ok) {
          const copy = response.clone();
          caches.open(`siteprep-${CACHE_VERSION}`).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
