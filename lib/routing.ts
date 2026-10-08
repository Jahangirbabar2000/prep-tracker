// Who may open what — the decision proxy.ts acts on, kept pure so the whole
// table is unit-tested (routing.test.ts) rather than only exercised in a
// running server.

export type RouteDecision =
  | { kind: 'allow' }
  /** An /api request without a session: answered with a 401, never redirected. */
  | { kind: 'unauthorized' }
  /** A page without a session: sent to sign in, then back to `next`. */
  | { kind: 'sign-in'; next: string };

export function decideRoute({ pathname, search, authEnabled, signedIn }: {
  pathname: string;
  search: string;
  /** False when AUTH_SECRET isn't set: the passcode gate is off and everything is open. */
  authEnabled: boolean;
  signedIn: boolean;
}): RouteDecision {
  if (!authEnabled || signedIn) return { kind: 'allow' };
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'unauthorized' };
  return { kind: 'sign-in', next: pathname + search };
}

/**
 * Where to send someone after signing in. Only a path on this site: `next`
 * comes from the URL, so anything else would let a crafted link bounce a
 * freshly signed-in visitor to another site. "//host" and "/\host" are both
 * read by browsers as another origin, so a single leading slash is required.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
