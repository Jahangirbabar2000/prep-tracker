import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

loadEnvFile(resolve(process.cwd(), '.env.local'));

const url = process.env.TURSO_DATABASE_URL || 'file:prep.db';
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const domains = [
  ['dsa', 'dsa', 'DSA', 'DSA', 'timed_problem', 'binary', 'blue', 0, 'Problem', 'Log Attempt', 'Log DSA Attempt', 'No problems yet. Log your first attempt to get started.', 'Short context… (markdown supported)'],
  ['system_design', 'system-design', 'System Design', 'SysD', 'flashcard_practice', 'network', 'orange', 1, 'Question', 'Log Question', 'Log System Design Question', 'No concepts yet. Log your first concept to get started.', 'Key points, tradeoffs, when to use it… (markdown supported)'],
  ['lld', 'lld', 'Low-Level Design', 'LLD', 'flashcard', 'blocks', 'amber', 2, 'Question', 'Log Question', 'Log LLD Question', 'No concepts yet. Log your first concept to get started.', 'Key classes, interfaces, tradeoffs… (markdown supported)'],
  ['python', 'backend', 'Backend', 'BE', 'flashcard', 'code', 'emerald', 3, 'Question', 'Log Question', 'Log Backend Question', 'No concepts yet. Log your first attempt to get started.', 'Key points, gotchas, syntax… (markdown supported)'],
  ['frontend', 'frontend', 'Frontend', 'FE', 'flashcard', 'layout', 'violet', 4, 'Question', 'Log Question', 'Log Frontend Question', 'No questions yet. Log your first attempt to get started.', 'Key points, gotchas, how it works… (markdown supported)'],
  ['ai', 'ai', 'AI', 'AI', 'flashcard', 'brain', 'rose', 5, 'Question', 'Log Question', 'Log AI Question', 'No questions yet. Log your first to get started.', 'Key concepts, use cases, gotchas… (markdown supported)'],
  ['behavioral', 'behavioral', 'Behavioral', 'Beh', 'flashcard', 'messages', 'teal', 6, 'Question', 'Log Question', 'Log Behavioral Question', 'No questions yet. Log your first to get started.', 'Situation, Task, Action, Result… (markdown supported)'],
];

const fields = [
  ['dsa', 'difficulty', 'Difficulty', 'select', 'All difficulties', 1, 'none', 0, 'difficulty'],
  ['dsa', 'platform', 'Platform', 'select', 'All platforms', 0, 'none', 1, 'platform'],
  ['dsa', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 2, 'question_list'],
  ['dsa', 'pattern_tag', 'Pattern', 'text', 'All patterns', 1, 'primary', 3, 'pattern_tag'],
  ['system_design', 'sd_category', 'Bucket', 'select', 'All buckets', 1, 'primary', 0, 'sd_category'],
  ['system_design', 'sd_topic', 'Topic', 'select', 'All topics', 1, 'secondary', 1, 'sd_topic'],
  ['system_design', 'sd_source', 'Source', 'text', 'All sources', 0, 'none', 2, 'sd_source'],
  ['lld', 'lld_category', 'Category', 'select', 'All categories', 1, 'primary', 0, 'lld_category'],
  ['lld', 'lld_topic', 'Topic', 'select', 'All topics', 1, 'secondary', 1, 'lld_topic'],
  ['python', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 0, 'question_list'],
  ['python', 'py_category', 'Category', 'select', 'All categories', 1, 'primary', 1, 'py_category'],
  ['frontend', 'fe_bucket', 'Bucket', 'select', 'All buckets', 1, 'primary', 0, 'fe_bucket'],
  ['frontend', 'fe_question_set', 'Question Set', 'select', 'All question sets', 0, 'secondary', 1, 'fe_question_set'],
  ['ai', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 0, 'question_list'],
  ['ai', 'ai_category', 'Category', 'select', 'All categories', 1, 'primary', 1, 'ai_category'],
  ['behavioral', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 0, 'question_list'],
  ['behavioral', 'beh_category', 'Category', 'select', 'All categories', 1, 'primary', 1, 'beh_category'],
];

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS study_domains (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    study_mode TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    item_label TEXT NOT NULL DEFAULT 'Question',
    log_label TEXT NOT NULL DEFAULT 'Log Question',
    log_title TEXT NOT NULL DEFAULT 'Log Question',
    empty_message TEXT NOT NULL DEFAULT 'No questions yet.',
    answer_placeholder TEXT NOT NULL DEFAULT 'Write the answer…',
    default_link TEXT NOT NULL DEFAULT '',
    archived_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_study_domains_slug_nocase ON study_domains(lower(slug));
  CREATE TABLE IF NOT EXISTS domain_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL,
    placeholder TEXT NOT NULL DEFAULT '',
    filterable INTEGER NOT NULL DEFAULT 0,
    tag_role TEXT NOT NULL DEFAULT 'none',
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    legacy_column TEXT,
    UNIQUE(domain_id, key)
  );
  CREATE INDEX IF NOT EXISTS idx_domain_fields_domain ON domain_fields(domain_id, sort_order);
  CREATE TABLE IF NOT EXISTS domain_field_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id INTEGER NOT NULL,
    value TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    UNIQUE(field_id, value)
  );
  CREATE INDEX IF NOT EXISTS idx_domain_field_options_field ON domain_field_options(field_id, sort_order);
