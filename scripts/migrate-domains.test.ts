import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture(extraColumns = '') {
  const directory = mkdtempSync(join(tmpdir(), 'prep-domain-migration-'));
  tempDirectories.push(directory);
  const path = join(directory, 'fixture.db');
  const db = new Database(path);
  db.exec(`
    CREATE TABLE problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      pattern_tag TEXT,
      question_list TEXT,
      interval_level INTEGER NOT NULL DEFAULT 0,
      next_due_date TEXT,
      created_at TEXT NOT NULL
      ${extraColumns}
    );
    CREATE TABLE config_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      field TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(domain, field, value)
    );
    INSERT INTO problems (name, domain, pattern_tag, question_list, created_at)
    VALUES ('Two Sum', 'dsa', 'Arrays', 'Blind 75', '2026-07-29');
    INSERT INTO config_options (domain, field, value, sort_order)
    VALUES ('dsa', 'question_list', 'Blind 75', 0);
  `);
  db.close();
  return path;
}

function migrate(path: string) {
  execFileSync(process.execPath, ['scripts/migrate-domains.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, TURSO_DATABASE_URL: `file:${path}`, TURSO_AUTH_TOKEN: '' },
    stdio: 'pipe',
  });
}

describe('runtime-domain migration', () => {
  it('backfills the observed older schema and is idempotent', () => {
    const path = fixture();
    migrate(path);
    migrate(path);
    const db = new Database(path, { readonly: true });
    expect(db.prepare('SELECT COUNT(*) AS n FROM study_domains').get()).toEqual({ n: 7 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM domain_fields').get()).toEqual({ n: 17 });
    const row = db.prepare('SELECT metadata_json FROM problems WHERE id = 1').get() as { metadata_json: string };
    expect(JSON.parse(row.metadata_json)).toEqual({ pattern_tag: 'Arrays', question_list: 'Blind 75' });
    expect(db.prepare(`SELECT COUNT(*) AS n FROM schema_migrations WHERE id = '2026-07-29-runtime-domains-v1'`).get()).toEqual({ n: 1 });
    db.close();
  });

  it('backfills columns that only exist in the fuller schema', () => {
    const path = fixture(', lld_category TEXT, lld_topic TEXT, beh_category TEXT');
    const db = new Database(path);
    db.prepare(`
      INSERT INTO problems
        (name, domain, lld_category, lld_topic, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('Parking Lot', 'lld', 'OO Design', 'Parking Lot', '2026-07-29');
    db.close();
    migrate(path);
    const migrated = new Database(path, { readonly: true });
    const row = migrated.prepare(`SELECT metadata_json FROM problems WHERE domain = 'lld'`).get() as { metadata_json: string };
    expect(JSON.parse(row.metadata_json)).toEqual({ lld_category: 'OO Design', lld_topic: 'Parking Lot' });
    migrated.close();
  });
});
