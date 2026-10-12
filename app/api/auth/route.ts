import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_MAX_AGE_S, createSession, timingSafeEqual } from '@/lib/auth';

export const runtime = 'nodejs';

// POST { password } — exchange the passcode for the owner's session. Local
// development and the e2e suite only: deployed stages sign in with Cognito
// (/api/auth/login) and don't set APP_PASSWORD, which would otherwise be a
// second way into the owner's account.
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const expected = process.env.APP_PASSWORD;
  if (!secret || !expected) {
    return NextResponse.json({ error: 'Auth isn’t configured.' }, { status: 503 });
  }

  let body: { password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }

  const password = body.password ?? '';
  if (!timingSafeEqual(password, expected)) {
    return NextResponse.json({ error: 'Wrong passcode.' }, { status: 401 });
  }

  const token = await createSession(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_MAX_AGE_S,
  });
  return res;
}

// DELETE — log out by clearing the cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
