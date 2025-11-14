const CACHE_NAME = 'card-cache-v2';
const STATIC_CACHE_NAME = 'static-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', event => {

  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('Service Worker caching static assets.');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
    console.log('Service Worker fetching:', event.request.url);

    // Handle PNG images (existing logic)
    if (event.request.url.endsWith('.png')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // If image is in cache, return it
                if (cachedResponse) {
                    console.log('Serving PNG from cache:', event.request.url);
                    return cachedResponse;
                }

                // Otherwise, fetch from network and add to cache
                console.log('Fetching PNG from network:', event.request.url);
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone()); // Store a clone
                        return networkResponse;
                    });
                });
            })
        );
    } else if (event.request.method !== "POST") {
        // For all other requests, try cache first, then network
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {

                console.log('Fetching from network:', event.request.url);
                // Try network, but cache successful responses
                return fetch(event.request).then(networkResponse => {
                    // Cache successful responses (status 200)
                    if (networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(STATIC_CACHE_NAME).then(cache => {
                            console.log('Caching response:', event.request.url);
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(() => {
                    console.log('Network failed, checking cache again:', event.request.url);
                    // Network failed, try cache again (might have been added by another request)
                    return caches.match(event.request);
                });
            })
        );
    }
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating.');
    event.waitUntil(
        Promise.all([
            // Clean up old caches - but be more selective
            caches.keys().then(cacheNames => {
                console.log('Available caches:', cacheNames);
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Only delete caches that are clearly old versions (different version numbers)
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME &&
                            cacheName.startsWith('card-cache-v') && cacheName !== 'card-cache-v2') {
                            return caches.delete(cacheName);
                        }
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME &&
                            cacheName.startsWith('static-cache-v') && cacheName !== 'static-cache-v2') {
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
