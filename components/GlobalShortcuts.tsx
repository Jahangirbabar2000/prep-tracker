'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
        if (e.key === 'Enter') { e.preventDefault(); router.push('/review/session'); return; }
        if (e.key === 'h' || e.key === 'H') { router.push('/review/history'); return; }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, pathname]);

  return null;
}
