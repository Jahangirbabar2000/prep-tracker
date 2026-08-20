// Incremental seed for the existing "lld" domain: inserts the flashcards in
// scripts/lld-cards.md, parsed from the "## Topic" / "Bucket: <bucket>" /
// "Link: <url>" / "**Q:** … **A:** …" markdown structure.
//
//   node scripts/seed-lld.mjs         # parse and write
//   node scripts/seed-lld.mjs --dry   # parse and report, touch nothing
//
// Same contract as scripts/seed-system-design.mjs — read that header first;
// only the difference is documented here.
//
// A TOPIC NAME IS NOT UNIQUE IN THIS DECK. "Introduction" is a topic under both
// the "In a Hurry" and "Concurrency" buckets, so the parser cannot key sections
// by their heading text the way the system-design one does. Instead each "## "
// opens a new section object and cards attach to whichever section is currently
// open, which makes repeated topic names harmless.
//
// A card may add an "Anchor: <slug>" line between its Q and its A to deep-link
// into the section's article (the slugs are the article's own headings), so the
// card's link lands on the paragraph it came from instead of the page top.
//
// New cards go in with ZERO attempts, interval_level 0, and next_due_date set
// to TOMORROW — level 0's interval in lib/sr.ts. That is what puts a card you
// add today into the Review Queue tomorrow, which admits on the due date alone.
// Do NOT fake a first attempt to get it there: a synthetic "got it" inflates
// computeStreak and, because the Resume preset is scope 'unattempted' (strictly
// zero attempts), hides the card from the surface built for never-studied cards.
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
const DOMAIN_ID = 'lld';
const CARDS_FILE = 'scripts/lld-cards.md';
const BUCKET_FIELD = { key: 'lld_category', label: 'Bucket' };
const TOPIC_FIELD = { key: 'lld_topic', label: 'Topic' };

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

// ── Parse scripts/behavioral-cards.md ───────────────────────────────────────
const lines = readFileSync(CARDS_FILE, 'utf8').split('\n');

const cards = [];          // { topic, bucket, link, q, a }
const sections = [];       // file order; a topic name may repeat across buckets
const seenTopics = [];     // first-seen order, for options not yet in the DB
const seenBuckets = [];
let section = null;        // the section currently open
let inFence = false;
let mode = null;           // 'q' | 'a' | null
let qBuf = '';
let aBuf = [];
let anchorBuf = null;      // per-card "Anchor:" slug, deep-links into the article

function flushCard() {
  if (mode === 'a' && section && qBuf) {
    const article = section.link;
    cards.push({
      topic: section.topic,
      bucket: section.bucket,
      article,
      link: article && anchorBuf ? `${article}#${anchorBuf}` : article,
      q: qBuf.trim(),
      // Trim both ends: "**A:**" followed by a bulleted list otherwise leaves
      // leading blank lines in the stored answer.
      a: aBuf.join('\n').trim(),
    });
  }
  qBuf = '';
  aBuf = [];
  anchorBuf = null;
  mode = null;
}

