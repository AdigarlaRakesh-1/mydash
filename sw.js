self.addEventListener('install', (e) => {
    // Force the new taking-over of the service worker
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => caches.delete(key)));
        }).then(() => {
            // Unregister the service worker completely
            self.registration.unregister();
            return self.clients.claim();
        })
    );
});

// Pass-through fetch for anything else
self.addEventListener('fetch', (e) => {
    // Do nothing, just let the network handle it
});
