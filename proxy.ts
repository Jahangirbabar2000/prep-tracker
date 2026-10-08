import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { decideRoute } from '@/lib/routing';
import { DEMO_COOKIE } from '@/lib/demo/mode';

// Next 16 renamed middleware.ts to proxy.ts; it runs on Node. The decision
// itself is lib/routing.ts — this only reads the request and acts on it.
export async function proxy(req: NextRequest) {
  // Auth is opt-in: with no secret configured we don't lock anyone out.
  // Set AUTH_SECRET (and APP_PASSWORD) to turn the passcode gate on.
  const secret = process.env.AUTH_SECRET;
  const signedIn = !!secret && await verifySession(req.cookies.get(AUTH_COOKIE)?.value, secret);
  const { pathname, search } = req.nextUrl;

  const demo = req.cookies.get(DEMO_COOKIE)?.value === '1';
  const decision = decideRoute({ pathname, search, authEnabled: !!secret, signedIn, demo });
  switch (decision.kind) {
    case 'allow':
      return NextResponse.next();
    case 'unauthorized':
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    case 'sign-in': {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(decision.next)}`;
      return NextResponse.redirect(url);
    }
  }
}

export const config = {
  // Run on everything except the login page, the auth API, Next internals,
  // and the PWA/static assets needed to render login and boot the app.
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|sw\\.js|manifest\\.json|favicon\\.ico|icon\\.svg|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|robots\\.txt).*)',
  ],
};
