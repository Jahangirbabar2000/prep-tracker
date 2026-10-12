import type { NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_MAX_AGE_S } from './auth';
import { USER_HINT_COOKIE } from './store/localAccount';

const base = () => ({ secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' });

/**
 * Start a session: the httpOnly token, plus the readable user hint that picks
 * this account's IndexedDB database in the browser (lib/store/localAccount.ts).
 * The hint grants nothing — the server reads only the signed token.
 */
export function setSessionCookies(res: NextResponse, token: string, userId: string) {
  res.cookies.set(AUTH_COOKIE, token, { ...base(), httpOnly: true, maxAge: AUTH_MAX_AGE_S });
  setUserHint(res, userId);
}

export function setUserHint(res: NextResponse, userId: string) {
  res.cookies.set(USER_HINT_COOKIE, userId, { ...base(), httpOnly: false, maxAge: AUTH_MAX_AGE_S });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, '', { ...base(), httpOnly: true, maxAge: 0 });
  res.cookies.set(USER_HINT_COOKIE, '', { ...base(), httpOnly: false, maxAge: 0 });
}
