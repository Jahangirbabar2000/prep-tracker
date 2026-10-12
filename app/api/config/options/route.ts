import { NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';
import { withUser } from '@/lib/currentUser';

export const runtime = 'nodejs';

type ConfigRow = { id: number; domain: string; field: string; value: string; sort_order: number };

export const GET = withUser(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const field  = searchParams.get('field');

  if (domain && field) {
    const rows = await queryAll<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE user_id = ? AND domain = ? AND field = ? ORDER BY sort_order ASC, id ASC',
      [userId, domain, field],
    );
    return NextResponse.json(rows);
  } else if (domain) {
    const rows = await queryAll<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE user_id = ? AND domain = ? ORDER BY field ASC, sort_order ASC, id ASC',
      [userId, domain],
    );
    return NextResponse.json(rows);
  } else {
    const rows = await queryAll<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE user_id = ? ORDER BY domain ASC, field ASC, sort_order ASC, id ASC',
      [userId],
    );
    return NextResponse.json(rows);
  }
});

export const POST = withUser(async (req, userId) => {
  const body = await req.json() as { domain: string; field: string; value: string };
  const { domain, field, value } = body;
  if (!domain || !field || !value?.trim()) {
    return NextResponse.json({ error: 'domain, field, and value are required' }, { status: 400 });
  }
  const owned = await queryOne<{ id: string }>('SELECT id FROM study_domains WHERE id = ? AND user_id = ?', [domain, userId]);
  if (!owned) return NextResponse.json({ error: 'Unknown domain' }, { status: 404 });

  const maxRow = await queryOne<{ m: number | null }>(
    'SELECT MAX(sort_order) as m FROM config_options WHERE user_id = ? AND domain = ? AND field = ?',
    [userId, domain, field],
  );
  const sort_order = (maxRow?.m ?? -1) + 1;

  try {
    const result = await execute(
      'INSERT INTO config_options (user_id, domain, field, value, sort_order) VALUES (?, ?, ?, ?, ?)',
      [userId, domain, field, value.trim(), sort_order],
    );
    const row = await queryOne<ConfigRow>(
      'SELECT id, domain, field, value, sort_order FROM config_options WHERE id = ? AND user_id = ?',
      [result.lastInsertRowid, userId],
    );
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Value already exists for this domain/field' }, { status: 409 });
  }
});
