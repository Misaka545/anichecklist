const CACHE_NAME = 'ayame-cache-v2';

// Install: just activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME)
             .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first strategy
// Always try the network first, fall back to cache only if offline
self.addEventListener('fetch', (event) => {
  // Only cache GET requests with http or https schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return; // Let the browser handle it natively
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(err => {
              console.warn('Cache put failed:', err);
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: try cached version
        return caches.match(event.request);
      })
  );
});
