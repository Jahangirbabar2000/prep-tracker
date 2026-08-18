// Incremental seed for the existing "behavioral" domain: inserts the flashcards
// in scripts/behavioral-cards.md, parsed from the
// "## Category" / "Link: <url>" / "**Q:** … **A:** …" markdown structure.
//
//   node scripts/seed-behavioral.mjs         # parse and write
//   node scripts/seed-behavioral.mjs --dry   # parse and report, touch nothing
//
// Unlike scripts/seed-aws.mjs this never creates the domain — `behavioral` and
// its two fields (Question List / Category) already exist, so a missing one is
// an error rather than something to build. Category values found in the file
// are appended to the Category field's options in file order.
//
// New cards go in with ZERO attempts (interval_level 0, next_due_date NULL —
// "New"), then immediately get a "got it" first attempt so they land in
// tomorrow's Review Queue rather than sitting invisibly until manually studied.
//
// Designed to be run again after every question you add: existing cards are
// matched by exact question name, and a card whose answer or metadata changed
// in the markdown is UPDATED in place (SR state and attempts untouched), so the
// markdown — not the app — is the source of truth for answers.
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

const DRY_RUN = process.argv.includes('--dry');
const DOMAIN_ID = 'behavioral';
const CARDS_FILE = 'scripts/behavioral-cards.md';
const LIST_FIELD = { key: 'question_list', label: 'Question List' };
const CATEGORY_FIELD = { key: 'beh_category', label: 'Category' };
// Every card in this deck comes from the same course.
const QUESTION_LIST = 'Hello Interview Course';

function easternNow(offsetSeconds = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(Date.now() + offsetSeconds * 1000));
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
// "YYYY-MM-DD" today in Eastern (matches lib/db.ts localToday()).
function easternToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

// ── Parse scripts/behavioral-cards.md ───────────────────────────────────────
const lines = readFileSync(CARDS_FILE, 'utf8').split('\n');

const cards = [];          // { category, link, q, a }
const seenCategories = []; // first-seen order, for options not yet in the DB
const linkByCategory = new Map();
let currentCategory = null;
let inFence = false;
let mode = null;           // 'q' | 'a' | null
let qBuf = '';
let aBuf = [];

