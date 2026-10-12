import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { withUser } from '@/lib/currentUser';

export const runtime = 'nodejs';

export const DELETE = withUser(async (
  _req,
  userId,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) => {
  const { id, noteId } = await params;
  await execute('DELETE FROM notes WHERE id = ? AND problem_id = ? AND user_id = ?', [noteId, id, userId]);
  return new NextResponse(null, { status: 204 });
});
