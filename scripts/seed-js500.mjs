// Recurring seed: adds JS 500 flashcards to the existing Frontend domain,
// filed under fe_bucket="JavaScript" and fe_question_set="JS 500" (both
// already existed as options before this script's first run). Reads every
// scripts/js500-batch-*.md file (so future daily batches just need a new
// content file — same script, re-run).
//
// Card content is **Q:** / **A:** / **Link:** triples per scripts/js500-batch-01.md
// so markdown in the answer needs no escaping. The Link line becomes a Link
// row pointing back to the source explanation on GitHub.
//
// Each card gets one attempt (struggled) dated today. Under the current
// scheduler (lib/sr.ts) a problem's FIRST attempt always lands at level 0,
// due the next day — so these surface tomorrow for reinforcement, matching
// "I just read this, review it soon."
//
//   node scripts/seed-js500.mjs
//
// Safe to re-run: skips any question that already exists in this domain.
import { createClient } from '@libsql/client';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

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

const DOMAIN = 'frontend';
const BUCKET = 'JavaScript';       // existing fe_bucket option — reused, not created
const QUESTION_SET = 'JS 500';     // existing fe_question_set option — reused, not created

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

// ── Find and parse every batch file ────────────────────────────────────────
const batchFiles = readdirSync('scripts')
  .filter(f => /^js500-batch-\d+\.md$/.test(f))
  .sort();

if (batchFiles.length === 0) throw new Error('No scripts/js500-batch-*.md files found.');

const cards = [];
for (const file of batchFiles) {
  const raw = readFileSync(`scripts/${file}`, 'utf8');
  const lines = raw.split('\n');
  let mode = null, qBuf = '', aBuf = [], linkBuf = '';

  function flush() {
    if (mode && qBuf) cards.push({ q: qBuf.trim(), a: aBuf.join('\n').replace(/\s+$/, ''), link: linkBuf.trim(), file });
    qBuf = ''; aBuf = []; linkBuf = ''; mode = null;
  }
  for (const line of lines) {
    const qMatch = line.match(/^\*\*Q:\*\*\s*(.*)$/);
    if (qMatch) { flush(); mode = 'q'; qBuf = qMatch[1]; continue; }
    const aMatch = line.match(/^\*\*A:\*\*\s*(.*)$/);
    if (aMatch && mode === 'q') { mode = 'a'; aBuf.push(aMatch[1]); continue; }
    const linkMatch = line.match(/^\*\*Link:\*\*\s*(.*)$/);
    if (linkMatch && mode === 'a') { mode = 'link'; linkBuf = linkMatch[1]; continue; }
    if (mode === 'a') aBuf.push(line);
  }
  flush();
}

console.log(`Parsed ${cards.length} cards from ${batchFiles.length} batch file(s): ${batchFiles.join(', ')}`);
if (cards.length === 0) throw new Error('Parsed 0 cards — check js500-batch-*.md formatting.');

// ── Insert ───────────────────────────────────────────────────────────────
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const existingNames = new Set((await db.execute({
  sql: 'SELECT name FROM problems WHERE domain = ?', args: [DOMAIN],
})).rows.map(r => r.name));

const nextDueDate = addDays(easternToday(), 1); // first attempt → level 0, due tomorrow
const attemptedAt = easternNow();

let inserted = 0, skipped = 0;
for (let i = 0; i < cards.length; i++) {
  const { q, a, link } = cards[i];
  if (existingNames.has(q)) { skipped++; continue; }

  const createdAt = easternNow(-i * 30); // first card newest → reads top-to-bottom
  const metadata = JSON.stringify({ fe_bucket: BUCKET, fe_question_set: QUESTION_SET });
  const problem = (await db.execute({
    sql: `INSERT INTO problems (name, domain, fe_bucket, fe_question_set, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?) RETURNING id`,
    args: [q, DOMAIN, BUCKET, QUESTION_SET, a, metadata, nextDueDate, createdAt],
  })).rows[0];

  await db.execute({
    sql: `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
          VALUES (?, ?, 0, 1, NULL)`,
    args: [problem.id, attemptedAt],
  });

  if (link) {
    await db.execute({
      sql: `INSERT INTO links (problem_id, url, label) VALUES (?, ?, ?)`,
      args: [problem.id, link, 'Full explanation · sudheerj/javascript-interview-questions'],
    });
  }

  inserted++;
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already present), of ${cards.length} parsed.`);
console.log(`Tagged Bucket="${BUCKET}", Question Set="${QUESTION_SET}". Due ${nextDueDate}.`);
