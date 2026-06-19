import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id, noteId } = await params;
  await execute('DELETE FROM notes WHERE id = ? AND problem_id = ?', [noteId, id]);
  return new NextResponse(null, { status: 204 });
}