for (const line of lines) {
  // Header prose in this file uses a fenced code block; never treat it as card text.
  if (/^```/.test(line.trim())) { inFence = !inFence; if (mode === 'a') aBuf.push(line); continue; }
  if (inFence) { if (mode === 'a') aBuf.push(line); continue; }

  const topicMatch = line.match(/^##\s+(?!#)(.+)$/);
  if (topicMatch) {
    flushCard();
    const topic = topicMatch[1].trim();
    // The "Card style" prose section is documentation, not a card topic.
    if (/^card style/i.test(topic)) { section = null; continue; }
    section = { topic, bucket: null, link: null };
    sections.push(section);
    if (!seenTopics.includes(topic)) seenTopics.push(topic);
    continue;
  }
  // "Bucket:" declares the lld_category every card in this section belongs to.
  const bucketMatch = line.match(/^Bucket:\s*(.+?)\s*$/);
  if (bucketMatch && mode !== 'a' && section) {
    section.bucket = bucketMatch[1];
    if (!seenBuckets.includes(section.bucket)) seenBuckets.push(section.bucket);
    continue;
  }
  // "Link:" declares the source article for every card in the current section.
  const linkMatch = line.match(/^Link:\s*(\S+)\s*$/);
  if (linkMatch && mode !== 'a' && section) {
    section.link = linkMatch[1];
    continue;
  }
  // Unlike behavioral-cards.md, "---" is NOT a card separator here: several
  // answers use a horizontal rule to split an definition from its numbered
  // steps, and swallowing those would silently truncate the card. Cards are
  // delimited by the next "**Q:**" or "## " instead, which is unambiguous.
  if (/^-{3,}$/.test(line.trim()) && mode !== 'a') { flushCard(); continue; }

  const qMatch = line.match(/^\*\*Q:\*\*\s*(.*)$/);
  if (qMatch) {
    flushCard();
    mode = 'q';
    qBuf = qMatch[1];
    continue;
  }
  // "Anchor:" deep-links this one card into its section's article.
  const anchorMatch = line.match(/^Anchor:\s*#?([\w-]+)\s*$/);
  if (anchorMatch && mode === 'q') { anchorBuf = anchorMatch[1]; continue; }

  const aMatch = line.match(/^\*\*A:\*\*\s*(.*)$/);
  if (aMatch && mode === 'q') {
    mode = 'a';
    aBuf.push(aMatch[1]);
    continue;
  }
  if (mode === 'a') aBuf.push(line);
}
flushCard();

console.log(`Parsed ${cards.length} cards across ${sections.length} section(s): `
  + sections.map(s => `${s.bucket}/${s.topic}`).join(', '));
if (cards.length === 0) throw new Error(`Parsed 0 cards — check ${CARDS_FILE} formatting.`);

const unlinked = sections.filter(s => !s.link);
if (unlinked.length) throw new Error(`Section with no "Link:" line: ${unlinked.map(s => s.topic).join(', ')}`);
const unbucketed = sections.filter(s => !s.bucket);
if (unbucketed.length) throw new Error(`Section with no "Bucket:" line: ${unbucketed.map(s => s.topic).join(', ')}`);

const tooLong = cards.filter(c => c.a.length > 550);
if (tooLong.length) {
  console.log(`\n⚠ ${tooLong.length} answer(s) over 550 chars — house style says split, not one card:`);
  for (const c of tooLong) console.log(`  - ${c.a.length} chars: ${c.q}`);
}

if (DRY_RUN) {
  for (const c of cards) {
    console.log(`\n[${c.a.length} chars] ${c.bucket} / ${c.topic} — ${c.q}`);
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

// Adds missing options AND puts them in file order. The filter dropdowns render
// options by sort_order (orderFieldValues in lib/domains.ts), so section order
// here is what the Topic and Bucket dropdowns read in the app — which is why
// this file's sections follow the course. Options the file never mentions keep
// their relative order at the end rather than being dropped.
async function syncOptions(field, values) {
  const existing = (await db.execute({
    sql: 'SELECT id, value, sort_order FROM domain_field_options WHERE field_id = ? ORDER BY sort_order, id',
    args: [field.id],
  })).rows;
  const byValue = new Map(existing.map(row => [row.value, row]));

  for (const value of values) {
    if (byValue.has(value)) continue;
    const row = (await db.execute({
      sql: 'INSERT INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?) RETURNING id',
      args: [field.id, value, 0],
    })).rows[0];
    byValue.set(value, { id: row.id, value, sort_order: null });
    console.log(`  + ${field.label} option: ${value}`);
  }

  const trailing = existing.map(row => row.value).filter(value => !values.includes(value));
  let moved = 0;
  for (const [index, value] of [...values, ...trailing].entries()) {
    const row = byValue.get(value);
    if (Number(row.sort_order) === index) continue;
    await db.execute({
      sql: 'UPDATE domain_field_options SET sort_order = ? WHERE id = ?', args: [index, row.id],
    });
    moved++;
  }
  if (moved) console.log(`  ~ Re-ordered ${moved} ${field.label} option(s) to file order.`);
}

const bucketField = await requireField(BUCKET_FIELD);
const topicField = await requireField(TOPIC_FIELD);

await syncOptions(bucketField, seenBuckets);
await syncOptions(topicField, seenTopics);

// ── Insert new cards, refresh changed ones ──────────────────────────────────
// Existing LLD rows carry BOTH metadata_json and the legacy lld_category /
// lld_topic columns, so write both and stay consistent.
const existing = new Map((await db.execute({
  sql: 'SELECT id, name, notes_text, metadata_json, lld_category, lld_topic FROM problems WHERE domain = ?',
  args: [domain.id],
})).rows.map(r => [r.name, r]));

const cardIdByQuestion = new Map();
let inserted = 0, updated = 0, unchanged = 0;
for (const { bucket, topic, q, a } of cards) {
  const metadata = JSON.stringify({ [BUCKET_FIELD.key]: bucket, [TOPIC_FIELD.key]: topic });
  const current = existing.get(q);

  if (current) {
    cardIdByQuestion.set(q, current.id);
    if (current.notes_text === a && current.metadata_json === metadata) { unchanged++; continue; }
    await db.execute({
      sql: `UPDATE problems SET notes_text = ?, metadata_json = ?, lld_category = ?, lld_topic = ?
            WHERE id = ?`,
      args: [a, metadata, bucket, topic, current.id],
    });
    console.log(`  ~ Updated: ${q}`);
    updated++;
    continue;
  }

  const createdAt = easternNow(inserted); // file order, one second apart
  const row = (await db.execute({
    sql: `INSERT INTO problems
            (name, domain, notes_text, metadata_json, lld_category, lld_topic,
             interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?) RETURNING id`,
    args: [q, domain.id, a, metadata, bucket, topic, easternTomorrow(), createdAt],
  })).rows[0];
  cardIdByQuestion.set(q, row.id);
  inserted++;
}

// ── Attach each section's article link, labelled with the card's question ───
let linked = 0;
let relinked = 0;
for (const { q, link, article } of cards) {
  const id = cardIdByQuestion.get(q);
  if (!id || !link) continue;
  const rows = (await db.execute({
    sql: 'SELECT id, url FROM links WHERE problem_id = ?', args: [id],
  })).rows;
  if (rows.some(row => row.url === link)) continue;
  // Same article, different URL — the card gained or changed its anchor, so
  // move the existing row rather than leaving the card with two links to the
  // same page.
  const stale = rows.find(row => String(row.url).split('#')[0] === article);
  if (stale) {
    await db.execute({ sql: 'UPDATE links SET url = ? WHERE id = ?', args: [link, stale.id] });
    relinked++;
    continue;
  }
  await db.execute({
    sql: 'INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?)',
    args: [id, link, q],
  });
  linked++;
}
if (linked) console.log(`Attached article link to ${linked} card(s).`);
if (relinked) console.log(`Re-pointed ${relinked} card link(s) at a section anchor.`);

// ── Warn about cards in the DB with no matching question in the markdown ───
// Matching is by exact question text, so editing a Q (not just its A) makes
// this script insert a new card rather than update the old one — the old
// question text is now "orphaned": still in the DB, no longer in the file.
// Scoped to the topics this file covers, so a not-yet-back-filled topic is not
// reported as an orphan on every run.
const parsedNames = new Set(cards.map(c => c.q));
const orphans = [...existing.values()].filter(row =>
  seenTopics.includes(row.lld_topic) && !parsedNames.has(row.name),
);
if (orphans.length) {
  console.log(`\n⚠ ${orphans.length} card(s) in the covered topics have no matching question`
    + ` in ${CARDS_FILE} (likely a Q was reworded, not just its A — the old row is now stale):`);
  for (const row of orphans) console.log(`  - [id ${row.id}] ${row.name}`);
  console.log('  Delete the stale row (and its attempts/links) once you confirm it was a rename.');
}

console.log(`\nDone. Inserted ${inserted}, updated ${updated}, unchanged ${unchanged}, of ${cards.length} parsed.`);
