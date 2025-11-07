const CACHE_NAME = 'card-cache-v1';
const STATIC_CACHE_NAME = 'static-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/build/client/assets/root-CBi0h1At.css',
  '/build/client/assets/root-CBe1ldc9.js',
  '/build/client/assets/entry.client-D0uJzCY7.js',
  '/build/client/assets/home-DTzSyyvP.js',
  '/build/client/assets/chunk-UIGDSWPH-BjI8LrHh.js',
  '/build/client/assets/viewtrack-DP5HpTYt.js',
  '/app/welcome/logo-dark.svg',
  '/app/welcome/logo-light.svg',
  '/arrow-left-solid-full.svg',
  '/arrow-right-solid-full.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
    // Handle PNG images (existing logic)
    if (event.request.url.endsWith('.png')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // If image is in cache, return it
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise, fetch from network and add to cache
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone()); // Store a clone
                        return networkResponse;
                    });
                });
            })
        );
    } else {
        // For other requests, try cache first, then network
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            clients.claim()
        ])
    );
});
