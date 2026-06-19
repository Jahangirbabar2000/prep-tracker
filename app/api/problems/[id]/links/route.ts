import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';
import { Link } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const links = await queryAll<Link>(
    'SELECT * FROM links WHERE problem_id = ? ORDER BY created_at ASC',
    [id],
  );
  return NextResponse.json(links);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { url, label } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const link = await queryOne<Link>(
    'INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?) RETURNING *',
    [id, url.trim(), label?.trim() || null],
  );

  return NextResponse.json(link, { status: 201 });
}
