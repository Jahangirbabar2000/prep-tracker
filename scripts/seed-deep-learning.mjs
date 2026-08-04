// One-off seed: creates a "Deep Learning" custom domain and seeds it with the
// exam-prep flashcards in scripts/deep-learning-cards.md, parsed from the
// "## N. Topic Name" / "**Q:** ... **A:** ..." markdown structure.
//
// Cards are inserted with ZERO attempts (interval_level 0, next_due_date NULL
// — "New") — by design they never appear in the main Review Queue, so this
// stays fully separate from SDE prep. Study them from the Deep Learning
// domain page; marking one struggled schedules its own repeat. Archive the
// domain after the exam to remove it in one action.
//
//   node scripts/seed-deep-learning.mjs
//
// Safe to re-run: domain/field/options are reused if they already exist;
// problems are skipped by exact question-name match.
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
  slug: 'deep-learning',
  name: 'Deep Learning',
  short_name: 'DL',
  study_mode: 'flashcard',
  icon: 'graduation-cap',
  color: 'cyan',
  item_label: 'Question',
  log_label: 'Log Question',
  log_title: 'Log Deep Learning Question',
  empty_message: 'No questions yet. Log your first to get started.',
  answer_placeholder: 'Write the answer… (markdown supported)',
  default_link: '',
};
const FIELD_KEY = 'topic';
const FIELD_LABEL = 'Topic';

function easternNow(offsetSeconds = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(Date.now() + offsetSeconds * 1000));
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// ── Parse scripts/deep-learning-cards.md ────────────────────────────────────
const raw = readFileSync('scripts/deep-learning-cards.md', 'utf8');
const lines = raw.split('\n');

const topics = [];      // ordered topic names, first-seen order
const cards = [];       // { topic, q, a }
let currentTopic = null;
let mode = null;        // 'q' | 'a' | null
let qBuf = '';
let aBuf = [];

function flushCard() {
  if (mode === 'a' && currentTopic && qBuf) {
    const answer = aBuf.join('\n').replace(/\s+$/, '');
    cards.push({ topic: currentTopic, q: qBuf.trim(), a: answer });
  }
  qBuf = '';
  aBuf = [];
  mode = null;
}

for (const line of lines) {
  const topicMatch = line.match(/^##\s+\d+\.\s+(.+)$/);
  if (topicMatch) {
    flushCard();
    currentTopic = topicMatch[1].trim();
    if (!topics.includes(currentTopic)) topics.push(currentTopic);
    continue;
  }
  if (/^###\s+—\s*From the books\s*—/.test(line)) continue; // subheading only, same topic

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
  if (mode === 'a') {
    aBuf.push(line);
  }
}
flushCard();

console.log(`Parsed ${cards.length} cards across ${topics.length} topics.`);
if (cards.length === 0) throw new Error('Parsed 0 cards — check deep-learning-cards.md formatting.');

// ── DB setup ─────────────────────────────────────────────────────────────
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
}

let field = (await db.execute({
  sql: 'SELECT * FROM domain_fields WHERE domain_id = ? AND key = ?', args: [domain.id, FIELD_KEY],
})).rows[0];

if (!field) {
  field = (await db.execute({
    sql: `INSERT INTO domain_fields (domain_id, key, label, kind, placeholder, filterable, tag_role, sort_order)
          VALUES (?, ?, ?, 'select', '', 1, 'primary', 0) RETURNING *`,
    args: [domain.id, FIELD_KEY, FIELD_LABEL],
  })).rows[0];
  console.log(`Created field "${FIELD_LABEL}" (${field.id}).`);
} else {
  console.log(`Reusing existing field "${FIELD_LABEL}" (${field.id}).`);
}

const existingOptions = (await db.execute({
  sql: 'SELECT value FROM domain_field_options WHERE field_id = ? AND archived_at IS NULL', args: [field.id],
})).rows.map(r => r.value);

let nextSort = (await db.execute({
  sql: 'SELECT MAX(sort_order) AS value FROM domain_field_options WHERE field_id = ?', args: [field.id],
})).rows[0].value;
nextSort = (nextSort ?? -1) + 1;

for (const topic of topics) {
  if (existingOptions.includes(topic)) continue;
  await db.execute({
    sql: `INSERT INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?)`,
    args: [field.id, topic, nextSort++],
  });
  console.log(`  + Topic option: ${topic}`);
}

// ── Insert cards (New — zero attempts, never queued) ────────────────────
const existingNames = new Set((await db.execute({
  sql: 'SELECT name FROM problems WHERE domain = ?', args: [domain.id],
})).rows.map(r => r.name));

let inserted = 0, skipped = 0;
for (let i = 0; i < cards.length; i++) {
  const { topic, q, a } = cards[i];
  if (existingNames.has(q)) { skipped++; continue; }

  const createdAt = easternNow(-i * 30); // first card newest → reads top-to-bottom
  const metadata = JSON.stringify({ [FIELD_KEY]: topic });
  await db.execute({
    sql: `INSERT INTO problems (name, domain, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, 0, NULL, ?)`,
    args: [q, domain.id, a, metadata, createdAt],
  });
  inserted++;
}

console.log(`\nDone. Inserted ${inserted} cards, skipped ${skipped} (already present), of ${cards.length} parsed.`);
console.log(`All cards are "New" (0 attempts) — none appear in the Review Queue until you study them.`);
