import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, OWNER_USER_ID, readSession } from './auth';
import { isActiveUser } from './accountData';
import { annotate, flushTelemetry, takeColdStart } from './telemetry';

/**
 * The signed-in user for a route handler — always from the session cookie,
 * never from anything the request body or URL says. With auth off (no
 * AUTH_SECRET, the same fail-open rule as proxy.ts) there is only the owner.
 */
export async function userIdFromRequest(req: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return OWNER_USER_ID;
  return readSession(req.cookies.get(AUTH_COOKIE)?.value, secret);
}

/**
 * Wrap a route handler so it runs only for a signed-in user, and receives
 * their id. The proxy already turns away signed-out API calls; this is the
 * second line, and the one place a handler learns whose rows it may touch.
 * Every query it runs must then filter on that user_id, and a row that
 * belongs to someone else answers 404 — the same as one that doesn't exist.
 */
export function withUser<Ctx>(
  handler: (req: NextRequest, userId: string, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      annotate({ 'faas.coldstart': takeColdStart() });
      const userId = await userIdFromRequest(req);
      // A session outlives its account on every other device; a deleted (or
      // unknown) user is signed out here, not just on the device that deleted.
      if (!userId || !(await isActiveUser(userId))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // The internal id only — never the email.
      annotate({ 'enduser.id': userId });
      return await handler(req, userId, ctx);
    } finally {
      // Lambda freezes once the response goes; send this request's spans (and
      // any a page render left buffered) first. The client rarely waits on the
      // API — the store is local-first — so the flush costs it little.
      await flushTelemetry();
    }
  };
}
