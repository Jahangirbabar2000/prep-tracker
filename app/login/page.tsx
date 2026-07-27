'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Binary, Lock } from 'lucide-react';

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Couldn’t sign in.');
      }
      // Full navigation so middleware sees the fresh cookie.
      window.location.assign(next.startsWith('/') ? next : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t sign in.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-accent-fg">
            <Binary size={18} />
          </span>
          <span className="font-semibold text-fg">Jahangir&apos;s Prep</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-fg mb-1">Enter passcode</h1>
          <p className="text-sm text-muted mb-5">This tracker is private. Enter the passcode to continue.</p>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Passcode"
                aria-label="Passcode"
                className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>

            {error && <p className="text-sm text-danger" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={busy || !password}
              className="mt-1 bg-accent text-accent-fg font-medium text-sm rounded-lg py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busy ? 'Signing in…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
