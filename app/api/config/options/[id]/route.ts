import { queryOne, execute } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ConfigRow = { id: number; domain: string; field: string; value: string; sort_order: number };

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await execute('DELETE FROM config_options WHERE id = ?', [Number(id)]);
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { sort_order: number };
  await execute('UPDATE config_options SET sort_order = ? WHERE id = ?', [body.sort_order, Number(id)]);
  const row = await queryOne<ConfigRow>(
    'SELECT id, domain, field, value, sort_order FROM config_options WHERE id = ?',
    [Number(id)],
  );
  return NextResponse.json(row);
}
