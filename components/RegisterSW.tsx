'use client';

import { useEffect } from 'react';

// Core routes to proactively cache on first load so the main flows work offline
// without having to manually visit each one while online.
const CORE_ROUTES = ['/', '/dsa', '/system-design', '/frontend', '/backend', '/ai', '/review/session', '/review/history'];

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    (async () => {
      try {
        // Remove any stale service workers from earlier experiments (e.g. the spike).
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
          if (url && !url.endsWith('/sw.js')) await r.unregister();
        }

        await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Warm the page cache so core routes open offline after one online visit.
        if (navigator.onLine && 'caches' in window) {
          const cache = await caches.open('pages-v1');
          await Promise.all(CORE_ROUTES.map(async route => {
            try {
              const res = await fetch(route, { cache: 'no-store' });
              if (res.ok) await cache.put(route, res.clone());
            } catch { /* ignore — best effort */ }
          }));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  return null;
}
