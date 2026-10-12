import { NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';
import { withUser } from '@/lib/currentUser';
import { Link } from '@/lib/types';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser(async (_req, userId, { params }: Ctx) => {
  const { id } = await params;
  const links = await queryAll<Link>(
    'SELECT * FROM links WHERE problem_id = ? AND user_id = ? ORDER BY created_at ASC',
    [id, userId],
  );
  return NextResponse.json(links);
});

export const POST = withUser(async (req, userId, { params }: Ctx) => {
  const { id } = await params;
  const { url, label } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Only onto the caller's own card (see notes/route.ts).
  const link = await queryOne<Link>(
    `INSERT INTO links (user_id, problem_id, url, label)
     SELECT user_id, id, ?, ? FROM problems WHERE id = ? AND user_id = ?
     RETURNING *`,
    [url.trim(), label?.trim() || null, id, userId],
  );
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(link, { status: 201 });
});
