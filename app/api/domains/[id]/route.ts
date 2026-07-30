import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { DOMAIN_COLORS, DOMAIN_ICONS, STUDY_MODES } from '@/lib/domains';
import type { StudyDomain } from '@/lib/types';

export const runtime = 'nodejs';

const EDITABLE = new Set([
  'name', 'short_name', 'study_mode', 'icon', 'color', 'sort_order',
  'item_label', 'log_label', 'log_title', 'empty_message',
  'answer_placeholder', 'default_link',
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await queryOne<StudyDomain>('SELECT * FROM study_domains WHERE id = ?', [id]);
  if (!existing) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

  const body = await req.json();
  if ('slug' in body || 'id' in body) {
    return NextResponse.json({ error: 'Domain ID and slug are immutable' }, { status: 400 });
  }
  if (body.study_mode && !STUDY_MODES.includes(body.study_mode)) {
    return NextResponse.json({ error: 'Invalid study mode' }, { status: 400 });
  }
  if (body.icon && !DOMAIN_ICONS.includes(body.icon)) {
    return NextResponse.json({ error: 'Invalid icon' }, { status: 400 });
  }
  if (body.color && !DOMAIN_COLORS.includes(body.color)) {
    return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
  }

  const updates = Object.entries(body)
    .filter(([key]) => EDITABLE.has(key))
    .map(([key, value]) => ({ key, value: typeof value === 'string' ? value.trim() : value }));
  if ('archived' in body) {
    updates.push({ key: 'archived_at', value: body.archived ? new Date().toISOString() : null });
  }
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  if (updates.some(update => update.key === 'name' && !update.value)) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }

  await execute(
    `UPDATE study_domains SET ${updates.map(update => `${update.key} = ?`).join(', ')} WHERE id = ?`,
    [...updates.map(update => update.value), id],
  );
  return NextResponse.json(await queryOne<StudyDomain>('SELECT * FROM study_domains WHERE id = ?', [id]));
}