`);

const problemColumns = await client.execute('PRAGMA table_info(problems)');
const columnNames = new Set(problemColumns.rows.map(row => String(row.name)));
if (!columnNames.has('metadata_json')) {
  await client.execute(`ALTER TABLE problems ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'`);
  columnNames.add('metadata_json');
}
// Keep the rollback dual-write path valid even when an older local database
// never received one of the historical per-domain ALTER TABLE statements.
for (const column of new Set(fields.map(field => field[8]))) {
  if (columnNames.has(column)) continue;
  await client.execute(`ALTER TABLE problems ADD COLUMN ${column} TEXT`);
  columnNames.add(column);
}

for (const domain of domains) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO study_domains
      (id, slug, name, short_name, study_mode, icon, color, sort_order, item_label, log_label, log_title, empty_message, answer_placeholder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: domain,
  });
}

for (const field of fields) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO domain_fields
      (domain_id, key, label, kind, placeholder, filterable, tag_role, sort_order, legacy_column)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: field,
  });
}

// Move existing Settings options to their new field IDs. `default_link` becomes
// a domain property; the old table remains untouched for rollback compatibility.
const hasConfigOptions = (await client.execute(
  `SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'config_options'`,
)).rows.length > 0;
if (hasConfigOptions) {
  await client.execute(`
    UPDATE study_domains
    SET default_link = COALESCE((
      SELECT value FROM config_options
      WHERE domain = study_domains.id AND field = 'default_link'
      ORDER BY sort_order, id LIMIT 1
    ), default_link)
  `);
  const oldOptions = await client.execute(
    `SELECT domain, field, value, sort_order FROM config_options WHERE field <> 'default_link' ORDER BY sort_order, id`,
  );
  for (const option of oldOptions.rows) {
    const fieldRow = await client.execute({
      sql: 'SELECT id FROM domain_fields WHERE domain_id = ? AND key = ?',
      args: [option.domain, option.field],
    });
    if (!fieldRow.rows[0]) continue;
    await client.execute({
      sql: `INSERT OR IGNORE INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?)`,
      args: [fieldRow.rows[0].id, option.value, option.sort_order],
    });
  }
}

// Difficulty used to be hard-coded rather than stored in config_options.
const difficultyField = await client.execute(
  `SELECT id FROM domain_fields WHERE domain_id = 'dsa' AND key = 'difficulty'`,
);
if (difficultyField.rows[0]) {
  for (const [sortOrder, value] of ['Easy', 'Medium', 'Hard'].entries()) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?)`,
      args: [difficultyField.rows[0].id, value, sortOrder],
    });
  }
}

// Backfill one row at a time so this works with older databases that do not
// contain every legacy column. Existing JSON values always win.
const availableLegacyFields = fields.filter(field => columnNames.has(field[8]));
const rows = await client.execute('SELECT * FROM problems');
for (const row of rows.rows) {
  let metadata = {};
  try { metadata = JSON.parse(String(row.metadata_json || '{}')); } catch { metadata = {}; }
  for (const field of availableLegacyFields) {
    const key = field[1];
    const column = field[8];
    const value = row[column];
    if (value != null && value !== '' && metadata[key] == null) metadata[key] = String(value);
  }
  await client.execute({
    sql: 'UPDATE problems SET metadata_json = ? WHERE id = ?',
    args: [JSON.stringify(metadata), row.id],
  });
}

await client.execute({
  sql: `INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)`,
  args: ['2026-07-29-runtime-domains-v1'],
});

console.log(`Runtime-domain migration complete for ${url}`);
client.close();
