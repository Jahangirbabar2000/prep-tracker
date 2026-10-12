// @vitest-environment node
// Every API route, called as user B against user A's rows. What's asserted is
// the property accounts rest on: B never reads, changes, deletes or attaches
// to anything of A's. It runs against a real libSQL file built by the real
// migration, so the user_id filters in the SQL are what's under test.
//
// A new route fails "covers every route" below until it gets a case here (or
// a reason in NO_USER_DATA).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { NextRequest } from 'next/server';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { AUTH_COOKIE, OWNER_USER_ID, createSession } from '@/lib/auth';

const SECRET = 'access-test-secret';
const A = OWNER_USER_ID;
const B = 'usr_b';
// Every row of A's carries this, so "B's response mentions it" means a leak.
const MARK = 'alpha';

const directory = mkdtempSync(join(tmpdir(), 'prep-access-'));
const url = `file:${join(directory, 'test.db')}`;
let db: Client;
let cookieB = '';

const ids = {
  domain: `dom_${MARK}`,
  bDomain: 'dom_b',
  field: 0, option: 0, config: 0, problem: 0, attempt: 0, note: 0, link: 0, bProblem: 0,
};
const A_KEY = `${MARK}-retry-key`;
// Not marked: B creating a deck at A's slug must succeed, and echoes it back.
const A_SLUG = 'shared-slug';

const USER_TABLES = [
  'study_domains', 'domain_fields', 'domain_field_options', 'config_options',
  'problems', 'attempts', 'notes', 'links', 'study_plans', 'plan_tasks',
];

async function insert(sql: string, args: unknown[]): Promise<number> {
  const result = await db.execute({ sql, args: args as never[] });
  return Number(result.lastInsertRowid);
}

async function seed() {
  for (const table of [...USER_TABLES].reverse()) await db.execute(`DELETE FROM ${table}`);
  await db.execute(`INSERT OR IGNORE INTO users (id) VALUES ('${B}')`);

  for (const [user, domain, tag] of [[A, ids.domain, MARK], [B, ids.bDomain, 'bravo']] as const) {
    await insert(
      `INSERT INTO study_domains (id, user_id, slug, name, short_name, study_mode, icon, color)
       VALUES (?, ?, ?, ?, ?, 'flashcard', 'book', 'blue')`,
      [domain, user, user === A ? A_SLUG : 'bravo-deck', `${tag} deck`, tag],
    );
    const field = await insert(
      `INSERT INTO domain_fields (user_id, domain_id, key, label, kind) VALUES (?, ?, 'topic', ?, 'select')`,
      [user, domain, `${tag} topic`],
    );
    const option = await insert(
      `INSERT INTO domain_field_options (user_id, field_id, value) VALUES (?, ?, ?)`,
      [user, field, `${tag} option`],
    );
    const config = await insert(
      `INSERT INTO config_options (user_id, domain, field, value) VALUES (?, ?, 'topic', ?)`,
      [user, domain, `${tag} config`],
    );
    const problem = await insert(
      `INSERT INTO problems (user_id, name, domain, next_due_date, created_at) VALUES (?, ?, ?, '2026-01-01', datetime('now'))`,
      [user, `${tag} card`, domain],
    );
    const attempt = await insert(
      `INSERT INTO attempts (user_id, problem_id, attempted_at, time_taken_mins, client_id) VALUES (?, ?, '2026-01-01 09:00:00', 5, ?)`,
      [user, problem, user === A ? A_KEY : 'bravo-key'],
    );
    const note = await insert(
      `INSERT INTO notes (user_id, problem_id, question, answer) VALUES (?, ?, ?, ?)`,
      [user, problem, `${tag} question`, `${tag} answer`],
    );
    const link = await insert(
      `INSERT INTO links (user_id, problem_id, url, label) VALUES (?, ?, ?, ?)`,
      [user, problem, `https://example.com/${tag}`, `${tag} link`],
    );
    if (user === A) Object.assign(ids, { field, option, config, problem, attempt, note, link });
    else ids.bProblem = problem;
  }
}

/** Everything A owns, to compare before and after B's request. */
async function snapshotOf(user: string) {
  const out: Record<string, unknown[]> = {};
  for (const table of USER_TABLES) {
    out[table] = (await db.execute({ sql: `SELECT * FROM ${table} WHERE user_id = ? ORDER BY rowid`, args: [user] })).rows;
  }
  return JSON.stringify(out);
}

/** B rows that point at one of A's rows — B attaching to A's data. */
async function bRowsReferencingA() {
  const result = await db.execute({
    sql: `SELECT
      (SELECT COUNT(*) FROM problems WHERE user_id = ? AND domain = ?) +
      (SELECT COUNT(*) FROM domain_fields WHERE user_id = ? AND domain_id = ?) +
      (SELECT COUNT(*) FROM domain_field_options WHERE user_id = ? AND field_id = ?) +
      (SELECT COUNT(*) FROM config_options WHERE user_id = ? AND domain = ?) +
      (SELECT COUNT(*) FROM attempts WHERE user_id = ? AND problem_id = ?) +
      (SELECT COUNT(*) FROM notes WHERE user_id = ? AND problem_id = ?) +
      (SELECT COUNT(*) FROM links WHERE user_id = ? AND problem_id = ?) AS n`,
    args: [B, ids.domain, B, ids.domain, B, ids.field, B, ids.domain, B, ids.problem, B, ids.problem, B, ids.problem],
  });
  return Number(result.rows[0].n);
}

