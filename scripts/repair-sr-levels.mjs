// One-time repair: recompute every problem's interval_level + next_due_date by
// replaying its attempts from level 0 (the pure function now used on all writes,
// lib/sr.ts replaySchedule). Fixes rows whose level drifted because an older
// attempt was edited/deleted or logged out of date order.
//
//   node scripts/repair-sr-levels.mjs          # apply
//   node scripts/repair-sr-levels.mjs --dry     # report only, no writes
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile('.env.local');

const DRY = process.argv.includes('--dry');
// Must stay in sync with lib/sr.ts — levels 0-4, Mastered capped at 60 days.
const INTERVALS = [3, 7, 14, 30, 60];
const MAX_LEVEL = INTERVALS.length - 1;

// Mirror of lib/sr.ts replaySchedule.
function replaySchedule(attempts) {
  const ordered = [...attempts].sort((a, b) =>
    a.attempted_at < b.attempted_at ? -1 : a.attempted_at > b.attempted_at ? 1 : a.id - b.id);
  let level = 0, nextDueDate = null;
  for (const a of ordered) {
    level = a.struggled ? Math.max(0, level - 1) : Math.min(level + 1, MAX_LEVEL);
    const d = new Date(String(a.attempted_at).slice(0, 10) + 'T12:00:00');
    d.setDate(d.getDate() + INTERVALS[level]);
    nextDueDate = d.toLocaleDateString('en-CA');
  }
  return { level, nextDueDate };
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const problems = (await db.execute('SELECT id, name, domain, interval_level, next_due_date FROM problems')).rows;
const attempts = (await db.execute('SELECT id, problem_id, attempted_at, struggled FROM attempts')).rows;
const byProblem = new Map();
for (const a of attempts) {
  if (!byProblem.has(a.problem_id)) byProblem.set(a.problem_id, []);
  byProblem.get(a.problem_id).push(a);
}

let changed = 0;
for (const p of problems) {
  const atts = byProblem.get(p.id) || [];
  const { level, nextDueDate } = atts.length ? replaySchedule(atts) : { level: 0, nextDueDate: null };
  if (level === p.interval_level && (nextDueDate ?? null) === (p.next_due_date ?? null)) continue;

  changed++;
  console.log(`  #${p.id} ${p.domain} "${p.name.slice(0, 44)}"  lvl ${p.interval_level}->${level}  due ${p.next_due_date}->${nextDueDate}`);
  if (!DRY) {
    await db.execute({
      sql: 'UPDATE problems SET interval_level = ?, next_due_date = ? WHERE id = ?',
      args: [level, nextDueDate, p.id],
    });
  }
}

console.log(`\n${DRY ? '[dry run] ' : ''}${changed} problem(s) ${DRY ? 'would change' : 'repaired'} of ${problems.length}.`);
