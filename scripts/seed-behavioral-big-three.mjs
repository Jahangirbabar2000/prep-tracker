// One-off seed: adds "The Big Three Questions" flashcards to the existing
// Behavioral domain, filed under the existing Category "The Big Three
// Questions" (reused, not a new option) and Question List "Hello Interview
// Course" (reused). Card content lives in
// scripts/behavioral-big-three-cards.md so markdown needs no escaping.
// Every card also gets a Link row pointing back to the source article
// (same URL for all — this is a single-page article, not per-heading).
//
// Each card gets one attempt (struggled) dated today. Under the current
// scheduler (lib/sr.ts) a problem's FIRST attempt always lands at level 0,
// due the next day — so these simply surface tomorrow for reinforcement.
//
//   node scripts/seed-behavioral-big-three.mjs
//
// Safe to re-run: skips any question that already exists in this domain.
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

const DOMAIN = 'behavioral';
const CATEGORY = 'The Big Three Questions'; // existing option — reused, not created
const QUESTION_LIST = 'Hello Interview Course'; // existing option — reused
const SOURCE_URL = 'https://www.hellointerview.com/learn/behavioral/course/preparing-for-the-big-three-questions';
const SOURCE_LABEL = 'The Big Three Questions · Hello Interview';

function easternNow(offsetSeconds = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(Date.now() + offsetSeconds * 1000));
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function easternToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

// ── Parse the markdown: **Q:** / **A:** pairs, ignoring the H1 title ──────
const raw = readFileSync('scripts/behavioral-big-three-cards.md', 'utf8');
const lines = raw.split('\n');
const cards = [];
let mode = null, qBuf = '', aBuf = [];

function flush() {
  if (mode === 'a' && qBuf) cards.push({ q: qBuf.trim(), a: aBuf.join('\n').replace(/\s+$/, '') });
  qBuf = ''; aBuf = []; mode = null;
}
for (const line of lines) {
  const qMatch = line.match(/^\*\*Q:\*\*\s*(.*)$/);
  if (qMatch) { flush(); mode = 'q'; qBuf = qMatch[1]; continue; }
  const aMatch = line.match(/^\*\*A:\*\*\s*(.*)$/);
  if (aMatch && mode === 'q') { mode = 'a'; aBuf.push(aMatch[1]); continue; }
  if (/^-{3,}\s*$/.test(line.trim()) && mode === 'a') { flush(); continue; } // "---" section divider, not part of the answer
  if (mode === 'a') aBuf.push(line);
}
flush();

console.log(`Parsed ${cards.length} cards.`);
if (cards.length === 0) throw new Error('Parsed 0 cards — check behavioral-big-three-cards.md formatting.');

// ── Insert ───────────────────────────────────────────────────────────────
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const existingNames = new Set((await db.execute({
  sql: 'SELECT name FROM problems WHERE domain = ?', args: [DOMAIN],
})).rows.map(r => r.name));

const nextDueDate = addDays(easternToday(), 1); // first attempt → level 0, due tomorrow
const attemptedAt = easternNow();

let inserted = 0, skipped = 0;
for (let i = 0; i < cards.length; i++) {
  const { q, a } = cards[i];
  if (existingNames.has(q)) { skipped++; continue; }

  const createdAt = easternNow(-i * 30); // first card newest → reads top-to-bottom
  const metadata = JSON.stringify({ question_list: QUESTION_LIST, beh_category: CATEGORY });
  const problem = (await db.execute({
    sql: `INSERT INTO problems (name, domain, beh_category, question_list, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?) RETURNING id`,
    args: [q, DOMAIN, CATEGORY, QUESTION_LIST, a, metadata, nextDueDate, createdAt],
  })).rows[0];

  await db.execute({
    sql: `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
          VALUES (?, ?, 0, 1, NULL)`,
    args: [problem.id, attemptedAt],
  });

  await db.execute({
    sql: `INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?)`,
    args: [problem.id, SOURCE_URL, SOURCE_LABEL],
  });

  inserted++;
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already present), of ${cards.length} parsed.`);
console.log(`Tagged Category="${CATEGORY}", Question List="${QUESTION_LIST}". Due ${nextDueDate}.`);
