const CACHE_NAME = 'card-cache';

self.addEventListener('fetch', event => {
    if (event.request.destination === 'image') {
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
    }
});

self.addEventListener('activate', () => {
    clients.claim();
});
  