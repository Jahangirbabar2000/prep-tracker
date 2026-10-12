// Import another copy of the app's database as one new user of this one.
//
//   SOURCE_DATABASE_URL=… SOURCE_AUTH_TOKEN=… \
//   TARGET_DATABASE_URL=… TARGET_AUTH_TOKEN=… \
//   node scripts/import-user.mjs --user-id usr_rida --name "Rida" [--email rida@…] [--dry]
//
// Every row gets fresh ids (the two databases' ids collide — both have a 'dsa'
// domain and a problem 1) and the new user_id, and the whole import is one
// write transaction: it lands complete or not at all. It refuses a user id
// that already exists, so it can't run twice into the same database.
//
// The target must be named explicitly. Unlike the migration, this never reads
// .env.local, whose database is production.
//
// Run it against a copy first (`turso db create … --from-db …`), check the
// counts it prints, then against production at the switch-over. It is a
// one-off: delete it once the import has been applied there.
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    'user-id': { type: 'string' },
    name: { type: 'string', default: '' },
    email: { type: 'string' },
    dry: { type: 'boolean', default: false },
  },
});

const userId = args['user-id'];
if (!userId || !/^usr_[a-z0-9_-]+$/.test(userId)) fail('--user-id is required, e.g. usr_rida');
for (const key of ['SOURCE_DATABASE_URL', 'TARGET_DATABASE_URL']) {
  if (!process.env[key]) fail(`${key} is not set`);
}
if (process.env.SOURCE_DATABASE_URL === process.env.TARGET_DATABASE_URL) fail('source and target are the same database');

const source = createClient({ url: process.env.SOURCE_DATABASE_URL, authToken: process.env.SOURCE_AUTH_TOKEN });
const target = createClient({ url: process.env.TARGET_DATABASE_URL, authToken: process.env.TARGET_AUTH_TOKEN });

// Leftovers from end-to-end runs against the source: empty decks named like
// this are skipped, not imported.
const E2E_DOMAIN = /^e2e-domain-\d+$/;

function fail(message) {
  console.error(`import-user: ${message}`);
  process.exit(1);
}

async function rows(client, sql, params = []) {
  return (await client.execute({ sql, args: params })).rows.map(row => ({ ...row }));
}

async function tableNames(client) {
  return new Set((await rows(client, `SELECT name FROM sqlite_master WHERE type = 'table'`)).map(row => row.name));
}

async function columnsOf(client, table) {
  return new Set((await rows(client, `PRAGMA table_info(${table})`)).map(row => row.name));
}

/** First free id in `table`: past both the live rows and AUTOINCREMENT's high-water mark. */
async function nextId(table) {
  const [max] = await rows(target, `SELECT COALESCE(MAX(id), 0) AS n FROM ${table}`);
  const [seq] = await rows(target, `SELECT COALESCE(MAX(seq), 0) AS n FROM sqlite_sequence WHERE name = ?`, [table]);
  return Math.max(Number(max.n), Number(seq.n)) + 1;
}

const sourceTables = await tableNames(source);
const targetTables = await tableNames(target);
const applied = new Set((await rows(target, 'SELECT id FROM schema_migrations')).map(row => row.id));
if (!applied.has('2026-10-12-multi-user')) fail('target is missing the multi-user migration; run npm run db:migrate on it first');
if ((await rows(target, 'SELECT 1 FROM users WHERE id = ?', [userId])).length) fail(`${userId} already exists in the target`);

const read = async table => (sourceTables.has(table) ? rows(source, `SELECT * FROM ${table} ORDER BY id`) : []);
const src = {
  study_domains: await read('study_domains'),
  domain_fields: await read('domain_fields'),
  domain_field_options: await read('domain_field_options'),
  config_options: await read('config_options'),
  problems: await read('problems'),
  attempts: await read('attempts'),
  notes: await read('notes'),
  links: await read('links'),
  study_plans: await read('study_plans'),
  plan_tasks: await read('plan_tasks'),
};

const targetColumns = {};
for (const table of Object.keys(src)) {
  if (!targetTables.has(table)) fail(`target has no ${table} table`);
  targetColumns[table] = await columnsOf(target, table);
}

// Some source cards keep a field's value only in its legacy per-domain column
// (gre_category, …) and not in metadata_json — the target may have no such
// column, so fold it into the metadata first, as the runtime-domain migration
// did here. A value already in the metadata wins.
const legacyFields = src.domain_fields.filter(field => field.legacy_column);
let backfilled = 0;
for (const problem of src.problems) {
  let metadata = {};
  try { metadata = JSON.parse(String(problem.metadata_json || '{}')); } catch { metadata = {}; }
  let changed = false;
  for (const field of legacyFields) {
    if (field.domain_id !== problem.domain) continue;
    const value = problem[field.legacy_column];
    if (value != null && value !== '' && metadata[field.key] == null) {
      metadata[field.key] = String(value);
      changed = true;
    }
  }
  if (changed) {
    problem.metadata_json = JSON.stringify(metadata);
    backfilled++;
  }
}

