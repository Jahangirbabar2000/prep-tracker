'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV_SHORTCUTS: Record<string, string> = {
  '1': '/',
  '2': '/dsa',
  '3': '/system-design',
  '4': '/frontend',
  '5': '/backend',
  '6': '/ai',
};

export default function GlobalShortcuts() {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
      if (pathname !== '/review/session' && NAV_SHORTCUTS[e.key]) {
        router.push(NAV_SHORTCUTS[e.key]);
        return;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, pathname]);

  return null;
}
