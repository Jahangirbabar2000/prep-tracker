'use client';

import { useEffect } from 'react';
import { bootStore, syncNow } from '@/lib/store/sync';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootStore();

    const onOnline = () => syncNow();
    const onVisible = () => { if (document.visibilityState === 'visible' && navigator.onLine) syncNow(); };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <>{children}</>;
}