function flushCard() {
  if (mode === 'a' && currentCategory && qBuf) {
    cards.push({
      category: currentCategory,
      link: linkByCategory.get(currentCategory) ?? null,
      q: qBuf.trim(),
      // Trim both ends: "**A:**" followed by a bulleted list otherwise leaves
      // leading blank lines in the stored answer.
      a: aBuf.join('\n').trim(),
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

  const categoryMatch = line.match(/^##\s+(?!#)(.+)$/);
  if (categoryMatch) {
    flushCard();
    currentCategory = categoryMatch[1].trim();
    // The "Card style" prose section is documentation, not a card category.
    if (/^card style/i.test(currentCategory)) currentCategory = null;
    else if (!seenCategories.includes(currentCategory)) seenCategories.push(currentCategory);
    continue;
  }
  // "Link:" declares the source article for every card in the current section.
  const linkMatch = line.match(/^Link:\s*(\S+)\s*$/);
  if (linkMatch && mode !== 'a' && currentCategory) {
    linkByCategory.set(currentCategory, linkMatch[1]);
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

console.log(`Parsed ${cards.length} cards across ${seenCategories.length} category/categories: ${seenCategories.join(', ')}`);
if (cards.length === 0) throw new Error(`Parsed 0 cards — check ${CARDS_FILE} formatting.`);

const unlinked = seenCategories.filter(c => !linkByCategory.has(c));
if (unlinked.length) throw new Error(`Category with no "Link:" line: ${unlinked.join(', ')}`);

const tooLong = cards.filter(c => c.a.length > 550);
if (tooLong.length) {
  console.log(`\n⚠ ${tooLong.length} answer(s) over 550 chars — house style says split, not one card:`);
  for (const c of tooLong) console.log(`  - ${c.a.length} chars: ${c.q}`);
}

if (DRY_RUN) {
  for (const c of cards) {
    console.log(`\n[${c.a.length} chars] ${c.category} — ${c.q}`);
    console.log(`  link: ${c.link}`);
    console.log(c.a.split('\n').map(l => `  | ${l}`).join('\n'));
  }
  console.log(`\nDry run — nothing written. ${cards.length} card(s) parsed.`);
  process.exit(0);
}

// ── DB setup ────────────────────────────────────────────────────────────────
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const domain = (await db.execute({
  sql: 'SELECT * FROM study_domains WHERE id = ?', args: [DOMAIN_ID],
})).rows[0];
if (!domain) throw new Error(`Domain "${DOMAIN_ID}" not found — this script never creates it.`);
console.log(`Using domain "${domain.name}" (${domain.id}).`);

async function requireField({ key, label }) {
  const field = (await db.execute({
    sql: 'SELECT * FROM domain_fields WHERE domain_id = ? AND key = ?', args: [domain.id, key],
  })).rows[0];
  if (!field) throw new Error(`Field "${key}" missing on domain ${domain.id}.`);
  console.log(`Using field "${label}" (${field.id}).`);
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

const listField = await requireField(LIST_FIELD);
const categoryField = await requireField(CATEGORY_FIELD);

await ensureOptions(listField, [QUESTION_LIST]);
await ensureOptions(categoryField, seenCategories);

// ── Insert new cards, refresh changed ones ──────────────────────────────────
// Existing behavioral rows carry BOTH metadata_json and the legacy
// beh_category / question_list columns, so write both and stay consistent.
const existing = new Map((await db.execute({
  sql: 'SELECT id, name, notes_text, metadata_json, beh_category FROM problems WHERE domain = ?',
  args: [domain.id],
})).rows.map(r => [r.name, r]));

const newIds = [];
const cardIdByQuestion = new Map();
let inserted = 0, updated = 0, unchanged = 0;
for (const { category, q, a } of cards) {
  const metadata = JSON.stringify({ [LIST_FIELD.key]: QUESTION_LIST, [CATEGORY_FIELD.key]: category });
  const current = existing.get(q);

  if (current) {
    cardIdByQuestion.set(q, current.id);
    if (current.notes_text === a && current.metadata_json === metadata) { unchanged++; continue; }
    await db.execute({
      sql: `UPDATE problems SET notes_text = ?, metadata_json = ?, beh_category = ?, question_list = ?
            WHERE id = ?`,
      args: [a, metadata, category, QUESTION_LIST, current.id],
    });
    console.log(`  ~ Updated: ${q}`);
    updated++;
    continue;
  }

  const createdAt = easternNow(inserted); // file order, one second apart
  const row = (await db.execute({
    sql: `INSERT INTO problems
            (name, domain, notes_text, metadata_json, beh_category, question_list,
             interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?) RETURNING id`,
    args: [q, domain.id, a, metadata, category, QUESTION_LIST, createdAt],
  })).rows[0];
  cardIdByQuestion.set(q, row.id);
  newIds.push(row.id);
  inserted++;
}

// ── First "got it" attempt for brand-new cards ──────────────────────────────
// Mirrors app/api/problems/[id]/attempts/route.ts + lib/sr.ts replaySchedule:
// a card's first attempt always lands at level 0 with next_due_date = +1 day,
// regardless of struggled/not, so this queues each new card for tomorrow
// without touching its "New" label (attempt_count 1).
if (newIds.length) {
  const attemptedAt = easternNow();
  const nextDue = (() => {
    const d = new Date(`${easternToday()}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  for (const id of newIds) {
    await db.execute({
      sql: `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
            VALUES (?, ?, 0, 0, NULL)`,
      args: [id, attemptedAt],
    });
    await db.execute({
      sql: 'UPDATE problems SET interval_level = 0, next_due_date = ? WHERE id = ?',
      args: [nextDue, id],
    });
  }
  console.log(`Queued ${newIds.length} new card(s) for review on ${nextDue}.`);
}

// ── Attach each section's article link, labelled with the card's question ───
let linked = 0;
for (const { q, link } of cards) {
  const id = cardIdByQuestion.get(q);
  if (!id || !link) continue;
  const has = (await db.execute({
    sql: 'SELECT 1 FROM links WHERE problem_id = ? AND url = ?', args: [id, link],
  })).rows[0];
  if (has) continue;
  await db.execute({
    sql: 'INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?)',
    args: [id, link, q],
  });
  linked++;
}
if (linked) console.log(`Attached article link to ${linked} card(s).`);

// ── Warn about cards in the DB with no matching question in the markdown ───
// Matching is by exact question text, so editing a Q (not just its A) makes
// this script insert a new card rather than update the old one — the old
// question text is now "orphaned": still in the DB, no longer in the file.
// Scoped to the categories this file covers, so the not-yet-back-filled
// sections of the deck are not reported as orphans on every run.
const parsedNames = new Set(cards.map(c => c.q));
const orphans = [...existing.values()].filter(row =>
  seenCategories.includes(row.beh_category) && !parsedNames.has(row.name),
);
if (orphans.length) {
  console.log(`\n⚠ ${orphans.length} card(s) in the covered categories have no matching question`
    + ` in ${CARDS_FILE} (likely a Q was reworded, not just its A — the old row is now stale):`);
  for (const row of orphans) console.log(`  - [id ${row.id}] ${row.name}`);
  console.log('  Delete the stale row (and its attempts/links) once you confirm it was a rename.');
}

console.log(`\nDone. Inserted ${inserted}, updated ${updated}, unchanged ${unchanged}, of ${cards.length} parsed.`);
