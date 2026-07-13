
const CACHE_NAME = 'gold-master-online-v1';

// We do NOT cache the app shell anymore to enforce online-only behavior.
// We only cache static assets like fonts or external libs if absolutely necessary for performance,
// but for this request, we want strict online dependency.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Network Only Strategy
self.addEventListener('fetch', (event) => {
  // Pass through all requests directly to the network.
  // If the network fails, the browser's native offline page (or our App.tsx handling) will take over.
  event.respondWith(fetch(event.request));
});
