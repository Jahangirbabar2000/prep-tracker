import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { withUser } from '@/lib/currentUser';

export const runtime = 'nodejs';

export const DELETE = withUser(async (_req, userId, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await execute('DELETE FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  return NextResponse.json({ ok: true });
});
