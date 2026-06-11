import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const db = getDb();
  const { id, noteId } = await params;

  db.prepare('DELETE FROM notes WHERE id = ? AND problem_id = ?').run(noteId, id);

  return new NextResponse(null, { status: 204 });
}
