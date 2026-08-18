// One-off repair: remove the synthetic "got it" attempts that seed-aws.mjs,
// seed-behavioral.mjs and the (now deleted) seed-sd-realtime-updates.mjs wrote
// to force freshly seeded cards into the Review Queue.
//
//   node scripts/strip-synthetic-seed-attempts.mjs          # dry run
//   node scripts/strip-synthetic-seed-attempts.mjs --apply
//
// Those attempts were a mistake: reviewQueue() deliberately holds only cards
// you have studied at least once, the Resume practice preset (scope
// 'unattempted') is the surface for never-studied cards, and a fake attempt
// both inflates computeStreak and hides the card from Resume. The seed scripts
// no longer write them; this undoes the ones already in the DB.
//
// Only cards whose ENTIRE history is a single zero-minute, not-struggled,
// practice_type-NULL attempt are touched, and only within the three known
// seeded sets. A card with a real study attempt on top is left alone: its
// progress is genuine and Resume is right to skip it.
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

const APPLY = process.argv.includes('--apply');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const awsDomain = (await db.execute("SELECT id FROM study_domains WHERE slug = 'aws'")).rows[0];
if (!awsDomain) throw new Error('No aws domain found.');

// The three seeded sets, each identified by how its seed script tagged the rows.
const SETS = [
  { label: 'System Design · Real-time Updates',
    where: `p.domain = 'system_design' AND p.sd_topic = 'Real-time Updates'`, args: [] },
  { label: 'AWS deck',
    where: `p.domain = ?`, args: [awsDomain.id] },
  { label: 'Behavioral · Hello Interview Course',
    where: `p.domain = 'behavioral' AND p.question_list = 'Hello Interview Course'`, args: [] },
];

let total = 0;
for (const set of SETS) {
  const rows = (await db.execute({
    sql: `SELECT p.id, p.name, a.id AS attempt_id
          FROM problems p JOIN attempts a ON a.problem_id = p.id
          WHERE ${set.where}
            AND (SELECT COUNT(*) FROM attempts x WHERE x.problem_id = p.id) = 1
            AND a.time_taken_mins = 0 AND a.struggled = 0 AND a.practice_type IS NULL
          ORDER BY p.created_at`,
    args: set.args,
  })).rows;

  console.log(`\n${set.label}: ${rows.length} synthetic attempt(s)`);
  for (const r of rows) {
    console.log(`  ${APPLY ? 'stripping' : 'would strip'}: ${String(r.name).slice(0, 62)}`);
    if (!APPLY) continue;
    await db.execute({ sql: 'DELETE FROM attempts WHERE id = ?', args: [r.attempt_id] });
    await db.execute({
      sql: 'UPDATE problems SET interval_level = 0, next_due_date = NULL WHERE id = ?',
      args: [r.id],
    });
  }
  total += rows.length;
}

console.log(`\n${APPLY ? 'Stripped' : 'Would strip'} ${total} synthetic attempt(s); those cards are now genuinely New.`);
if (!APPLY) console.log('Re-run with --apply to write.');
