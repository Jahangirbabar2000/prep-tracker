'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Tiny IndexedDB wrapper (no dependency) ──────────────────────────────────
const DB_NAME = 'spike-db';
const STORE = 'kv';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  const out = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return out;
}

// ── Types ───────────────────────────────────────────────────────────────────
type QueueItem = { id: number; name: string; domain: string };

type Status = {
  online: boolean;
  swSupported: boolean;
  swRegistered: boolean;
  swControlling: boolean;
  source: 'network' | 'cache' | 'none';
  count: number;
  lastSync: string | null;
};

const KEY_DATA = 'queue';
const KEY_SYNC = 'lastSync';

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OfflineTestPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<Status>({
    online: true, swSupported: false, swRegistered: false, swControlling: false,
    source: 'none', count: 0, lastSync: null,
  });
  const [busy, setBusy] = useState(false);

  const refreshSwStatus = useCallback(async () => {
    const swSupported = 'serviceWorker' in navigator;
    let swRegistered = false;
    if (swSupported) {
      const reg = await navigator.serviceWorker.getRegistration();
      swRegistered = !!reg;
    }
    setStatus(s => ({
      ...s,
      online: navigator.onLine,
      swSupported,
      swRegistered,
      swControlling: swSupported && !!navigator.serviceWorker.controller,
    }));
  }, []);

  const load = useCallback(async () => {
    // Try the network first; on failure read whatever IndexedDB has.
    try {
      const res = await fetch('/api/review-queue', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data: QueueItem[] = await res.json();
      const slim = data.map(d => ({ id: d.id, name: d.name, domain: d.domain }));
      const now = new Date().toISOString();
      await idbPut(KEY_DATA, slim);
      await idbPut(KEY_SYNC, now);
      setItems(slim);
      setStatus(s => ({ ...s, source: 'network', count: slim.length, lastSync: now }));
    } catch {
      const cached = (await idbGet<QueueItem[]>(KEY_DATA)) ?? [];
      const lastSync = (await idbGet<string>(KEY_SYNC)) ?? null;
      setItems(cached);
      setStatus(s => ({ ...s, source: cached.length ? 'cache' : 'none', count: cached.length, lastSync }));
    }
    await refreshSwStatus();
  }, [refreshSwStatus]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-spike.js').catch(() => {});
    }
    load();
    const on = () => refreshSwStatus();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, [load, refreshSwStatus]);

  const reset = useCallback(async () => {
    setBusy(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('spike-')).map(k => caches.delete(k)));
      }
      indexedDB.deleteDatabase(DB_NAME);
      setItems([]);
      setStatus(s => ({ ...s, source: 'none', count: 0, lastSync: null, swRegistered: false, swControlling: false }));
    } finally {
      setBusy(false);
    }
  }, []);

  const Dot = ({ ok }: { ok: boolean }) => (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: 9999,
      background: ok ? '#22c55e' : '#ef4444', marginRight: 8, verticalAlign: 'middle',
    }} />
  );

  const Row = ({ label, ok, value }: { label: string; ok: boolean; value: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1f2430' }}>
      <span><Dot ok={ok} />{label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9aa4b2' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', color: '#e6e9ef', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Offline PWA Spike</h1>
      <p style={{ fontSize: 14, color: '#9aa4b2', marginBottom: 20 }}>
        Open online, confirm all green, reload once, then go offline and reopen.
      </p>

      <div style={{ background: '#0f1117', border: '1px solid #1f2430', borderRadius: 14, padding: '4px 16px 12px', marginBottom: 16 }}>
        <Row label="Network" ok={status.online} value={status.online ? 'online' : 'OFFLINE'} />
        <Row label="Service worker supported" ok={status.swSupported} value={status.swSupported ? 'yes' : 'no'} />
        <Row label="Service worker registered" ok={status.swRegistered} value={status.swRegistered ? 'yes' : 'no'} />
        <Row label="Service worker controlling page" ok={status.swControlling} value={status.swControlling ? 'yes' : 'not yet'} />
        <Row label="Data source" ok={status.source !== 'none'} value={status.source} />
        <Row label="Cached records" ok={status.count > 0} value={String(status.count)} />
        <Row label="Last sync" ok={!!status.lastSync} value={status.lastSync ? new Date(status.lastSync).toLocaleString() : '—'} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => load()} disabled={busy}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#06210f', fontWeight: 700 }}>
          Re-sync
        </button>
        <button onClick={() => reset()} disabled={busy}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #1f2430', background: 'transparent', color: '#e6e9ef', fontWeight: 600 }}>
          Reset
        </button>
      </div>

      <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9aa4b2', marginBottom: 8 }}>
        First {Math.min(10, items.length)} cached questions
      </h2>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
        {items.slice(0, 10).map(it => (
          <li key={it.id}><span style={{ color: '#9aa4b2' }}>[{it.domain}]</span> {it.name}</li>
        ))}
        {items.length === 0 && <li style={{ listStyle: 'none', marginLeft: -20, color: '#ef4444' }}>No cached data.</li>}
      </ol>
    </div>
  );
}
