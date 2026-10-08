'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { bootStore, syncNow } from '@/lib/store/sync';
import { idbDestroy } from '@/lib/store/idb';
import { SESSION_CHANNEL } from '@/lib/store/signOut';
import SyncErrorBanner from './SyncErrorBanner';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  // The login page has no session, so there's nothing to load: syncing there
  // only earns a 401, which the banner would show as "Couldn't load your data"
  // to every signed-out visitor.
  const signedOutPage = usePathname() === '/login';

  useEffect(() => {
    if (signedOutPage) return;
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
  }, [signedOutPage]);

  return <>{children}{!signedOutPage && <SyncErrorBanner />}</>;
}
