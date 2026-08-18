// Incremental seed for the "AWS" domain: creates the domain, its two fields
// (Certification / Topic) and their options, then inserts the flashcards in
// scripts/aws-cards.md, parsed from the
// "## Certification" / "### Topic" / "**Q:** … **A:** …" markdown structure.
//
// New cards go in with ZERO attempts, interval_level 0, and next_due_date set
// to TOMORROW — level 0's interval in lib/sr.ts. That is what puts a card you
// add today into the Review Queue tomorrow, which admits on the due date alone.
// Do NOT fake a first attempt to get it there: a synthetic "got it" inflates
// computeStreak and, because the Resume preset is scope 'unattempted' (strictly
// zero attempts), hides the card from the surface built for never-studied cards.
//
//   node scripts/seed-aws.mjs
//
// Designed to be run again after every question you add: domain/fields/options
// are reused when present, and existing cards are matched by exact question
// name. A card whose answer or metadata changed in the markdown is UPDATED in
// place (SR state and attempts untouched), so this file — not the app — is the
// source of truth for answers.
import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile('.env.local');

const DOMAIN = {
  slug: 'aws',
  name: 'AWS',
  short_name: 'AWS',
  study_mode: 'flashcard',
  icon: 'globe',
  color: 'amber',
  item_label: 'Question',
  log_label: 'Log Question',
  log_title: 'Log AWS Question',
  empty_message: 'No questions yet. Log your first to get started.',
  answer_placeholder: 'Write the answer… (markdown supported)',
  default_link: 'https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials/8D79F3AVR7?parentId=1J2VTQSGU2',
};

const CERT_FIELD = { key: 'aws_cert', label: 'Certification', tag_role: 'primary', sort_order: 0 };
const TOPIC_FIELD = { key: 'topic', label: 'Topic', tag_role: 'secondary', sort_order: 1 };

// The three buckets, in study order.
const CERTIFICATIONS = ['Cloud Practitioner', 'AI Practitioner', 'Developer Associate'];

// Known sub-topics, seeded up-front so the filters read in course order even
// before every module has cards. Topics found in the markdown but missing here
// are appended in first-seen order.
const TOPICS = [
  // Cloud Practitioner Essentials (CLF-C02), modules 1–13.
  'Introduction to the Cloud',
  'Compute in the Cloud',
  'Exploring Compute Services',
  'Going Global',
  'Networking',
  'Storage',
  'Databases',
  'AI ML and Data Analytics',
  'Security',
  'Monitoring, Compliance and Governance',
  'Pricing and Support',
  'Migrating to the AWS Cloud',
  'Well-Architected Solutions',
];

function easternNow(offsetSeconds = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(Date.now() + offsetSeconds * 1000));
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// A new card is scheduled one day out — level 0's interval in lib/sr.ts — so it
// joins the Review Queue tomorrow with zero attempts. Never write a synthetic
// first attempt to get it there: that would inflate computeStreak and hide the
// card from the 'unattempted' Resume preset.
function easternTomorrow() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })
    .format(new Date(Date.now() + 86_400_000));
}

// ── Parse scripts/aws-cards.md ──────────────────────────────────────────────
const lines = readFileSync('scripts/aws-cards.md', 'utf8').split('\n');

const cards = [];        // { cert, topic, q, a }
const seenTopics = [];   // first-seen order, for options not in TOPICS
let currentCert = null;
let currentTopic = null;
let inFence = false;
let mode = null;         // 'q' | 'a' | null
let qBuf = '';
let aBuf = [];

function flushCard() {
  if (mode === 'a' && currentCert && currentTopic && qBuf) {
    cards.push({
      cert: currentCert,
      topic: currentTopic,
      q: qBuf.trim(),
      a: aBuf.join('\n').replace(/\s+$/, ''),
    });
  }
  qBuf = '';
  aBuf = [];
  mode = null;
}