type Case = {
  route: string; // file under app/api, without /route.ts
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: () => string;
  params?: () => Record<string, string>;
  body?: () => unknown;
  status: number;
};

const p = () => ({ id: String(ids.problem) });
const CASES: Case[] = [
  { route: 'sync', method: 'GET', path: () => '/api/sync', status: 200 },
  { route: 'stats/today', method: 'GET', path: () => '/api/stats/today', status: 200 },
  { route: 'problems', method: 'GET', path: () => `/api/problems?domain=${ids.domain}`, status: 200 },
  { route: 'problems', method: 'POST', path: () => '/api/problems', body: () => ({ name: 'x', domain: ids.domain }), status: 400 },
  { route: 'problems/[id]', method: 'GET', path: () => `/api/problems/${ids.problem}`, params: p, status: 404 },
  { route: 'problems/[id]', method: 'PATCH', path: () => `/api/problems/${ids.problem}`, params: p, body: () => ({ name: 'taken' }), status: 404 },
  // Deletes stay idempotent (an offline retry of one that landed must succeed),
  // so B gets 200 — and A's card is still there.
  { route: 'problems/[id]', method: 'DELETE', path: () => `/api/problems/${ids.problem}`, params: p, status: 200 },
  { route: 'problems/[id]/attempts', method: 'GET', path: () => `/api/problems/${ids.problem}/attempts`, params: p, status: 200 },
  {
    route: 'problems/[id]/attempts', method: 'POST', path: () => `/api/problems/${ids.problem}/attempts`, params: p,
    body: () => ({ time_taken_mins: 1, struggled: false, client_id: 'b-new-key' }), status: 404,
  },
  { route: 'attempts/[id]', method: 'PATCH', path: () => `/api/attempts/${ids.attempt}`, params: () => ({ id: String(ids.attempt) }), body: () => ({ time_taken_mins: 99 }), status: 404 },
  { route: 'attempts/[id]', method: 'DELETE', path: () => `/api/attempts/${ids.attempt}`, params: () => ({ id: String(ids.attempt) }), status: 404 },
  { route: 'problems/[id]/notes', method: 'GET', path: () => `/api/problems/${ids.problem}/notes`, params: p, status: 200 },
  { route: 'problems/[id]/notes', method: 'POST', path: () => `/api/problems/${ids.problem}/notes`, params: p, body: () => ({ question: 'q' }), status: 404 },
  {
    route: 'problems/[id]/notes/[noteId]', method: 'DELETE', path: () => `/api/problems/${ids.problem}/notes/${ids.note}`,
    params: () => ({ id: String(ids.problem), noteId: String(ids.note) }), status: 204,
  },
  { route: 'notes/[id]', method: 'DELETE', path: () => `/api/notes/${ids.note}`, params: () => ({ id: String(ids.note) }), status: 200 },
  { route: 'problems/[id]/links', method: 'GET', path: () => `/api/problems/${ids.problem}/links`, params: p, status: 200 },
  { route: 'problems/[id]/links', method: 'POST', path: () => `/api/problems/${ids.problem}/links`, params: p, body: () => ({ url: 'https://x.test' }), status: 404 },
  { route: 'links/[id]', method: 'DELETE', path: () => `/api/links/${ids.link}`, params: () => ({ id: String(ids.link) }), status: 200 },
  { route: 'config/options', method: 'GET', path: () => '/api/config/options', status: 200 },
  { route: 'config/options', method: 'POST', path: () => '/api/config/options', body: () => ({ domain: ids.domain, field: 'topic', value: 'v' }), status: 404 },
  { route: 'config/options/[id]', method: 'PATCH', path: () => `/api/config/options/${ids.config}`, params: () => ({ id: String(ids.config) }), body: () => ({ sort_order: 9 }), status: 404 },
  { route: 'config/options/[id]', method: 'DELETE', path: () => `/api/config/options/${ids.config}`, params: () => ({ id: String(ids.config) }), status: 204 },
  { route: 'domains', method: 'GET', path: () => '/api/domains', status: 200 },
  // Slugs are per user: A's slug is free for B.
  { route: 'domains', method: 'POST', path: () => '/api/domains', body: () => ({ name: 'Mine', slug: A_SLUG }), status: 201 },
  { route: 'domains/[id]', method: 'PATCH', path: () => `/api/domains/${ids.domain}`, params: () => ({ id: ids.domain }), body: () => ({ name: 'taken' }), status: 404 },
  { route: 'domains/[id]/fields', method: 'POST', path: () => `/api/domains/${ids.domain}/fields`, params: () => ({ id: ids.domain }), body: () => ({ label: 'Extra' }), status: 404 },
  { route: 'domain-fields/[id]', method: 'PATCH', path: () => `/api/domain-fields/${ids.field}`, params: () => ({ id: String(ids.field) }), body: () => ({ label: 'taken' }), status: 404 },
  { route: 'domain-fields/[id]/options', method: 'POST', path: () => `/api/domain-fields/${ids.field}/options`, params: () => ({ id: String(ids.field) }), body: () => ({ value: 'v' }), status: 404 },
  { route: 'domain-field-options/[id]', method: 'PATCH', path: () => `/api/domain-field-options/${ids.option}`, params: () => ({ id: String(ids.option) }), body: () => ({ value: 'taken' }), status: 404 },
];

