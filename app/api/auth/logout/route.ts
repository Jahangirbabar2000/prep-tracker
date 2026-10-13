import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies } from '@/lib/sessionCookies';
import { cognitoConfig, configForHost, requestHost, logoutUrl } from '@/lib/oidc';

export const runtime = 'nodejs';

// GET /api/auth/logout — the last step of signing out (lib/store/signOut.ts
// has already uploaded the queue and wiped local data). Clears the app's
// session, then ends the Cognito one so the next sign-in asks again.
export async function GET(req: NextRequest) {
  const base = cognitoConfig();
  const config = base && configForHost(base, requestHost(req.headers));
  const res = NextResponse.redirect(config ? logoutUrl(config) : new URL('/login', req.url));
  clearSessionCookies(res);
  return res;
}