for (const line of lines) {
  // Header prose in this file uses a fenced code block; never treat it as card text.
  if (/^```/.test(line.trim())) { inFence = !inFence; if (mode === 'a') aBuf.push(line); continue; }
  if (inFence) { if (mode === 'a') aBuf.push(line); continue; }

  const certMatch = line.match(/^##\s+(?!#)(.+)$/);
  if (certMatch) {
    flushCard();
    currentCert = certMatch[1].trim();
    currentTopic = null;
    continue;
  }
  const topicMatch = line.match(/^###\s+(.+)$/);
  if (topicMatch) {
    flushCard();
    currentTopic = topicMatch[1].trim();
    if (!seenTopics.includes(currentTopic)) seenTopics.push(currentTopic);
    continue;
  }
  // "---" section divider — a separator, not part of the answer body.
  if (/^-{3,}$/.test(line.trim())) { flushCard(); continue; }

  const qMatch = line.match(/^\*\*Q:\*\*\s*(.*)$/);
  if (qMatch) {
    flushCard();
    mode = 'q';
    qBuf = qMatch[1];
    continue;
  }
  const aMatch = line.match(/^\*\*A:\*\*\s*(.*)$/);
  if (aMatch && mode === 'q') {
    mode = 'a';
    aBuf.push(aMatch[1]);
    continue;
  }
  if (mode === 'a') aBuf.push(line);
}
flushCard();

const unknownCerts = [...new Set(cards.map(c => c.cert))].filter(c => !CERTIFICATIONS.includes(c));
if (unknownCerts.length) {
  throw new Error(`Unknown certification heading(s): ${unknownCerts.join(', ')}. Expected one of: ${CERTIFICATIONS.join(', ')}`);
}

console.log(`Parsed ${cards.length} cards across ${new Set(cards.map(c => c.topic)).size} topics.`);
if (cards.length === 0) throw new Error('Parsed 0 cards — check aws-cards.md formatting.');

// ── DB setup ────────────────────────────────────────────────────────────────
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

let domain = (await db.execute({
  sql: 'SELECT * FROM study_domains WHERE lower(slug) = lower(?)', args: [DOMAIN.slug],
})).rows[0];

if (!domain) {
  const max = (await db.execute('SELECT MAX(sort_order) AS value FROM study_domains')).rows[0].value;
  const id = `dom_${crypto.randomUUID()}`;
  domain = (await db.execute({
    sql: `INSERT INTO study_domains
      (id, slug, name, short_name, study_mode, icon, color, sort_order, item_label,
       log_label, log_title, empty_message, answer_placeholder, default_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      id, DOMAIN.slug, DOMAIN.name, DOMAIN.short_name, DOMAIN.study_mode, DOMAIN.icon, DOMAIN.color,
      (max ?? -1) + 1, DOMAIN.item_label, DOMAIN.log_label, DOMAIN.log_title,
      DOMAIN.empty_message, DOMAIN.answer_placeholder, DOMAIN.default_link,
    ],
  })).rows[0];
  console.log(`Created domain "${DOMAIN.name}" (${id}).`);
} else {
  console.log(`Reusing existing domain "${domain.name}" (${domain.id}).`);
  if (domain.default_link !== DOMAIN.default_link) {
    await db.execute({
      sql: 'UPDATE study_domains SET default_link = ? WHERE id = ?',
      args: [DOMAIN.default_link, domain.id],
    });
    domain.default_link = DOMAIN.default_link;
    console.log(`  ~ Updated default_link.`);
  }
}

async function ensureField({ key, label, tag_role, sort_order }) {
  const existing = (await db.execute({
    sql: 'SELECT * FROM domain_fields WHERE domain_id = ? AND key = ?', args: [domain.id, key],
  })).rows[0];
  if (existing) {
    console.log(`Reusing existing field "${label}" (${existing.id}).`);
    return existing;
  }
  const field = (await db.execute({
    sql: `INSERT INTO domain_fields (domain_id, key, label, kind, placeholder, filterable, tag_role, sort_order)
          VALUES (?, ?, ?, 'select', '', 1, ?, ?) RETURNING *`,
    args: [domain.id, key, label, tag_role, sort_order],
  })).rows[0];
  console.log(`Created field "${label}" (${field.id}).`);
  return field;
}

