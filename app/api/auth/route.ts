import { NextRequest, NextResponse } from 'next/server';
import { OWNER_USER_ID, createSession, timingSafeEqual } from '@/lib/auth';
import { clearSessionCookies, setSessionCookies } from '@/lib/sessionCookies';

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

  const res = NextResponse.json({ ok: true });
  setSessionCookies(res, await createSession(secret, Date.now(), OWNER_USER_ID), OWNER_USER_ID);
  return res;
}

// DELETE — log out by clearing the cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
