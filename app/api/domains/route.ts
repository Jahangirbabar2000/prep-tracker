import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';
import {
  DOMAIN_COLORS,
  DOMAIN_ICONS,
  STUDY_MODES,
  isValidDomainSlug,
  normalizeDomainSlug,
} from '@/lib/domains';
import type { StudyDomain } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  const domains = await queryAll<StudyDomain>('SELECT * FROM study_domains ORDER BY sort_order, name');
  return NextResponse.json(domains);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  const slug = normalizeDomainSlug(String(body.slug ?? name));
  const studyMode = String(body.study_mode ?? 'flashcard');
  const icon = String(body.icon ?? 'book');
  const color = String(body.color ?? 'blue');

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!isValidDomainSlug(slug)) return NextResponse.json({ error: 'Invalid or reserved slug' }, { status: 400 });
  if (!STUDY_MODES.includes(studyMode as never)) return NextResponse.json({ error: 'Invalid study mode' }, { status: 400 });
  if (!DOMAIN_ICONS.includes(icon as never)) return NextResponse.json({ error: 'Invalid icon' }, { status: 400 });
  if (!DOMAIN_COLORS.includes(color as never)) return NextResponse.json({ error: 'Invalid color' }, { status: 400 });

  const duplicate = await queryOne<{ id: string }>(
    'SELECT id FROM study_domains WHERE lower(slug) = lower(?)',
    [slug],
  );
  if (duplicate) return NextResponse.json({ error: 'That URL slug is already in use' }, { status: 409 });
  const max = await queryOne<{ value: number | null }>('SELECT MAX(sort_order) AS value FROM study_domains');
  const id = `dom_${crypto.randomUUID()}`;
  const shortName = String(body.short_name ?? name).trim().slice(0, 12) || name.slice(0, 12);
  const itemLabel = String(body.item_label ?? (studyMode === 'timed_problem' ? 'Problem' : 'Question')).trim();
  const logLabel = String(body.log_label ?? (studyMode === 'timed_problem' ? 'Log Attempt' : 'Log Question')).trim();
  const logTitle = String(body.log_title ?? `${logLabel} · ${name}`).trim();
  const emptyMessage = String(body.empty_message ?? `No ${itemLabel.toLowerCase()}s yet. Log your first to get started.`).trim();
  const answerPlaceholder = String(body.answer_placeholder ?? 'Write the answer… (markdown supported)').trim();
  const defaultLink = String(body.default_link ?? '').trim();

  const domain = await queryOne<StudyDomain>(
    `INSERT INTO study_domains
      (id, slug, name, short_name, study_mode, icon, color, sort_order, item_label,
       log_label, log_title, empty_message, answer_placeholder, default_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    [
      id, slug, name, shortName, studyMode, icon, color, (max?.value ?? -1) + 1,
      itemLabel, logLabel, logTitle, emptyMessage, answerPlaceholder, defaultLink,
    ],
  );
  return NextResponse.json(domain, { status: 201 });
}
