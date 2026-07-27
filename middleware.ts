import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  // Auth is opt-in: with no secret configured we don't lock anyone out.
  // Set AUTH_SECRET (and APP_PASSWORD) to turn the passcode gate on.
  if (!secret) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (await verifySession(token, secret)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except the login page, the auth API, Next internals,
  // and the PWA/static assets needed to render login and boot the app.
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|sw\\.js|manifest\\.json|favicon\\.ico|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|robots\\.txt).*)',
  ],
};
