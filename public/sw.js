const CACHE_NAME = 'odyssey-map-tiles-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept requests to CartoDB tiles
  if (url.hostname.includes('cartocdn.com') && url.pathname.includes('/rastertiles/voyager/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache
            return cachedResponse;
          }

          // Otherwise fetch from network
          return fetch(event.request)
            .then((networkResponse) => {
              // Only cache valid responses
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Offline and not in cache, return a generic error
              return new Response('', { status: 404, statusText: 'Not Found' });
            });
        });
      })
    );
  }
});
