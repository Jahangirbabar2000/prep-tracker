import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prep.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      domain            TEXT NOT NULL,
      platform          TEXT,
      pattern_tag       TEXT,
      question_list     TEXT,
      sd_category       TEXT,
      sd_topic          TEXT,
      sd_source         TEXT,
      fe_bucket         TEXT,
      fe_question_set   TEXT,
      py_category       TEXT,
      resource_url      TEXT,
      notes_text        TEXT,
      interval_level    INTEGER NOT NULL DEFAULT 0,
      next_due_date     TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id       INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      attempted_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      time_taken_mins  INTEGER NOT NULL,
      struggled        INTEGER NOT NULL DEFAULT 0,
      practice_type    TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      question   TEXT NOT NULL,
      answer     TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS links (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      url        TEXT NOT NULL,
      label      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_problem_id ON attempts(problem_id);
    CREATE INDEX IF NOT EXISTS idx_notes_problem_id ON notes(problem_id);
    CREATE INDEX IF NOT EXISTS idx_links_problem_id ON links(problem_id);
    CREATE INDEX IF NOT EXISTS idx_problems_domain ON problems(domain);
    CREATE INDEX IF NOT EXISTS idx_problems_next_due ON problems(next_due_date);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config_options (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      domain     TEXT NOT NULL,
      field      TEXT NOT NULL,
      value      TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(domain, field, value)
    );
    CREATE INDEX IF NOT EXISTS idx_config_options_domain_field ON config_options(domain, field);
  `);

  // Seed default config options (INSERT OR IGNORE so they only insert once)
  const seedOptions: { domain: string; field: string; value: string; sort_order: number }[] = [
    // dsa / platform
    { domain: 'dsa', field: 'platform', value: 'LeetCode',        sort_order: 0 },
    { domain: 'dsa', field: 'platform', value: 'NeetCode',        sort_order: 1 },
    { domain: 'dsa', field: 'platform', value: 'Hello Interview', sort_order: 2 },
    // dsa / question_list
    { domain: 'dsa', field: 'question_list', value: 'NeetCode 150',              sort_order: 0 },
    { domain: 'dsa', field: 'question_list', value: 'Leetcode 75',               sort_order: 1 },
    { domain: 'dsa', field: 'question_list', value: 'Leetcode 150',              sort_order: 2 },
    { domain: 'dsa', field: 'question_list', value: 'HelloInterview Learn Code', sort_order: 3 },
    // system_design / sd_category
    { domain: 'system_design', field: 'sd_category', value: 'Core Concepts',    sort_order: 0 },
    { domain: 'system_design', field: 'sd_category', value: 'In a Hurry',       sort_order: 1 },
    { domain: 'system_design', field: 'sd_category', value: 'Patterns',         sort_order: 2 },
    { domain: 'system_design', field: 'sd_category', value: 'Key Technologies', sort_order: 3 },
    { domain: 'system_design', field: 'sd_category', value: 'Advanced Topics',  sort_order: 4 },
    // system_design / sd_topic
    { domain: 'system_design', field: 'sd_topic', value: 'Databases',        sort_order: 0 },
    { domain: 'system_design', field: 'sd_topic', value: 'Caching',          sort_order: 1 },
    { domain: 'system_design', field: 'sd_topic', value: 'Message Queues',   sort_order: 2 },
    { domain: 'system_design', field: 'sd_topic', value: 'API Design',       sort_order: 3 },
    { domain: 'system_design', field: 'sd_topic', value: 'Microservices',    sort_order: 4 },
    { domain: 'system_design', field: 'sd_topic', value: 'Storage',          sort_order: 5 },
    { domain: 'system_design', field: 'sd_topic', value: 'Scalability',      sort_order: 6 },
    { domain: 'system_design', field: 'sd_topic', value: 'Availability',     sort_order: 7 },
    { domain: 'system_design', field: 'sd_topic', value: 'Networking',       sort_order: 8 },
    { domain: 'system_design', field: 'sd_topic', value: 'Observability',    sort_order: 9 },
    // frontend / fe_bucket
    { domain: 'frontend', field: 'fe_bucket', value: 'JS Quirks',          sort_order: 0 },
    { domain: 'frontend', field: 'fe_bucket', value: 'React Internals',    sort_order: 1 },
    { domain: 'frontend', field: 'fe_bucket', value: 'Component Building', sort_order: 2 },
    { domain: 'frontend', field: 'fe_bucket', value: 'CSS / Layout',       sort_order: 3 },
    { domain: 'frontend', field: 'fe_bucket', value: 'Performance',        sort_order: 4 },
    // frontend / fe_question_set
    { domain: 'frontend', field: 'fe_question_set', value: 'GFE Quiz React 50', sort_order: 0 },
    { domain: 'frontend', field: 'fe_question_set', value: 'JS 500',            sort_order: 1 },
    { domain: 'frontend', field: 'fe_question_set', value: 'Frontend 75',       sort_order: 2 },
    // python / question_list
    { domain: 'python', field: 'question_list', value: 'GFG Python Interview Questions', sort_order: 0 },
    { domain: 'python', field: 'question_list', value: 'GFG Top 50',                     sort_order: 1 },
    { domain: 'python', field: 'question_list', value: 'GFG Top 100',                    sort_order: 2 },
    { domain: 'python', field: 'question_list', value: 'Python Interview Questions',     sort_order: 3 },
    // python / py_category
    { domain: 'python', field: 'py_category', value: 'Language Quirks', sort_order: 0 },
    { domain: 'python', field: 'py_category', value: 'stdlib',          sort_order: 1 },
    { domain: 'python', field: 'py_category', value: 'OOP',             sort_order: 2 },
    { domain: 'python', field: 'py_category', value: 'Concurrency',     sort_order: 3 },
    // ai / question_list
    { domain: 'ai', field: 'question_list', value: 'AI Engineering Field Guide', sort_order: 0 },
    // ai / ai_category
    { domain: 'ai', field: 'ai_category', value: 'LLM Practice',                  sort_order: 0 },
    { domain: 'ai', field: 'ai_category', value: 'RAG Systems',                   sort_order: 1 },
    { domain: 'ai', field: 'ai_category', value: 'Agents and Tool Use',           sort_order: 2 },
    { domain: 'ai', field: 'ai_category', value: 'Testing and Evaluation',        sort_order: 3 },
    { domain: 'ai', field: 'ai_category', value: 'Monitoring',                    sort_order: 4 },
    { domain: 'ai', field: 'ai_category', value: 'Cost and Latency Optimization', sort_order: 5 },
    { domain: 'ai', field: 'ai_category', value: 'Safety and Guardrails',         sort_order: 6 },
  ];

  const insertOption = db.prepare(
    'INSERT OR IGNORE INTO config_options (domain, field, value, sort_order) VALUES (?, ?, ?, ?)'
  );
  for (const opt of seedOptions) {
    insertOption.run(opt.domain, opt.field, opt.value, opt.sort_order);
  }

  // Migrations — safe to run on existing DBs
  const cols = db.prepare('PRAGMA table_info(problems)').all() as { name: string }[];
  if (!cols.some(c => c.name === 'difficulty')) {
    db.exec('ALTER TABLE problems ADD COLUMN difficulty TEXT');
  }
  if (!cols.some(c => c.name === 'ai_category')) {
    db.exec('ALTER TABLE problems ADD COLUMN ai_category TEXT');
  }
  if (!cols.some(c => c.name === 'sd_topic')) {
    db.exec('ALTER TABLE problems ADD COLUMN sd_topic TEXT');
  }

  // Fix any remaining UTC timestamps that are in the future relative to local time
  // (written before the datetime('now', 'localtime') fix was applied)
  db.exec("UPDATE problems SET created_at = datetime(created_at, 'localtime') WHERE created_at > datetime('now', 'localtime')");
  db.exec("UPDATE attempts SET attempted_at = datetime(attempted_at, 'localtime') WHERE attempted_at > datetime('now', 'localtime')");
}
