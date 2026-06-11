import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ConfigRow = { id: number; domain: string; field: string; value: string; sort_order: number };

export function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const field  = searchParams.get('field');

  let rows: ConfigRow[];
  if (domain && field) {
    rows = db.prepare(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE domain = ? AND field = ? ORDER BY sort_order ASC, id ASC'
    ).all(domain, field) as ConfigRow[];
  } else if (domain) {
    rows = db.prepare(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE domain = ? ORDER BY field ASC, sort_order ASC, id ASC'
    ).all(domain) as ConfigRow[];
  } else {
    rows = db.prepare(
      'SELECT id, domain, field, value, sort_order FROM config_options ORDER BY domain ASC, field ASC, sort_order ASC, id ASC'
    ).all() as ConfigRow[];
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json() as { domain: string; field: string; value: string };
  const { domain, field, value } = body;
  if (!domain || !field || !value?.trim()) {
    return NextResponse.json({ error: 'domain, field, and value are required' }, { status: 400 });
  }

  // Use the next available sort_order for this domain+field
  const maxRow = db.prepare(
    'SELECT MAX(sort_order) as m FROM config_options WHERE domain = ? AND field = ?'
  ).get(domain, field) as { m: number | null };
  const sort_order = (maxRow.m ?? -1) + 1;

  try {
    const result = db.prepare(
      'INSERT INTO config_options (domain, field, value, sort_order) VALUES (?, ?, ?, ?)'
    ).run(domain, field, value.trim(), sort_order);

    const row = db.prepare(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE id = ?'
    ).get(result.lastInsertRowid) as ConfigRow;

    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Value already exists for this domain/field' }, { status: 409 });
  }
}
