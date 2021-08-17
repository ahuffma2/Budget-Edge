const CACHE_FILES = [
    '/',
    '/indexedDb.js',
    'index.js',
    'manifest.json',
    '/index.html',
    '/style.css',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];


const CACHE_STATIC = "static-cache-v1";
const RUNTIME = "runtime-cache";

self.addeListener("install", e => {
  e.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});


self.addeListener("activate", e => {
  const currentCaches = [CACHE_STATIC, RUNTIME];
  e.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return cacheNames.filter(
          cacheName => !currentCaches.includes(cacheName)
        );
      })
      .then(cachesToDelete => {
        return Promise.all(
          cachesToDelete.map(cacheToDelete => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addeListener("fetch", e => {
  // non GET requests are not cached and requests to other origins are not cached
  if (
    e.request.method !== "GET" ||
    !e.request.url.startsWith(self.location.origin)
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // handle runtime GET requests for data from /api routes
  if (e.request.url.includes("/api/")) {
    // make network request and fallback to cache if network request fails (offline)
    e.respondWith(
      caches.open(RUNTIME).then(cache => {
        return fetch(e.request)
          .then(response => {
            cache.put(e.request, response.clone());
            return response;
          })
          .catch(() => caches.match(e.request));
      })
    );
    return;
  }

  // use cache first for all other requests for performance
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // request is not in cache. make network request and cache the response
      return caches.open(RUNTIME).then(cache => {
        return fetch(e.request).then(response => {
          return cache.put(e.request, response.clone()).then(() => {
            return response;
          });
        });
      });
    })
  );
});
