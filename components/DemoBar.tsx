'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { useIsDemo } from '@/lib/demo/useIsDemo';
import { idbDestroy } from '@/lib/store/idb';

/**
 * Tells a demo visitor where they are, and the three ways on: start the demo
 * over, leave it, or sign in to a real deck. Leaving deletes the demo's
 * browser database first, so nothing of it lingers on the device.
 */
export default function DemoBar() {
  const demo = useIsDemo();
  const [busy, setBusy] = useState(false);
  if (!demo) return null;

  async function leave(to: string) {
    setBusy(true);
    await idbDestroy().catch(() => {});
    window.location.assign(to);
  }

  const action = 'inline-flex min-h-11 md:min-h-8 items-center rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60';
  return (
    <div data-demo-bar className="mb-6 flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="inline-flex items-center gap-2 text-sm text-fg">
        <FlaskConical size={16} className="shrink-0 text-accent" />
        <span><span className="font-semibold">Demo</span> · sample cards; your changes stay in this browser.</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button disabled={busy} onClick={() => leave('/')} className={`${action} text-fg hover:bg-surface-2`}>Start over</button>
        <button disabled={busy} onClick={() => leave('/demo/exit')} className={`${action} text-fg hover:bg-surface-2`}>Exit demo</button>
        <button disabled={busy} onClick={() => leave('/demo/exit?next=/login')} className={`${action} bg-accent text-accent-fg hover:bg-accent-hover`}>Sign in</button>
      </div>
    </div>
  );
}
