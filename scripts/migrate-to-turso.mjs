// Run with: node scripts/migrate-to-turso.mjs
// Requires .env.local to have TURSO_DATABASE_URL and TURSO_AUTH_TOKEN

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually (no dotenv needed)
const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const eq = line.indexOf('=');
  if (eq === -1 || line.startsWith('#')) continue;
  const key = line.slice(0, eq).trim();
  const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  process.env[key] = val;
}

const DUMP = '/Users/macbookair/Downloads/prep-backup-20260619.sql';

// Replace unistr('...\uXXXX...') with a plain SQL string literal.
// SQLite uses unistr() to embed unicode escapes in dumps; libsql doesn't support it.
function decodeUnistrCalls(sql) {
  // Match unistr('...') — content can contain '', \uXXXX, or any non-quote/non-backslash char
  return sql.replace(/unistr\('((?:[^'\\]|''|\\u[0-9a-fA-F]{4}|\\.)*)'\)/g, (_, content) => {
    const decoded = content.replace(/\\u([0-9a-fA-F]{4})/g, (__, hex) => {
      const ch = String.fromCharCode(parseInt(hex, 16));
      // If the decoded char is a single quote, double it for SQL escaping
      return ch === "'" ? "''" : ch;
    });
    return `'${decoded}'`;
  });
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

console.log('Reading dump...');
const raw = readFileSync(DUMP, 'utf8');
const sql = decodeUnistrCalls(raw);

const remaining = (sql.match(/unistr\(/g) || []).length;
if (remaining > 0) {
  console.warn(`Warning: ${remaining} unistr() calls were not decoded — check the regex.`);
}

console.log('Importing into Turso...');
try {
  await client.executeMultiple(sql);
  console.log('Import done! Verifying...');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables:', tables.rows.map(r => r[0]).join(', '));
  const count = await client.execute('SELECT COUNT(*) FROM problems');
  console.log('Problems:', count.rows[0][0]);
  const attempts = await client.execute('SELECT COUNT(*) FROM attempts');
  console.log('Attempts:', attempts.rows[0][0]);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
