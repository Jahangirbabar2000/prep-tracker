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

  it('does not re-run an applied migration over edits made since', () => {
    const path = fixture();
    const seeded = new Database(path);
    seeded.prepare(`INSERT INTO config_options (domain, field, value) VALUES ('dsa', 'default_link', 'https://old.example')`).run();
    seeded.close();
    migrate(path);

    // What Settings does after the migration: change the default link, rename an option.
    const edited = new Database(path);
    edited.prepare(`UPDATE study_domains SET default_link = 'https://new.example' WHERE id = 'dsa'`).run();
    edited.prepare(`UPDATE domain_field_options SET value = 'Blind 75 (2026)' WHERE value = 'Blind 75'`).run();
    edited.close();
    migrate(path);

    const db = new Database(path, { readonly: true });
    expect(db.prepare(`SELECT default_link FROM study_domains WHERE id = 'dsa'`).get()).toEqual({ default_link: 'https://new.example' });
    expect(db.prepare(`SELECT COUNT(*) AS n FROM domain_field_options WHERE value = 'Blind 75'`).get()).toEqual({ n: 0 });
    db.close();
  });

  it('adds the attempt idempotency key without touching existing attempts', () => {
    const path = fixture();
    const db = new Database(path);
    db.exec(`
      CREATE TABLE attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER NOT NULL,
        attempted_at TEXT NOT NULL,
        time_taken_mins INTEGER NOT NULL,
        struggled INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO attempts (problem_id, attempted_at, time_taken_mins) VALUES (1, '2026-07-29 09:00:00', 5);
      INSERT INTO attempts (problem_id, attempted_at, time_taken_mins) VALUES (1, '2026-07-30 09:00:00', 4);
    `);
    db.close();
    migrate(path);
    migrate(path);

    const migrated = new Database(path);
    // Both pre-existing rows survive with a NULL key — NULLs don't collide.
    expect(migrated.prepare('SELECT COUNT(*) AS n FROM attempts WHERE client_id IS NULL').get()).toEqual({ n: 2 });
    const insert = migrated.prepare(
      `INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, client_id) VALUES (1, '2026-07-31 09:00:00', 3, 'k1')`,
    );
    insert.run();
    expect(() => insert.run()).toThrow(/UNIQUE/);
    expect(migrated.prepare(`SELECT COUNT(*) AS n FROM schema_migrations WHERE id = '2026-10-07-attempt-client-id'`).get()).toEqual({ n: 1 });
    migrated.close();
  });

  it('builds a working database from nothing', () => {
    // A fresh deployment's database: no file, no tables. This used to fail on
    // its first ALTER TABLE ("no such table: problems"), leaving nothing for
    // /api/sync to read.
    const directory = mkdtempSync(join(tmpdir(), 'prep-domain-migration-'));
    tempDirectories.push(directory);
    const path = join(directory, 'empty.db');
    migrate(path);
    migrate(path);

    const db = new Database(path);
    // Every table /api/sync reads.
    for (const table of ['problems', 'attempts', 'notes', 'links', 'config_options', 'study_domains', 'domain_fields', 'domain_field_options']) {
      expect(() => db.prepare(`SELECT * FROM ${table}`).all(), table).not.toThrow();
    }
    const problemColumns = (db.prepare('PRAGMA table_info(problems)').all() as { name: string }[]).map(column => column.name);
    expect(problemColumns).toEqual(expect.arrayContaining(['metadata_json', 'beh_category', 'lld_topic', 'next_due_date']));
    const attemptColumns = (db.prepare('PRAGMA table_info(attempts)').all() as { name: string }[]).map(column => column.name);
    expect(attemptColumns).toContain('client_id');
    expect(db.prepare('SELECT id FROM schema_migrations ORDER BY id').all()).toEqual([
      { id: '2026-06-05-core-schema' }, { id: '2026-07-29-runtime-domains-v1' }, { id: '2026-10-07-attempt-client-id' },
    ]);
    // A card can be logged end to end.
    db.prepare(`INSERT INTO problems (name, domain) VALUES ('Two Sum', 'dsa')`).run();
    db.prepare(`INSERT INTO attempts (problem_id, time_taken_mins, client_id) VALUES (1, 5, 'k1')`).run();
    db.close();
  });
});
