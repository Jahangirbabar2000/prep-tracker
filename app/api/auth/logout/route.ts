import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';
import { cognitoConfig, logoutUrl } from '@/lib/oidc';

export const runtime = 'nodejs';

// GET /api/auth/logout — the last step of signing out (lib/store/signOut.ts
// has already uploaded the queue and wiped local data). Clears the app's
// session, then ends the Cognito one so the next sign-in asks again.
export async function GET(req: NextRequest) {
  const config = cognitoConfig();
  const res = NextResponse.redirect(config ? logoutUrl(config) : new URL('/login', req.url));
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
