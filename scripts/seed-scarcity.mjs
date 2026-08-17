// One-off seed: LLD "Scarcity" flashcards (Category Concurrency, Topic Scarcity).
// Card content lives in scripts/scarcity-cards.txt so markdown (code fences,
// backticks, quotes) needs no escaping. Each card also gets a struggled attempt
// dated today, so it reads as "Struggling" and resurfaces in the queue in 3 days.
//
//   node scripts/seed-scarcity.mjs
//
// Safe to re-run: cards whose question already exists are skipped.
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

const DOMAIN = 'lld';
const CATEGORY = 'Concurrency';
const TOPIC = 'Scarcity';
const INTERVALS = [3, 7, 14, 30]; // lib/sr.ts

function easternToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}
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

// Parse the data file into { q, a } records.
const raw = readFileSync('scripts/scarcity-cards.txt', 'utf8');
const cards = raw.split(/\n===END===\n/).map(chunk => chunk.trim()).filter(Boolean).map(chunk => {
  const sep = chunk.indexOf('\n===A===\n');
  const q = chunk.slice(0, sep).replace(/^Q:\s*/, '').trim();
  const a = chunk.slice(sep + '\n===A===\n'.length).trim();
  return { q, a };
});

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));

const struggledLevel = Math.max(0, 0 - 1);            // struggled from level 0 → 0
const nextDue = addDays(easternToday(), INTERVALS[struggledLevel]); // today + 3
const metadata = JSON.stringify({ lld_category: CATEGORY, lld_topic: TOPIC });

let inserted = 0, skipped = 0;
for (let i = 0; i < cards.length; i++) {
  const { q, a } = cards[i];
  if (existing.has(q)) { skipped++; console.log(`  skip (exists): ${q.slice(0, 60)}…`); continue; }

  // Ascending with i, matching id order (insertion order below) — see
  // scripts/seed-deep-learning.mjs for why a negative offset here is wrong.
  const createdAt = easternNow(i * 60);
  const problem = (await db.execute({
    sql: `INSERT INTO problems (name, domain, lld_category, lld_topic, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [q, DOMAIN, CATEGORY, TOPIC, a, metadata, struggledLevel, nextDue, createdAt],
  })).rows[0];

  await db.execute({
    sql: `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
          VALUES (?, ?, 0, 1, NULL)`,
    args: [problem.id, easternNow()],
  });
  inserted++;
  console.log(`  added: ${q.slice(0, 60)}…`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}, of ${cards.length}. Cards are "Struggling", next due ${nextDue}.`);
