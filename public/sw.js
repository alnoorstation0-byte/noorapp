const CACHE_NAME = 'rawasi-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through everything for now.
  // Next.js App Router caching is already strong enough.
  event.respondWith(fetch(event.request));
});
