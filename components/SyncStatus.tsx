'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store/store';

export default function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { ready } = useStore();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  let label: string;
  let dot: string;
  if (!ready)      { label = 'Loading…';        dot = 'bg-amber-500'; }
  else if (online) { label = 'Synced';           dot = 'bg-emerald-500'; }
  else             { label = 'Offline · cached'; dot = 'bg-amber-500'; }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={label}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot} ${!ready ? 'animate-pulse' : ''}`} />
      {!compact && <span className="whitespace-nowrap">{label}</span>}
    </span>
  );
}
