// LaserKenny Service Worker
const CACHE_NAME = 'laserkenny-v1';
const RUNTIME_CACHE = 'laserkenny-runtime';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET') return;
    if (url.hostname === 'api.anthropic.com') return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).then((response) => {
                if (response.ok) {
                    caches.open(CACHE_NAME).then((c) => c.put(request, response.clone()));
                }
                return response;
            }).catch(() => caches.match(request).then((r) => r || new Response('Offline', { status: 503 })))
        );
        return;
    }

    if (['style','script','image','font'].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then((response) => {
                if (response) return response;
                return fetch(request).then((resp) => {
                    if (resp && resp.status === 200) {
                        caches.open(RUNTIME_CACHE).then((c) => c.put(request, resp.clone()));
                    }
                    return resp;
                }).catch(() => caches.match(request));
            })
        );
        return;
    }

    event.respondWith(
        fetch(request).then((resp) => {
            if (resp.ok) caches.open(RUNTIME_CACHE).then((c) => c.put(request, resp.clone()));
            return resp;
        }).catch(() => caches.match(request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
