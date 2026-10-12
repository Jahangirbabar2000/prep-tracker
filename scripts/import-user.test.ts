// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function paths() {
  const directory = mkdtempSync(join(tmpdir(), 'prep-import-'));
  directories.push(directory);
  return { source: join(directory, 'source.db'), target: join(directory, 'target.db') };
}

// The target: this app's schema, migrated, with the owner's own 'dsa' deck
// and card 1 — the ids an import must not collide with.
function target(path: string) {
  execFileSync(process.execPath, ['scripts/migrate-domains.mjs'], {
    env: { ...process.env, TURSO_DATABASE_URL: `file:${path}`, TURSO_AUTH_TOKEN: '' },
    stdio: 'ignore',
  });
  const db = new Database(path);
  db.exec(`
    INSERT INTO problems (id, user_id, name, domain) VALUES (1, 'usr_owner', 'Owner card', 'dsa');
    INSERT INTO attempts (user_id, problem_id, attempted_at, time_taken_mins) VALUES ('usr_owner', 1, '2026-01-01', 5);
  `);
  db.close();
}

// The source: another copy of the app (a fork), with its own legacy column,
// no attempts.client_id, a study plan, and an empty end-to-end test deck.
function source(path: string) {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE study_domains (id TEXT PRIMARY KEY, slug TEXT NOT NULL, name TEXT NOT NULL, short_name TEXT NOT NULL,
      study_mode TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
      item_label TEXT NOT NULL DEFAULT 'Question', log_label TEXT NOT NULL DEFAULT 'Log Question',
      log_title TEXT NOT NULL DEFAULT 'Log Question', empty_message TEXT NOT NULL DEFAULT '',
      answer_placeholder TEXT NOT NULL DEFAULT '', default_link TEXT NOT NULL DEFAULT '', archived_at TEXT, notes_label TEXT);
    CREATE TABLE domain_fields (id INTEGER PRIMARY KEY AUTOINCREMENT, domain_id TEXT NOT NULL, key TEXT NOT NULL,
      label TEXT NOT NULL, kind TEXT NOT NULL, placeholder TEXT NOT NULL DEFAULT '', filterable INTEGER NOT NULL DEFAULT 0,
      tag_role TEXT NOT NULL DEFAULT 'none', sort_order INTEGER NOT NULL DEFAULT 0, archived_at TEXT, legacy_column TEXT);
    CREATE TABLE domain_field_options (id INTEGER PRIMARY KEY AUTOINCREMENT, field_id INTEGER NOT NULL, value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0, archived_at TEXT);
    CREATE TABLE config_options (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, field TEXT NOT NULL,
      value TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE problems (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, domain TEXT NOT NULL,
      gre_category TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', interval_level INTEGER NOT NULL DEFAULT 0,
      next_due_date TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, problem_id INTEGER NOT NULL, attempted_at TEXT NOT NULL,
      time_taken_mins INTEGER NOT NULL, struggled INTEGER NOT NULL DEFAULT 0, practice_type TEXT);
    CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, problem_id INTEGER NOT NULL, question TEXT NOT NULL,
      answer TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE links (id INTEGER PRIMARY KEY AUTOINCREMENT, problem_id INTEGER NOT NULL, url TEXT NOT NULL, label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE study_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, start_date TEXT NOT NULL,
      mock_start_date TEXT NOT NULL, exam_date TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE plan_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL, date TEXT NOT NULL,
      kind TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
      est_mins INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, done_at TEXT);

    INSERT INTO study_domains (id, slug, name, short_name, study_mode, icon, color, notes_label)
      VALUES ('dsa', 'dsa', 'DSA', 'DSA', 'timed_problem', 'binary', 'blue', NULL),
             ('gre_vocabulary', 'gre-vocabulary', 'GRE Vocabulary', 'GRE', 'flashcard', 'book', 'rose', 'Usage'),
             ('dom_e2e', 'e2e-domain-123', 'E2E', 'E2E', 'flashcard', 'book', 'blue', NULL);
    INSERT INTO domain_fields (id, domain_id, key, label, kind, legacy_column)
      VALUES (1, 'gre_vocabulary', 'gre_category', 'Category', 'select', 'gre_category'),
             (2, 'dom_e2e', 'topic', 'Topic', 'select', NULL);
    INSERT INTO domain_field_options (field_id, value) VALUES (1, 'High frequency'), (2, 'junk');
    INSERT INTO config_options (domain, field, value) VALUES ('gre_vocabulary', 'gre_category', 'High frequency');
    -- Card 1 has its category only in the legacy column; card 2 in the metadata too.
    INSERT INTO problems (id, name, domain, gre_category, metadata_json)
      VALUES (1, 'Laconic', 'gre_vocabulary', 'High frequency', '{}'),
             (2, 'Ebullient', 'gre_vocabulary', 'Old', '{"gre_category":"High frequency"}');
    INSERT INTO attempts (problem_id, attempted_at, time_taken_mins) VALUES (1, '2026-09-01 09:00:00', 2), (2, '2026-09-02 09:00:00', 3);
    INSERT INTO notes (problem_id, question, answer) VALUES (1, 'Means?', 'Brief');
    INSERT INTO links (problem_id, url) VALUES (2, 'https://example.com');
    INSERT INTO study_plans (id, name, start_date, mock_start_date, exam_date, created_at)
      VALUES (1, 'GRE', '2026-08-01', '2026-10-01', '2026-11-01', '2026-08-01');
    INSERT INTO plan_tasks (plan_id, date, kind, title) VALUES (1, '2026-08-02', 'vocab', 'Day 1'), (1, '2026-08-03', 'vocab', 'Day 2');
  `);
  db.close();
}

function runImport(p: { source: string; target: string }, extra: string[] = []) {
  return execFileSync(process.execPath, ['scripts/import-user.mjs', '--user-id', 'usr_rida', '--name', 'Rida', ...extra], {
    env: {
      ...process.env,
      SOURCE_DATABASE_URL: `file:${p.source}`, SOURCE_AUTH_TOKEN: '',
      TARGET_DATABASE_URL: `file:${p.target}`, TARGET_AUTH_TOKEN: '',
    },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('import-user', () => {
  it('imports a fork as one new user, with fresh ids and nothing of the owner touched', () => {
    const p = paths();
    target(p.target);
    source(p.source);
    runImport(p);

    const db = new Database(p.target, { readonly: true });
    const all = (sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as Record<string, unknown>[];
    const one = (sql: string, ...args: unknown[]) => db.prepare(sql).get(...args) as Record<string, unknown>;

    // The owner's rows are as they were.
    expect(all(`SELECT id, name FROM problems WHERE user_id = 'usr_owner'`)).toEqual([{ id: 1, name: 'Owner card' }]);
    expect(one(`SELECT COUNT(*) AS n FROM study_domains WHERE user_id = 'usr_owner'`).n).toBe(7);

    // Rida's decks get new ids; the empty test deck and its field are skipped.
    const decks = all(`SELECT id, slug, notes_label FROM study_domains WHERE user_id = 'usr_rida' ORDER BY slug`);
    expect(decks.map(deck => deck.slug)).toEqual(['dsa', 'gre-vocabulary']);
    for (const deck of decks) expect(String(deck.id)).toMatch(/^dom_[0-9a-f-]{36}$/);
    const gre = decks.find(deck => deck.slug === 'gre-vocabulary')!;
    expect(gre.notes_label).toBe('Usage');
    expect(one(`SELECT COUNT(*) AS n FROM domain_field_options WHERE user_id = 'usr_rida'`).n).toBe(1);

    // Cards follow their deck, never collide with id 1, and keep a legacy-only
    // value in the metadata — the target has no gre_category column, so the
    // field's legacy_column is cleared.
    const cards = all(`SELECT id, name, domain, metadata_json FROM problems WHERE user_id = 'usr_rida' ORDER BY name`);
    expect(cards.map(card => card.name)).toEqual(['Ebullient', 'Laconic']);
    for (const card of cards) {
      expect(card.id).not.toBe(1);
      expect(card.domain).toBe(gre.id);
      expect(JSON.parse(String(card.metadata_json))).toEqual({ gre_category: 'High frequency' });
    }
    expect(one(`SELECT legacy_column FROM domain_fields WHERE user_id = 'usr_rida'`).legacy_column).toBeNull();
    expect(one(`SELECT domain FROM config_options WHERE user_id = 'usr_rida'`).domain).toBe(gre.id);

    // Children point at the new parents.
    const laconic = cards.find(card => card.name === 'Laconic')!;
    expect(all(`SELECT time_taken_mins, client_id FROM attempts WHERE user_id = 'usr_rida' AND problem_id = ?`, laconic.id))
      .toEqual([{ time_taken_mins: 2, client_id: null }]);
    expect(one(`SELECT problem_id FROM notes WHERE user_id = 'usr_rida'`).problem_id).toBe(laconic.id);
    const plan = one(`SELECT id FROM study_plans WHERE user_id = 'usr_rida'`);
    expect(all(`SELECT title FROM plan_tasks WHERE user_id = 'usr_rida' AND plan_id = ? ORDER BY date`, plan.id))
      .toEqual([{ title: 'Day 1' }, { title: 'Day 2' }]);
    db.close();
  });

  it('refuses to import the same user twice', () => {
    const p = paths();
    target(p.target);
    source(p.source);
    runImport(p);
    expect(() => runImport(p)).toThrow(/usr_rida already exists/);
  });

  it('writes nothing on a dry run', () => {
    const p = paths();
    target(p.target);
    source(p.source);
    expect(runImport(p, ['--dry'])).toContain('dry run');
    const db = new Database(p.target, { readonly: true });
    expect(db.prepare(`SELECT COUNT(*) AS n FROM users WHERE id = 'usr_rida'`).get()).toEqual({ n: 0 });
    db.close();
  });
});
