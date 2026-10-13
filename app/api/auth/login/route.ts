import { NextResponse, type NextRequest } from 'next/server';
import { signToken } from '@/lib/auth';
import { authorizeUrl, cognitoConfig, configForHost, requestHost, pkceChallenge, randomToken } from '@/lib/oidc';
import { safeNextPath } from '@/lib/routing';
import { OAUTH_COOKIE, OAUTH_TTL_MS } from '../oauthCookie';

export const runtime = 'nodejs';

// GET /api/auth/login?next=/stats[&signup=1] — start a Cognito sign-in. The
// state, nonce and PKCE verifier ride in a short-lived signed cookie, so the
// callback can check that the answer is to this browser's own request.
export async function GET(req: NextRequest) {
  const base = cognitoConfig();
  const config = base && configForHost(base, requestHost(req.headers));
  const secret = process.env.AUTH_SECRET;
  if (!config || !secret) return NextResponse.redirect(new URL('/login', req.url));

  const next = safeNextPath(req.nextUrl.searchParams.get('next'));
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const cookie = await signToken({ state, nonce, verifier, next }, secret, OAUTH_TTL_MS);

  const res = NextResponse.redirect(authorizeUrl(config, {
    state,
    nonce,
    codeChallenge: await pkceChallenge(verifier),
    signUp: req.nextUrl.searchParams.get('signup') === '1',
  }));
  res.cookies.set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax still rides the top-level redirect back from Cognito.
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: OAUTH_TTL_MS / 1000,
  });
  return res;
}
