import { queryOne, execute } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/currentUser';

export const runtime = 'nodejs';

type ConfigRow = { id: number; domain: string; field: string; value: string; sort_order: number };
type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withUser(async (_req, userId, { params }: Ctx) => {
  const { id } = await params;
  await execute('DELETE FROM config_options WHERE id = ? AND user_id = ?', [Number(id), userId]);
  return new NextResponse(null, { status: 204 });
});

export const PATCH = withUser(async (req, userId, { params }: Ctx) => {
  const { id } = await params;
  const body = await req.json() as { sort_order: number };
  await execute('UPDATE config_options SET sort_order = ? WHERE id = ? AND user_id = ?', [body.sort_order, Number(id), userId]);
  const row = await queryOne<ConfigRow>(
    'SELECT id, domain, field, value, sort_order FROM config_options WHERE id = ? AND user_id = ?',
    [Number(id), userId],
  );
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
});