const skipped = [];
const skippedDomains = new Set();
const warnings = [];
const statements = [];
const counts = {};

/** INSERT a source row under the new user, keeping only columns the target has. */
function add(table, row, overrides) {
  const record = { ...row, ...overrides, user_id: userId };
  const columns = Object.keys(record).filter(column => targetColumns[table].has(column));
  statements.push({
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    args: columns.map(column => record[column] ?? null),
  });
  counts[table] = (counts[table] ?? 0) + 1;
}

// Domains: string ids, so fresh `dom_<uuid>` ones (the runtime-created form).
const usedDomains = new Set(src.problems.map(problem => problem.domain));
const domainIds = new Map();
for (const domain of src.study_domains) {
  if (E2E_DOMAIN.test(String(domain.slug)) && !usedDomains.has(domain.id)) {
    skipped.push(`domain ${domain.slug}`);
    skippedDomains.add(domain.id);
    continue;
  }
  const id = `dom_${randomUUID()}`;
  domainIds.set(domain.id, id);
  add('study_domains', domain, { id });
}

// Integer ids: allocated past the target's, and mapped for the child rows.
async function remap(table, list, parentOf, mapParent) {
  const ids = new Map();
  let next = await nextId(table);
  for (const row of list) {
    const parent = parentOf ? mapParent(parentOf(row)) : null;
    if (parentOf && parent == null) {
      warnings.push(`${table} ${row.id}: its parent isn't imported, skipped`);
      continue;
    }
    const id = next++;
    ids.set(row.id, id);
    add(table, row, { id, ...(parentOf ? parent : {}) });
  }
  return ids;
}

const problemColumns = targetColumns.problems;
// Fields and options of a skipped deck go with it, quietly.
const skippedFields = new Set(src.domain_fields.filter(row => skippedDomains.has(row.domain_id)).map(row => row.id));
src.domain_fields = src.domain_fields.filter(row => !skippedFields.has(row.id));
src.domain_field_options = src.domain_field_options.filter(row => !skippedFields.has(row.field_id));
src.config_options = src.config_options.filter(row => !skippedDomains.has(row.domain));
const fieldIds = await remap('domain_fields', src.domain_fields, row => row.domain_id, from => {
  const id = domainIds.get(from);
  return id ? { domain_id: id } : null;
});
// The legacy per-domain column is a rollback dual-write; drop it where the
// target's problems table has no such column (e.g. gre_category).
for (const statement of statements) {
  if (!statement.sql.startsWith('INSERT INTO domain_fields')) continue;
  const columns = statement.sql.match(/\(([^)]*)\)/)[1].split(', ');
  const i = columns.indexOf('legacy_column');
  if (i >= 0 && statement.args[i] && !problemColumns.has(statement.args[i])) statement.args[i] = null;
}
await remap('domain_field_options', src.domain_field_options, row => row.field_id, from => {
  const id = fieldIds.get(from);
  return id ? { field_id: id } : null;
});
await remap('config_options', src.config_options, row => row.domain, from => {
  const id = domainIds.get(from);
  return id ? { domain: id } : null;
});
const problemIds = await remap('problems', src.problems, row => row.domain, from => {
  const id = domainIds.get(from);
  return id ? { domain: id } : null;
});
for (const table of ['attempts', 'notes', 'links']) {
  await remap(table, src[table], row => row.problem_id, from => {
    const id = problemIds.get(from);
    return id ? { problem_id: id } : null;
  });
}
const planIds = await remap('study_plans', src.study_plans);
await remap('plan_tasks', src.plan_tasks, row => row.plan_id, from => {
  const id = planIds.get(from);
  return id ? { plan_id: id } : null;
});

console.log(`import-user: ${userId}${args.dry ? ' (dry run — nothing written)' : ''}`);
for (const [table, list] of Object.entries(src)) {
  console.log(`  ${table.padEnd(22)} ${String(list.length).padStart(6)} read  ${String(counts[table] ?? 0).padStart(6)} imported`);
}
for (const item of skipped) console.log(`  skipped ${item} (empty test deck), with its fields and options`);
if (backfilled) console.log(`  ${backfilled} cards: field values moved from legacy columns into metadata_json`);
for (const warning of warnings) console.log(`  warning: ${warning}`);

if (!args.dry) {
  const tx = await target.transaction('write');
  try {
    await tx.execute({
      sql: 'INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)',
      args: [userId, args.email ?? null, args.name],
    });
    for (let i = 0; i < statements.length; i += 500) await tx.batch(statements.slice(i, i + 500));
    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => {});
    fail(`rolled back, nothing imported: ${error.message}`);
  } finally {
    tx.close();
  }

  // Read back what landed.
  for (const table of Object.keys(src)) {
    const [{ n }] = await rows(target, `SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`, [userId]);
    if (Number(n) !== (counts[table] ?? 0)) fail(`${table}: expected ${counts[table] ?? 0} rows, found ${n}`);
  }
  console.log('  verified: every imported row is in the target');
}

source.close();
target.close();
