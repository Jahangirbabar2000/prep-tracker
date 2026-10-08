'use client';

import { AlertTriangle } from 'lucide-react';
import { useStore } from '@/lib/store/store';
import { syncNow } from '@/lib/store/sync';

/**
 * Shown only when the server can't be synced *and* nothing is cached yet — a
 * first visit or a fresh deployment. Every page would otherwise sit on its
 * loading skeleton forever with no hint why. With cached data the app keeps
 * working and the sidebar's sync status carries the error instead.
 */
export default function SyncErrorBanner() {
  const { ready, syncError } = useStore();
  if (ready || !syncError) return null;

  return (
    <div role="alert" className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl rounded-2xl border border-danger/40 bg-surface p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Couldn’t load your data</p>
          <p className="mt-1 text-sm text-muted break-words">{syncError}</p>
        </div>
        <button
          onClick={() => void syncNow()}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
