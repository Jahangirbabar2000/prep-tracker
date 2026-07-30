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

  return NextResponse.json(
    { problems, attempts, notes, links, config_options, domains, domain_fields, domain_field_options },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } },
  );
}
