// One-off fix (applied 2026-08-14): patches formatting bugs in already-seeded
// Deep Learning cards that seed-deep-learning.mjs's old parser introduced:
//
//   1. A stray trailing "---" (the source .md's topic-section divider) had
//      leaked into the last card's notes_text at the end of each topic
//      section, rendering as a spurious horizontal rule under the answer.
//   2. Several answers wrote enumerations inline ("(1) ... (2) ... (3) ...")
//      as one flowing paragraph instead of a real markdown list, so they
//      rendered as unbroken text even though rich-text formatting worked.
//
// The seed script's parser has since been fixed (see seed-deep-learning.mjs)
// so this won't recur for future cards. This script patches the rows that
// were already inserted before that fix. Idempotent — matching rows that no
// longer need a change are left alone.
//
//   node scripts/fix-deep-learning-formatting.mjs        # dry run (default)
//   node scripts/fix-deep-learning-formatting.mjs --apply
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

// Strip a leaked trailing "---" topic-section divider.
function stripTrailingDivider(text) {
  return text.replace(/\n+-{3,}\s*$/, '').trimEnd();
}

// Convert a sequential "(1) ... (2) ... (3) ..." inline enumeration into a
// real markdown ordered list, keeping any lead-in text as its own paragraph.
function convertEnumeration(text) {
  const re = /\((\d+)\)\s*/g;
  const matches = [...text.matchAll(re)];
  if (matches.length < 2) return null;
  const nums = matches.map(m => parseInt(m[1], 10));
  if (!nums.every((n, i) => n === i + 1)) return null;

  const prefix = text.slice(0, matches[0].index).trim();
  const items = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    items.push(text.slice(start, end).trim());
  }
  let out = '';
  if (prefix) out += prefix + '\n\n';
  out += items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  return out;
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const domain = (await db.execute({
  sql: "SELECT id FROM study_domains WHERE lower(slug) = 'deep-learning'",
})).rows[0];
if (!domain) throw new Error('Deep Learning domain not found — nothing to fix.');

const rows = (await db.execute({
  sql: 'SELECT id, name, notes_text FROM problems WHERE domain = ?', args: [domain.id],
})).rows;

let changed = 0;
for (const row of rows) {
  const stripped = stripTrailingDivider(row.notes_text);
  const enumResult = convertEnumeration(stripped);
  const final = enumResult ?? stripped;
  if (final === row.notes_text) continue;

  changed++;
  console.log('='.repeat(80));
  console.log(`#${row.id} ${row.name.slice(0, 70)}`);
  console.log('--- before ---');
  console.log(row.notes_text);
  console.log('--- after ---');
  console.log(final);

  if (APPLY) {
    await db.execute({
      sql: 'UPDATE problems SET notes_text = ? WHERE id = ?',
      args: [final, row.id],
    });
  }
}

console.log(`\n${APPLY ? 'Applied' : 'Would apply'} changes to ${changed} of ${rows.length} cards.`);
if (!APPLY && changed > 0) console.log('Re-run with --apply to write these changes.');
