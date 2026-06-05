import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Link } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const links = db.prepare(
    'SELECT * FROM links WHERE problem_id = ? ORDER BY created_at ASC'
  ).all(id) as Link[];
  return NextResponse.json(links);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const { url, label } = await req.json();

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const link = db.prepare(
    'INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?) RETURNING *'
  ).get(id, url.trim(), label?.trim() || null) as Link;

  return NextResponse.json(link, { status: 201 });
}
