import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { withUser } from '@/lib/currentUser';
import { setUserHint } from '@/lib/sessionCookies';
import { USER_HINT_COOKIE } from '@/lib/store/localAccount';
import { Attempt, Note, Link } from '@/lib/types';
import { getDomainFieldOptions, getDomainFields, getProblems, getStudyDomains } from '@/lib/domain-server';
import { describeSyncFailure } from '@/lib/syncFailure';

export const runtime = 'nodejs';

// This is one person's whole dataset behind a session cookie, so no shared
// cache may hold it: s-maxage would let the CDN hand it to whoever asks next,
// and the CDN doesn't key on the cookie. Offline mode doesn't need HTTP
// caching — the service worker keeps its own copy in Cache Storage.
const headers = { 'Cache-Control': 'private, no-store' };

// The signed-in user's full dataset, for the local-first client store. One
// person's data is small (a few thousand rows), so it comes in one call and
// the client holds it in memory + IndexedDB.
export const GET = withUser(async (req, userId) => {
  try {
    const [problems, attempts, notes, links, config_options, domains, domain_fields, domain_field_options] = await Promise.all([
      getProblems(userId),
      queryAll<Attempt>('SELECT * FROM attempts WHERE user_id = ?', [userId]),
      queryAll<Note>('SELECT * FROM notes WHERE user_id = ?', [userId]),
      queryAll<Link>('SELECT * FROM links WHERE user_id = ?', [userId]),
      queryAll<{ id: number; domain: string; field: string; value: string; sort_order: number }>(
        'SELECT * FROM config_options WHERE user_id = ?',
        [userId],
      ),
      getStudyDomains(userId),
      getDomainFields(userId),
      getDomainFieldOptions(userId),
    ]);

    const res = NextResponse.json(
      { problems, attempts, notes, links, config_options, domains, domain_fields, domain_field_options },
      { headers },
    );
    // A session from before the user hint existed gets one, so its next page
    // load moves onto this account's own IndexedDB database.
    if (req.cookies.get(USER_HINT_COOKIE)?.value !== userId) setUserHint(res, userId);
    return res;
  } catch (error) {
    // Uncaught, this was a bare 500 with an empty body and the app sat on
    // "Loading…" forever. The client shows this message instead.
    console.error('GET /api/sync failed:', error);
    return NextResponse.json({ error: describeSyncFailure(error) }, { status: 500, headers });
  }
});
