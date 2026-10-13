import { NextResponse, type NextRequest } from 'next/server';
import { createSession, timingSafeEqual, verifyToken } from '@/lib/auth';
import { setSessionCookies } from '@/lib/sessionCookies';
import { resolveUser } from '@/lib/accounts';
import { cognitoConfig, configForHost, requestHost, exchangeCode, verifyIdToken } from '@/lib/oidc';
import { safeNextPath } from '@/lib/routing';
import { OAUTH_COOKIE } from '../oauthCookie';

export const runtime = 'nodejs';

// GET /api/auth/callback?code=…&state=… — Cognito sends the browser back
// here. Check it answers this browser's own sign-in, trade the code for a
// verified identity, find or create the user, and start the app's session.
export async function GET(req: NextRequest) {
  const base = cognitoConfig();
  const config = base && configForHost(base, requestHost(req.headers));
  const secret = process.env.AUTH_SECRET;
  if (!config || !secret) return NextResponse.redirect(new URL('/login', req.url));

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${config.siteUrl}/login?error=${encodeURIComponent(reason)}`);
    res.cookies.set(OAUTH_COOKIE, '', { path: '/api/auth', maxAge: 0 });
    return res;
  };

  const params = req.nextUrl.searchParams;
  // The person backed out of the sign-in page, or Cognito refused.
  if (params.get('error')) return fail('cancelled');

  const pending = await verifyToken(req.cookies.get(OAUTH_COOKIE)?.value, secret);
  const code = params.get('code');
  const state = params.get('state');
  if (!pending || !code || !state || typeof pending.state !== 'string' || !timingSafeEqual(state, pending.state)) {
    return fail('expired');
  }

  let userId: string;
  try {
    const idToken = await exchangeCode(config, code, String(pending.verifier));
    const identity = await verifyIdToken(config, idToken, String(pending.nonce));
    const resolved = await resolveUser(identity);
    if ('error' in resolved) return fail('account');
    userId = resolved.userId;
  } catch (error) {
    console.error('Sign-in callback failed:', error);
    return fail('failed');
  }

  const res = NextResponse.redirect(`${config.siteUrl}${safeNextPath(typeof pending.next === 'string' ? pending.next : null)}`);
  res.cookies.set(OAUTH_COOKIE, '', { path: '/api/auth', maxAge: 0 });
  setSessionCookies(res, await createSession(secret, Date.now(), userId), userId);
  return res;
}
