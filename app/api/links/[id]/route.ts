import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await execute('DELETE FROM links WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
