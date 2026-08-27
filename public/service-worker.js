const CACHE_NAME = 'card-cache-v3';
const OLD_CACHE_NAME = 'card-cache-v2';

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

    // Handle JPEG images (existing logic)
    if (event.request.url.endsWith('.jpg')) {
        const url = new URL(event.request.url);
        const normalizedRequest = new Request(url.origin + url.pathname);
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME)
            let response = await cache.match(normalizedRequest)
            
            // If image is in cache, return it
            if (response) {
                console.log('Serving JPEG from cache:', event.request.url);
                return response;
            }

            // Otherwise, fetch from network and add to cache
            console.log('Fetching JPEG from network:', event.request.url);

            let network_response;
            try {
                network_response = await fetch(event.request);
            } catch (error) {
                console.log('Network failed, checking cache again:', event.request.url);
                // Network failed, try cache again (might have been added by another request)
                const old_cache = await caches.open(OLD_CACHE_NAME)
                response = old_cache.match(normalizedRequest)
                if (response) {
                    console.log('Serving JPEG from old cache:', event.request.url);
                    return response;
                } else {
                    return error;
                }          
            }

            if (!network_response.ok) {
                const old_cache = await caches.open(OLD_CACHE_NAME)
                response = old_cache.match(normalizedRequest)
                if (response) {
                    console.log('Serving JPEG from old cache:', event.request.url);
                    return response;
                } else {
                    return network_response;
                }
            } else {
                cache.put(normalizedRequest, network_response.clone()); // Store a clone
                return network_response;
            }
        })());
    } else if (event.request.method !== "POST") {
        // For all other requests, network-first strategy
        const url = new URL(event.request.url);
        let cacheKey = new Request(url.origin + url.pathname);
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                // Cache successful responses (status 200)
                if (networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(STATIC_CACHE_NAME).then(cache => {
                        console.log('Caching response:', event.request.url);
                        cache.put(cacheKey, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                console.log('Network failed, checking cache:', event.request.url);
                // Network failed, try cache
                return caches.open(STATIC_CACHE_NAME).then(cache => cache.match(cacheKey));
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
