// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { NextRequest } from 'next/server';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AUTH_COOKIE, createSession } from './auth';
import { ACCOUNT_TABLES, deleteAccount, exportAccount, isActiveUser } from './accountData';
import { withUser } from './currentUser';

const directory = mkdtempSync(join(tmpdir(), 'prep-account-data-'));
const url = `file:${join(directory, 'test.db')}`;
const SECRET = 'account-data-secret';
let db: Client;

beforeAll(() => {
  execFileSync(process.execPath, ['scripts/migrate-domains.mjs'], {
    env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: '' },
    stdio: 'ignore',
  });
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = '';
  process.env.AUTH_SECRET = SECRET;
  db = createClient({ url });
});

afterAll(() => {
  delete process.env.AUTH_SECRET;
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

async function seedUser(id: string) {
  await db.execute({ sql: `INSERT INTO users (id, email, cognito_sub) VALUES (?, ?, ?)`, args: [id, `${id}@example.com`, `sub-${id}`] });
  await db.execute({
    sql: `INSERT INTO study_domains (id, user_id, slug, name, short_name, study_mode, icon, color) VALUES (?, ?, 'deck', 'Deck', 'D', 'flashcard', 'book', 'blue')`,
    args: [`dom_${id}`, id],
  });
  const problem = Number((await db.execute({ sql: `INSERT INTO problems (user_id, name, domain) VALUES (?, 'card', ?)`, args: [id, `dom_${id}`] })).lastInsertRowid);
  await db.execute({ sql: `INSERT INTO attempts (user_id, problem_id, attempted_at, time_taken_mins) VALUES (?, ?, '2026-01-01', 1)`, args: [id, problem] });
  await db.execute({ sql: `INSERT INTO notes (user_id, problem_id, question, answer) VALUES (?, ?, 'q', 'a')`, args: [id, problem] });
  const plan = Number((await db.execute({ sql: `INSERT INTO study_plans (user_id, name, start_date, mock_start_date, exam_date, created_at) VALUES (?, 'p', 'a', 'b', 'c', 'd')`, args: [id] })).lastInsertRowid);
  await db.execute({ sql: `INSERT INTO plan_tasks (user_id, plan_id, date, kind, title) VALUES (?, ?, '2026-01-01', 'k', 't')`, args: [id, plan] });
}

const rowsOf = async (id: string) => {
  let n = 0;
  for (const table of ACCOUNT_TABLES) n += Number((await db.execute({ sql: `SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`, args: [id] })).rows[0].n);
  return n;
};

beforeEach(async () => {
  for (const table of ACCOUNT_TABLES) await db.execute(`DELETE FROM ${table} WHERE user_id <> 'usr_owner'`);
  await db.execute(`DELETE FROM users WHERE id <> 'usr_owner'`);
  await seedUser('usr_a');
  await seedUser('usr_b');
});

it('every per-user table is deleted (matches the migration)', () => {
  const migration = readFileSync('scripts/migrate-domains.mjs', 'utf8');
  const listed = migration.match(/const USER_TABLES = \[([^\]]*)\]/)![1].match(/'([a-z_]+)'/g)!.map(t => t.slice(1, -1));
  expect([...ACCOUNT_TABLES].sort()).toEqual(listed.sort());
});

describe('exportAccount', () => {
  it("holds the account's own rows and no one else's", async () => {
    const data = await exportAccount('usr_a') as unknown as Record<string, Array<{ user_id: string }>> & { user: { email: string } };
    expect(data.user.email).toBe('usr_a@example.com');
    for (const table of ACCOUNT_TABLES) {
      for (const row of data[table]) expect(row.user_id).toBe('usr_a');
    }
    expect(data.problems).toHaveLength(1);
    expect(data.plan_tasks).toHaveLength(1);
  });
});

describe('deleteAccount', () => {
  it('removes every row it owns and frees the email, leaving other accounts alone', async () => {
    const before = await rowsOf('usr_b');
    expect(await deleteAccount('usr_a')).toEqual({ cognitoSub: 'sub-usr_a' });
    expect(await rowsOf('usr_a')).toBe(0);
    expect(await rowsOf('usr_b')).toBe(before);
    const user = (await db.execute(`SELECT email, cognito_sub, deleted_at FROM users WHERE id = 'usr_a'`)).rows[0];
    expect(user.email).toBeNull();
    expect(user.cognito_sub).toBeNull();
    expect(user.deleted_at).toBeTruthy();
    expect(await isActiveUser('usr_a')).toBe(false);
    expect(await isActiveUser('usr_b')).toBe(true);
  });

  it("signs the deleted account out everywhere: its other sessions get 401", async () => {
    const route = withUser(async () => new Response('ok'));
    const call = async (id: string) => route(
      new NextRequest('http://localhost/api/sync', { headers: { cookie: `${AUTH_COOKIE}=${await createSession(SECRET, Date.now(), id)}` } }),
      {},
    );
    expect((await call('usr_a')).status).toBe(200);
    await deleteAccount('usr_a');
    expect((await call('usr_a')).status).toBe(401);
    expect((await call('usr_b')).status).toBe(200);
    expect((await call('usr_never_existed')).status).toBe(401);
  });
});
