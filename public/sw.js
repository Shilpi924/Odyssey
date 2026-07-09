const CACHE_NAME = 'odyssey-map-tiles-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept requests to CartoDB tiles
  if (url.hostname.includes('cartocdn.com') && url.pathname.includes('/rastertiles/voyager/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // If we have it in cache, serve it immediately (offline support)
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            return networkResponse;
          })
          .catch(() => {
            // Offline and not in cache, return a generic error or a blank tile
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
      })
    );
  }
});