async function ensureOptions(field, values) {
  const existing = (await db.execute({
    sql: 'SELECT value FROM domain_field_options WHERE field_id = ?', args: [field.id],
  })).rows.map(r => r.value);
  let nextSort = (await db.execute({
    sql: 'SELECT MAX(sort_order) AS value FROM domain_field_options WHERE field_id = ?', args: [field.id],
  })).rows[0].value;
  nextSort = (nextSort ?? -1) + 1;
  for (const value of values) {
    if (existing.includes(value)) continue;
    await db.execute({
      sql: 'INSERT INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?)',
      args: [field.id, value, nextSort++],
    });
    console.log(`  + ${field.label} option: ${value}`);
  }
}

const certField = await ensureField(CERT_FIELD);
const topicField = await ensureField(TOPIC_FIELD);

await ensureOptions(certField, CERTIFICATIONS);
await ensureOptions(topicField, [...TOPICS, ...seenTopics.filter(t => !TOPICS.includes(t))]);

// ── Insert new cards, refresh changed ones ──────────────────────────────────
// New cards go in with ZERO attempts, at level 0 and due tomorrow, so they
// reach the Review Queue on their own the next day.
const existing = new Map((await db.execute({
  sql: 'SELECT id, name, notes_text, metadata_json FROM problems WHERE domain = ?', args: [domain.id],
})).rows.map(r => [r.name, r]));

let inserted = 0, updated = 0, unchanged = 0;
for (const { cert, topic, q, a } of cards) {
  const metadata = JSON.stringify({ [CERT_FIELD.key]: cert, [TOPIC_FIELD.key]: topic });
  const current = existing.get(q);

  if (current) {
    if (current.notes_text === a && current.metadata_json === metadata) { unchanged++; continue; }
    await db.execute({
      sql: 'UPDATE problems SET notes_text = ?, metadata_json = ? WHERE id = ?',
      args: [a, metadata, current.id],
    });
    console.log(`  ~ Updated: ${q}`);
    updated++;
    continue;
  }

  const createdAt = easternNow(inserted); // file order, one second apart
  await db.execute({
    sql: `INSERT INTO problems (name, domain, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, 0, ?, ?)`,
    args: [q, domain.id, a, metadata, easternTomorrow(), createdAt],
  });
  inserted++;
}

// ── Warn about cards in the DB with no matching question in the markdown ───
// Matching is by exact question text, so editing a Q (not just its A) makes
// this script insert a new card rather than update the old one — the old
// question text is now "orphaned": still in the DB, no longer in the file.
const parsedNames = new Set(cards.map(c => c.q));
const orphans = [...existing.keys()].filter(name => !parsedNames.has(name));
if (orphans.length) {
  console.log(`\n⚠ ${orphans.length} card(s) in the DB have no matching question in aws-cards.md`
    + ` (likely a Q was reworded, not just its A — the old row is now stale):`);
  for (const name of orphans) console.log(`  - [id ${existing.get(name).id}] ${name}`);
  console.log('  Delete the stale row (and its attempts/links) once you confirm it was a rename, not intentional.');
}

// ── Attach the course link to any card missing it ──────────────────────────
const allProblemIds = (await db.execute({
  sql: 'SELECT id FROM problems WHERE domain = ?', args: [domain.id],
})).rows.map(r => r.id);

let linked = 0;
for (const id of allProblemIds) {
  const has = (await db.execute({
    sql: 'SELECT 1 FROM links WHERE problem_id = ? AND url = ?', args: [id, DOMAIN.default_link],
  })).rows[0];
  if (has) continue;
  await db.execute({
    sql: 'INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?)',
    args: [id, DOMAIN.default_link, 'AWS Cloud Practitioner Essentials'],
  });
  linked++;
}
if (linked) console.log(`Attached course link to ${linked} card(s).`);

console.log(`\nDone. Inserted ${inserted}, updated ${updated}, unchanged ${unchanged}, of ${cards.length} parsed.`);
