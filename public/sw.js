// Service worker for offline support. Static asset (no build plugin), so it
// works regardless of Turbopack. The app is local-first: pages are static
// client shells that hydrate from IndexedDB, so caching the shell + the JS/CSS
// chunks is enough to run fully offline.
//
// /api/sync is deliberately not cached. Its data already lives in the
// account's own IndexedDB database; a Cache Storage copy is keyed by URL
// alone, so on a shared device it would hand one account's data to the next
// one offline. v3 drops v2's api cache on activate.
const VER = 'v3';
const CACHES = {
  pages:  `pages-${VER}`,
  assets: `assets-${VER}`,
};
const TIMEOUT_MS = 8000;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  const keep = new Set(Object.values(CACHES));
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Page navigations — NetworkFirst, fall back to any cached shell (or home).
  if (request.mode === 'navigate') {
    event.respondWith(navHandler(request));
    return;
  }

  // Hashed Next.js bundles — CacheFirst (immutable).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.assets));
    return;
  }
});

async function navHandler(request) {
  const cache = await caches.open(CACHES.pages);
  try {
    const res = await withTimeout(fetch(request));
    // x-prep-public marks the landing page served at "/" to a signed-out
    // visitor; cached, it would later stand in for the signed-in queue.
    if (res.ok && !res.headers.get('x-prep-public')) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request))
      ?? (await cache.match('/'))
      ?? new Response('offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const cache = await caches.open(cacheName);
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ]);
}
