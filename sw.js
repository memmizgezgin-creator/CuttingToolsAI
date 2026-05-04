// ToolAdvisor service worker placeholder.
// Intentionally no caching/fetch interception yet; this prevents a broken
// registration while keeping future offline support explicit and safe.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
