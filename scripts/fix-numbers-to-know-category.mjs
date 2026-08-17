// One-off fix: the 20 "Numbers to Know" System Design cards were seeded with no
// sd_category, so they're invisible to the Bucket filter. On hellointerview,
// "Numbers to Know" is a page under Core Concepts, so that's the bucket.
//
//   node scripts/fix-numbers-to-know-category.mjs
//
// Safe to re-run: only rows whose sd_category is NULL/empty are touched, and
// metadata_json is rewritten from the row's own columns.
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
const CATEGORY = 'Core Concepts';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const rows = (await db.execute({
  sql: `SELECT id, name, sd_topic, metadata_json FROM problems
        WHERE domain = ? AND sd_topic = ? AND (sd_category IS NULL OR sd_category = '')
        ORDER BY created_at`,
  args: [DOMAIN, TOPIC],
})).rows;

if (!rows.length) {
  console.log('Nothing to fix — every "Numbers to Know" card already has a bucket.');
} else {
  for (const row of rows) {
    const metadata = JSON.stringify({ sd_category: CATEGORY, sd_topic: row.sd_topic });
    await db.execute({
      sql: `UPDATE problems SET sd_category = ?, metadata_json = ? WHERE id = ?`,
      args: [CATEGORY, metadata, row.id],
    });
    console.log(`  ~ ${row.name}`);
  }
  console.log(`\nDone. Set sd_category = "${CATEGORY}" on ${rows.length} card(s).`);
}

// Any other System Design card missing a bucket is a separate problem — report it.
const stragglers = (await db.execute({
  sql: `SELECT sd_topic, COUNT(*) AS n FROM problems
        WHERE domain = ? AND (sd_category IS NULL OR sd_category = '')
        GROUP BY sd_topic`,
  args: [DOMAIN],
})).rows;
if (stragglers.length) {
  console.log('\n⚠ Still missing a bucket:');
  for (const s of stragglers) console.log(`  ${s.n} card(s) with topic ${JSON.stringify(s.sd_topic)}`);
}
