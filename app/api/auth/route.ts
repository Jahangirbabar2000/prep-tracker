import { NextRequest, NextResponse } from 'next/server';
import { OWNER_USER_ID, createSession, timingSafeEqual } from '@/lib/auth';
import { isActiveUser } from '@/lib/accountData';
import { clearSessionCookies, setSessionCookies } from '@/lib/sessionCookies';

export const runtime = 'nodejs';

// POST { password } — exchange the passcode for the owner's session. Local
// development and the e2e suite only: deployed stages sign in with Cognito
// (/api/auth/login) and don't set APP_PASSWORD, which would otherwise be a
// second way into the owner's account.
//
// POST { password, user_id } signs in as another user, for the two-account
// e2e tests. Only when ALLOW_SIGN_IN_AS=1 (set by e2e/server.mjs alone) and
// never in a production build, so a deployed stage can't grant it even if
// both were misconfigured.
const signInAsAllowed = () => process.env.ALLOW_SIGN_IN_AS === '1' && process.env.NODE_ENV !== 'production';

export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const expected = process.env.APP_PASSWORD;
  if (!secret || !expected) {
    return NextResponse.json({ error: 'Auth isn’t configured.' }, { status: 503 });
  }

  let body: { password?: string; user_id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }

  const password = body.password ?? '';
  if (!timingSafeEqual(password, expected)) {
    return NextResponse.json({ error: 'Wrong passcode.' }, { status: 401 });
  }

  let userId = OWNER_USER_ID;
  if (body.user_id !== undefined) {
    if (!signInAsAllowed()) return NextResponse.json({ error: 'Signing in as a user is test-only.' }, { status: 403 });
    if (typeof body.user_id !== 'string' || !(await isActiveUser(body.user_id))) {
      return NextResponse.json({ error: 'No such user.' }, { status: 404 });
    }
    userId = body.user_id;
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookies(res, await createSession(secret, Date.now(), userId), userId);
  return res;
}

// DELETE — log out by clearing the cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
