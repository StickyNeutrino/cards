const CACHE_NAME = 'card-cache-v2';
const STATIC_CACHE_NAME = 'static-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/build/client/assets/root-BJ0p9Af6.css',
  '/build/client/assets/chunk-UIGDSWPH-BjI8LrHh.js',
  '/build/client/assets/entry.client-D0uJzCY7.js',
  '/build/client/assets/home-DTzSyyvP.js',
  '/build/client/assets/manifest-cd7138da.js',
  '/build/client/assets/root-mp6r8hvW.js',
  '/app/welcome/logo-dark.svg',
  '/app/welcome/logo-light.svg',
  '/arrow-left-solid-full.svg',
  '/arrow-right-solid-full.svg'
];

self.addEventListener('install', event => {

  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('Service Worker caching static assets.');
      return cache.addAll(STATIC_ASSETS);
    })
  );
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
    } else {
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
                            console.log('Service Worker deleting old card cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME &&
                            cacheName.startsWith('static-cache-v') && cacheName !== 'static-cache-v2') {
                            console.log('Service Worker deleting old static cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            clients.claim()
        ])
    );
    console.log('Service Worker activated and controlling clients.');
});
