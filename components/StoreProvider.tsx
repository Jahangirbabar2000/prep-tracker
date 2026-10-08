'use client';

import { useEffect } from 'react';
import { bootStore, syncNow } from '@/lib/store/sync';
import { idbDestroy } from '@/lib/store/idb';
import { SESSION_CHANNEL } from '@/lib/store/signOut';
import SyncErrorBanner from './SyncErrorBanner';
import { installDemoFetchGuard } from '@/lib/demo/mode';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  // Mounted only by app/(app)/layout.tsx, never on a public page: there's no
  // session there, and a sync would only earn a 401 for the banner to show.
  useEffect(() => {
    installDemoFetchGuard(); // demo only: no request to /api/* leaves the browser
    bootStore();

    const onOnline = () => syncNow();
    const onVisible = () => { if (document.visibilityState === 'visible' && navigator.onLine) syncNow(); };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    // Signed out in another tab: this tab still holds the account's data in
    // memory and would write it straight back to IndexedDB on its next change.
    const session = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SESSION_CHANNEL) : null;
    if (session) {
      session.onmessage = event => {
        if (event.data === 'signed-out') void idbDestroy().finally(() => window.location.assign('/login'));
      };
    }

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      session?.close();
    };
  }, []);

  return <>{children}<SyncErrorBanner /></>;
}
