import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const db = getDb();
    db.prepare('DELETE FROM config_options WHERE id = ?').run(Number(id));
    return new NextResponse(null, { status: 204 });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json() as { sort_order: number };
  db.prepare('UPDATE config_options SET sort_order = ? WHERE id = ?').run(body.sort_order, Number(id));
  const row = db.prepare('SELECT id, domain, field, value, sort_order FROM config_options WHERE id = ?').get(Number(id));
  return NextResponse.json(row);
}
