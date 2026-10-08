// Demo mode: the same app, filled from buildDemoDataset() instead of
// /api/sync, with every change kept in this browser. One switch decides it —
// the pt_demo cookie, set by /demo and cleared by /demo/exit — and every
// network write path checks it. The proxy never grants /api/* to a demo
// cookie either, so a write that slipped past these guards still fails.

import type { Note } from '@/lib/types';

export const DEMO_COOKIE = 'pt_demo';

/** Whether a Cookie header (or document.cookie) has the demo switch on. */
export function demoCookieIsSet(cookieHeader: string | null | undefined): boolean {
  return !!cookieHeader && cookieHeader.split(';').some(part => part.trim() === `${DEMO_COOKIE}=1`);
}

/** In the browser: is this page in demo mode? Always false on the server. */
export function isDemo(): boolean {
  return typeof document !== 'undefined' && demoCookieIsSet(document.cookie);
}

let localNoteId = -1;

/** A note made in the demo: kept in the store only, with an id no server row can have. */
export function demoNote(problemId: number, question: string, answer = ''): Note {
  return { id: localNoteId--, problem_id: problemId, question, answer, created_at: new Date().toISOString() };
}

/**
 * The backstop: in demo mode any request to /api/* fails locally with a 403
 * instead of leaving the browser. The guards at each call site mean nothing
 * should reach this; it's here so a future write that forgets its guard still
 * can't touch a real database. Installed once, from the app shell.
 */
export function installDemoFetchGuard(): void {
  if (!isDemo() || typeof window === 'undefined' || (window.fetch as { demoGuard?: true }).demoGuard) return;
  const realFetch = window.fetch.bind(window);
  const guarded = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, window.location.href);
    if (url.origin === window.location.origin && (url.pathname === '/api' || url.pathname.startsWith('/api/'))) {
      console.warn(`Demo mode: blocked ${init?.method ?? 'GET'} ${url.pathname} — demo changes stay in this browser.`);
      return Promise.resolve(new Response(JSON.stringify({ error: 'The demo keeps every change in this browser.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return realFetch(input, init);
  };
  window.fetch = Object.assign(guarded, { demoGuard: true as const });
}
