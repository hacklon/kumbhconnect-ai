// KumbhConnect AI Service Worker for Offline-First Support
const CACHE_NAME = 'kumbhconnect-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/globals.css',
  '/favicon.ico',
  '/globe.svg'
];

// Install Event - cache core pages and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching static app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Cleared old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Bypassing API routes and external Leaflet map tiles
  if (event.request.url.includes('/api/') || event.request.url.includes('tile.basemaps.cartocdn.com') || event.request.url.includes('unpkg.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the updated page copy
        if (response && response.status === 200 && response.type === 'basic') {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
        }
        return response;
      })
      .catch(() => {
        // Retrieve from cache during offline states
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline generic layout if not found in cache
          return new Response('Offline. Please connect to a cellular network to access live resources.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
