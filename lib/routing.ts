// Who may open what — the decision proxy.ts acts on, kept pure so the whole
// table is unit-tested (routing.test.ts) rather than only exercised in a
// running server.

export type RouteDecision =
  | { kind: 'allow' }
  /** An /api request without a session: answered with a 401, never redirected. */
  | { kind: 'unauthorized' }
  /** The signed-out home page: shown the landing page in place, URL unchanged. */
  | { kind: 'landing' }
  /** Any other page without a session: sent to the landing page, which signs in back to `next`. */
  | { kind: 'sign-in'; next: string };

/** Public files and pages, open to a visitor with no session. */
const PUBLIC_PREFIXES = ['/welcome', '/demo', '/screenshots/'];
const isPublic = (pathname: string) =>
  PUBLIC_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));

export function decideRoute({ pathname, search, authEnabled, signedIn, demo = false }: {
  pathname: string;
  search: string;
  /** False when AUTH_SECRET isn't set: the passcode gate is off and everything is open. */
  authEnabled: boolean;
  signedIn: boolean;
  /** The pt_demo cookie is set (lib/demo/mode.ts). */
  demo?: boolean;
}): RouteDecision {
  if (!authEnabled || signedIn) return { kind: 'allow' };
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  // A demo cookie opens the app's pages — shells that hold no data; the demo
  // fills them from bundled sample data — but never the API: anyone can set
  // the cookie, so it must not reach a real database.
  if (isApi) return { kind: 'unauthorized' };
  if (isPublic(pathname) || demo) return { kind: 'allow' };
  if (pathname === '/') return { kind: 'landing' };
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
