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
      sd_source         TEXT,
      fe_bucket         TEXT,
      fe_question_set   TEXT,
      py_category       TEXT,
      resource_url      TEXT,
      notes_text        TEXT,
      interval_level    INTEGER NOT NULL DEFAULT 0,
      next_due_date     TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id       INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      attempted_at     TEXT NOT NULL DEFAULT (datetime('now')),
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

  // Migrations — safe to run on existing DBs
  const cols = db.prepare('PRAGMA table_info(problems)').all() as { name: string }[];
  if (!cols.some(c => c.name === 'difficulty')) {
    db.exec('ALTER TABLE problems ADD COLUMN difficulty TEXT');
  }
}
