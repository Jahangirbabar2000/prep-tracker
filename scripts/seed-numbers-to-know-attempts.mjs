// One-off: give each "Numbers to Know" System Design card a first attempt today,
// marked struggled — mirroring the app's attempt endpoint (lib/sr.ts):
// a struggled rep from level 0 stays at level 0 and schedules the next review
// in 3 days, so the card becomes "Struggling".
//
//   node scripts/seed-numbers-to-know-attempts.mjs
//
// Safe to re-run: only cards that currently have zero attempts get one.
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

const DOMAIN = 'system_design';
const TOPIC = 'Numbers to Know';
const INTERVALS = [3, 7, 14, 30]; // lib/sr.ts

// "YYYY-MM-DD" today in Eastern (matches lib/db.ts localToday()).
function easternToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}
// "YYYY-MM-DD HH:MM:SS" now in Eastern (matches lib/db.ts localNow()).
function easternNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
// date string N days after a YYYY-MM-DD (UTC-safe, tz-independent).
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const cards = (await db.execute({
  sql: `SELECT id, name, interval_level FROM problems WHERE domain = ? AND sd_topic = ? ORDER BY id`,
  args: [DOMAIN, TOPIC],
})).rows;

const attemptedAt = easternNow();
const struggledLevel = Math.max(0, 0 - 1);          // struggled from level 0 → 0
const nextDue = addDays(easternToday(), INTERVALS[struggledLevel]); // today + 3

let added = 0, skipped = 0;
for (const card of cards) {
  const count = (await db.execute({
    sql: `SELECT COUNT(*) c FROM attempts WHERE problem_id = ?`, args: [card.id],
  })).rows[0].c;
  if (Number(count) > 0) { skipped++; console.log(`  skip (has attempts): ${card.name}`); continue; }

  await db.execute({
    sql: `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled, practice_type)
          VALUES (?, ?, 0, 1, NULL)`,
    args: [card.id, attemptedAt],
  });
  await db.execute({
    sql: `UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?`,
    args: [struggledLevel, nextDue, card.id],
  });
  added++;
  console.log(`  attempt+struggled: ${card.name}`);
}

console.log(`\nDone. Added ${added} first attempts, skipped ${skipped}. Cards now "Struggling", next due ${nextDue}.`);
