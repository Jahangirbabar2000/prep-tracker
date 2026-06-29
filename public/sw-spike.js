// Throwaway offline-PWA spike service worker. Distinct filename so it never
// clashes with anything next-pwa might emit. Runtime caching only — one online
// load + one reload primes everything the /offline-test page needs.
const VER = 'spike-v1';
const CACHES = {
  pages:  `spike-pages-${VER}`,
  assets: `spike-assets-${VER}`,
  api:    `spike-api-${VER}`,
};
const TIMEOUT_MS = 6000;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  const keep = new Set(Object.values(CACHES));
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('spike-') && !keep.has(k)).map(k => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Review-queue API — NetworkFirst
  if (url.pathname === '/api/review-queue') {
    event.respondWith(networkFirst(request, CACHES.api));
    return;
  }

  // Page navigations — NetworkFirst, fall back to the cached /offline-test shell
  if (request.mode === 'navigate') {
    event.respondWith(navHandler(request));
    return;
  }

  // Hashed Next.js bundles — CacheFirst (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.assets));
    return;
  }
});

async function navHandler(request) {
  const cache = await caches.open(CACHES.pages);
  try {
    const res = await withTimeout(fetch(request));
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request))
      ?? (await cache.match('/offline-test'))
      ?? new Response('offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await withTimeout(fetch(request));
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request))
      ?? new Response(JSON.stringify({ error: 'offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' },
      });
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
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
  ]).finally(() => clearTimeout(id));
}
