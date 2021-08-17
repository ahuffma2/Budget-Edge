const CACHE_FILES = [
    '/',
    '/styles.css',
    '/index.html',
    '/db.js',  
    '/manifest.webmanifest',
    '/index.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

const STATIC = "static-cache-v1";
const RUNTIME = "runtime-cache";

self.addEventListener("install", e => {
  e.waitUntil(
    caches
      .open(STATIC)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  const currentCaches = [STATIC, RUNTIME];
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

self.addEventListener("fetch", e => {

  if (e.request.url.includes("/api/")) {
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

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }


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
