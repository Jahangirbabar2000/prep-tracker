import { queryAll, queryOne, execute } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ConfigRow = { id: number; domain: string; field: string; value: string; sort_order: number };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const field  = searchParams.get('field');

  if (domain && field) {
    const rows = await queryAll<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE domain = ? AND field = ? ORDER BY sort_order ASC, id ASC',
      [domain, field],
    );
    return NextResponse.json(rows);
  } else if (domain) {
    const rows = await queryAll<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE domain = ? ORDER BY field ASC, sort_order ASC, id ASC',
      [domain],
    );
    return NextResponse.json(rows);
  } else {
    const rows = await queryAll<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options ORDER BY domain ASC, field ASC, sort_order ASC, id ASC',
    );
    return NextResponse.json(rows);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { domain: string; field: string; value: string };
  const { domain, field, value } = body;
  if (!domain || !field || !value?.trim()) {
    return NextResponse.json({ error: 'domain, field, and value are required' }, { status: 400 });
  }

  const maxRow = await queryOne<{ m: number | null }>(
    'SELECT MAX(sort_order) as m FROM config_options WHERE domain = ? AND field = ?',
    [domain, field],
  );
  const sort_order = (maxRow?.m ?? -1) + 1;

  try {
    const result = await execute(
      'INSERT INTO config_options (domain, field, value, sort_order) VALUES (?, ?, ?, ?)',
      [domain, field, value.trim(), sort_order],
    );
    const row = await queryOne<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE id = ?',
      [result.lastInsertRowid],
    );
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Value already exists for this domain/field' }, { status: 409 });
  }
}
