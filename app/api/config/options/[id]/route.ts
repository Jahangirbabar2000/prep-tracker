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
