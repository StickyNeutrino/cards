const CACHE_NAME = 'card-cache-v3';
const OLD_CACHE_NAME = 'card-cache-v2';

const STATIC_CACHE_NAME = 'static-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Both runtime caches fill from traffic — every deck photo fetched while
// studying, and every non-POST 200 response — rather than from a known
// install set, so each write trims the oldest entries past a generous cap.
// A deck ships a few hundred photos at most, so studying a deck never
// evicts the deck's own images.
const CARD_CACHE_LIMIT = 1000;
const STATIC_CACHE_LIMIT = 300;

// Deck photos are referenced as .jpg and .jpeg (both cases) across the
// bundled and uploaded decks; the image strategy keys on the path alone,
// so a cache-busting query does not hide the extension.
const JPEG_PATH_PATTERN = /\.jpe?g$/i;

/** Store a response and keep the cache within its cap. Cache.keys() lists
 *  entries oldest-first in every shipping browser, so trimming from the
 *  front evicts the least recently stored. */
async function putAndTrim(cacheName, request, response, limit) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  const keys = await cache.keys();
  const excess = keys.length - limit;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Handle JPEG images (existing logic)
    if (JPEG_PATH_PATTERN.test(url.pathname)) {
        const normalizedRequest = new Request(url.origin + url.pathname);
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME)
            let response = await cache.match(normalizedRequest)

            // If image is in cache, return it
            if (response) {
                return response;
            }

            // Otherwise, fetch from network and add to cache
            let network_response;
            try {
                network_response = await fetch(event.request);
            } catch (error) {
                // Network failed, try cache again (might have been added by another request)
                const old_cache = await caches.open(OLD_CACHE_NAME)
                response = await old_cache.match(normalizedRequest)
                if (response) {
                    return response;
                }
                // Nothing in either cache: fail as a network error. respondWith
                // must resolve with a Response — resolving with the caught Error
                // object fails the request the same way but throws a TypeError
                // inside the worker first.
                return Response.error();
            }

            if (!network_response.ok) {
                const old_cache = await caches.open(OLD_CACHE_NAME)
                response = await old_cache.match(normalizedRequest)
                if (response) {
                    return response;
                }
                return network_response;
            } else {
                putAndTrim(CACHE_NAME, normalizedRequest, network_response.clone(), CARD_CACHE_LIMIT); // Store a clone
                return network_response;
            }
        })());
    } else if (event.request.method !== "POST") {
        // For all other requests, network-first strategy
        let cacheKey = new Request(url.origin + url.pathname);
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                // Cache successful responses (status 200)
                if (networkResponse.status === 200) {
                    putAndTrim(STATIC_CACHE_NAME, cacheKey, networkResponse.clone(), STATIC_CACHE_LIMIT);
                }
                return networkResponse;
            }).catch(async () => {
                // Network failed, try cache
                const cache = await caches.open(STATIC_CACHE_NAME);
                const cached = await cache.match(cacheKey);
                if (cached) {
                    return cached;
                }
                // A navigation to a route never visited online still gets the
                // app shell: the SPA serves every route from the same
                // index.html, which is what '/' precaches. Everything else
                // fails as a network error.
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
                return Response.error();
            })
        );
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches - but be more selective
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Only delete caches that are clearly old versions (different version numbers).
                        // The previous generation (OLD_CACHE_NAME) is kept as the network-failure
                        // fallback; every generation before that is dead weight and gets reclaimed.
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME &&
                            cacheName.startsWith('card-cache-v') && cacheName !== OLD_CACHE_NAME) {
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