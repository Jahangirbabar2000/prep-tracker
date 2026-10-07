import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { Problem, Attempt, Note, Link } from '@/lib/types';
import { getDomainFieldOptions, getDomainFields, getProblems, getStudyDomains } from '@/lib/domain-server';

export const runtime = 'nodejs';

// Full dataset dump for the local-first client store. The DB is tiny
// (~a few thousand rows total), so we pull everything in one call and the
// client holds it in memory + IndexedDB.
export async function GET() {
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

  // This is one person's whole dataset behind a session cookie, so no shared
  // cache may hold it: s-maxage would let the CDN hand it to whoever asks next,
  // and the CDN doesn't key on the cookie. Offline mode doesn't need HTTP
  // caching — the service worker keeps its own copy in Cache Storage.
  return NextResponse.json(
    { problems, attempts, notes, links, config_options, domains, domain_fields, domain_field_options },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
