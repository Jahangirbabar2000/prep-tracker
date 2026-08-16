// One-off fix (applied 2026-08-14): applies a full content-quality pass over
// the Deep Learning cards — converting plain-ASCII/unicode pseudo-math into
// real LaTeX (rendered via remark-math/rehype-katex) and splitting dense
// multi-point answers into proper markdown paragraphs/lists. Reformatting
// only — no technical content or meaning was changed.
//
// Reads the reviewed diff produced alongside this script and writes matching
// `name`/`notes_text` updates to the live DB by exact row id.
//
//   node scripts/apply-deep-learning-review.mjs <path-to-fixed.json>        # dry run
//   node scripts/apply-deep-learning-review.mjs <path-to-fixed.json> --apply
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

const jsonPath = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!jsonPath) throw new Error('Usage: node apply-deep-learning-review.mjs <fixed.json> [--apply]');

const fixes = JSON.parse(readFileSync(jsonPath, 'utf8'));
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const domain = (await db.execute({
  sql: "SELECT id FROM study_domains WHERE lower(slug) = 'deep-learning'",
})).rows[0];
if (!domain) throw new Error('Deep Learning domain not found.');

let changed = 0;
for (const fix of fixes) {
  const row = (await db.execute({
    sql: 'SELECT id, name, notes_text FROM problems WHERE id = ? AND domain = ?',
    args: [fix.id, domain.id],
  })).rows[0];
  if (!row) { console.log(`SKIP #${fix.id} — not found in domain`); continue; }

  const newName = fix.name ?? row.name;
  const newNotes = fix.notes_text ?? row.notes_text;
  if (newName === row.name && newNotes === row.notes_text) continue;

  changed++;
  console.log(`#${row.id} ${row.name.slice(0, 60)}`);
  if (APPLY) {
    await db.execute({
      sql: 'UPDATE problems SET name = ?, notes_text = ? WHERE id = ?',
      args: [newName, newNotes, row.id],
    });
  }
}

console.log(`\n${APPLY ? 'Applied' : 'Would apply'} changes to ${changed} of ${fixes.length} listed cards.`);
if (!APPLY && changed > 0) console.log('Re-run with --apply to write these changes.');
