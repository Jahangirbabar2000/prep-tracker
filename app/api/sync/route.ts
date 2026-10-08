import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { Attempt, Note, Link } from '@/lib/types';
import { getDomainFieldOptions, getDomainFields, getProblems, getStudyDomains } from '@/lib/domain-server';
import { describeSyncFailure } from '@/lib/syncFailure';

export const runtime = 'nodejs';

// This is one person's whole dataset behind a session cookie, so no shared
// cache may hold it: s-maxage would let the CDN hand it to whoever asks next,
// and the CDN doesn't key on the cookie. Offline mode doesn't need HTTP
// caching — the service worker keeps its own copy in Cache Storage.
const headers = { 'Cache-Control': 'private, no-store' };

// Full dataset dump for the local-first client store. The DB is tiny
// (~a few thousand rows total), so we pull everything in one call and the
// client holds it in memory + IndexedDB.
export async function GET() {
  try {
    const [problems, attempts, notes, links, config_options, domains, domain_fields, domain_field_options] = await Promise.all([
      getProblems(),
      queryAll<Attempt>('SELECT * FROM attempts'),
      queryAll<Note>('SELECT * FROM notes'),
      queryAll<Link>('SELECT * FROM links'),
      queryAll<{ id: number; domain: string; field: string; value: string; sort_order: number }>(
        'SELECT * FROM config_options',
      ),
      getStudyDomains(),
      getDomainFields(),
      getDomainFieldOptions(),
    ]);

    return NextResponse.json(
      { problems, attempts, notes, links, config_options, domains, domain_fields, domain_field_options },
      { headers },
    );
  } catch (error) {
    // Uncaught, this was a bare 500 with an empty body and the app sat on
    // "Loading…" forever. The client shows this message instead.
    console.error('GET /api/sync failed:', error);
    return NextResponse.json({ error: describeSyncFailure(error) }, { status: 500, headers });
  }
}
