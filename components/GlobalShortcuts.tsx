'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { navigationShortcutMap } from '@/lib/domains';
import { useStore } from '@/lib/store/store';

export default function GlobalShortcuts() {
  const router   = useRouter();
  const pathname = usePathname();
  const { data } = useStore();

  useEffect(() => {
    const navShortcuts = navigationShortcutMap(data.domains);
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        router.back();
        return;
      }

      if (pathname === '/') {
        // Enter is handled on the page itself (needs the active domain/proficiency filter).
        if (e.key === 'h' || e.key === 'H') { router.push('/review/history'); return; }
      }

      // Number shortcuts for nav — disabled during active session to avoid accidental navigation
      if (pathname !== '/review/session' && navShortcuts[e.key]) {
        router.push(navShortcuts[e.key]);
        return;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data.domains, router, pathname]);

  return null;
}