// Routes that touch no user's rows, with the reason.
const NO_USER_DATA: Record<string, string> = {
  'auth POST': 'signs in; reads no user rows',
  'auth DELETE': 'signs out; clears the cookie only',
  'ask POST': 'proxies a question to OpenAI; reads no user rows',
  'auth/login GET': 'starts a Cognito sign-in; reads no user rows',
  'auth/callback GET': 'finds or creates the signing-in user (lib/accounts.test.ts); returns no rows',
  'auth/logout GET': 'clears the cookie and ends the Cognito session',
  'account GET': "exports the caller's own rows (lib/accountData.test.ts)",
  'account DELETE': "deletes the caller's own rows (lib/accountData.test.ts)",
};

function request(c: Case, cookie: string | null) {
  const body = c.body?.();
  return new NextRequest(`http://localhost${c.path()}`, {
    method: c.method,
    headers: {
      ...(cookie ? { cookie: `${AUTH_COOKIE}=${cookie}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function call(c: Case, cookie: string | null) {
  const mod = await import(`./${c.route}/route`);
  return (mod[c.method] as (req: NextRequest, ctx: unknown) => Promise<Response>)(
    request(c, cookie),
    { params: Promise.resolve(c.params?.() ?? {}) },
  );
}

beforeAll(async () => {
  execFileSync(process.execPath, ['scripts/migrate-domains.mjs'], {
    env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: '' },
    stdio: 'ignore',
  });
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = '';
  process.env.AUTH_SECRET = SECRET;
  db = createClient({ url });
  cookieB = await createSession(SECRET, Date.now(), B);
});

afterAll(() => {
  delete process.env.AUTH_SECRET;
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

beforeEach(seed);

describe('user B against user A', () => {
  it.each(CASES.map(c => [`${c.method} ${c.route}`, c] as const))('%s', async (_name, c) => {
    const before = await snapshotOf(A);
    const res = await call(c, cookieB);
    const text = await res.text();

    expect(res.status).toBe(c.status);
    expect(text, 'response mentions A’s data').not.toContain(MARK);
    expect(await snapshotOf(A), 'A’s rows changed').toBe(before);
    expect(await bRowsReferencingA(), 'B now has a row pointing at A’s').toBe(0);
  });

  it("a retry key A already used still records B's own attempt, and hands back nothing of A's", async () => {
    const before = await snapshotOf(A);
    const c: Case = {
      route: 'problems/[id]/attempts', method: 'POST', path: () => `/api/problems/${ids.bProblem}/attempts`,
      params: () => ({ id: String(ids.bProblem) }), body: () => ({ time_taken_mins: 2, struggled: false, client_id: A_KEY }),
      status: 201,
    };
    const res = await call(c, cookieB);
    expect(res.status).toBe(201);
    const attempt = await res.json();
    expect(attempt.user_id).toBe(B);
    expect(attempt.problem_id).toBe(ids.bProblem);
    expect(await snapshotOf(A)).toBe(before);
  });

  it('B still sees their own data', async () => {
    const res = await call(CASES[0], cookieB);
    const data = await res.json();
    expect(data.problems.map((row: { name: string }) => row.name)).toEqual(['bravo card']);
    expect(data.domains.map((row: { id: string }) => row.id)).toEqual([ids.bDomain]);
  });
});

describe('signed out', () => {
  it.each(CASES.map(c => [`${c.method} ${c.route}`, c] as const))('%s answers 401', async (_name, c) => {
    const res = await call(c, null);
    expect(res.status).toBe(401);
  });
});

describe('coverage', () => {
  it('covers every route', () => {
    const apiDir = join(process.cwd(), 'app/api');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (name === 'route.ts') files.push(full);
      }
    };
    walk(apiDir);

    const exported = files.flatMap(file => {
      const route = relative(apiDir, file).replace(/\/route\.ts$/, '');
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/export (?:const|async function) (GET|POST|PATCH|PUT|DELETE)\b/g)]
        .map(match => `${route} ${match[1]}`);
    });
    const covered = new Set([...CASES.map(c => `${c.route} ${c.method}`), ...Object.keys(NO_USER_DATA)]);
    expect(exported.filter(handler => !covered.has(handler)), 'handlers with no access case').toEqual([]);
  });
});
