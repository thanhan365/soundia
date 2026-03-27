const CACHE_NAME = 'soundia-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/soundia-logo.jpg',
    '/fallback-cover.svg',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches, take control immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network first, cache fallback
// Skip caching for audio streams and external APIs (too large/dynamic)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip backend API calls
    if (url.pathname.startsWith('/api/')) return;
    if (url.hostname.includes('localhost')) return;

    // Skip audio/video streams (external domains)
    if (url.hostname.includes('youtube.com')) return;
    if (url.hostname.includes('googlevideo.com')) return;
    if (url.hostname.includes('nct.vn')) return;
    if (url.hostname.includes('itunes.apple.com')) return;

    // Skip non-HTTP(S) protocols
    if (!url.protocol.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful same-origin responses
                if (response.ok && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
