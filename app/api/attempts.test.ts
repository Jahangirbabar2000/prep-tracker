// @vitest-environment node
// Runs the attempt routes against a real libSQL file, not a mocked db: what's
// under test is the SQL itself — ON CONFLICT on the idempotency key, RETURNING,
// and the write transaction rolling back as one unit.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { NextRequest } from 'next/server';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { POST as logAttempt } from './problems/[id]/attempts/route';
import { DELETE as deleteAttempt, PATCH as editAttempt } from './attempts/[id]/route';

const directory = mkdtempSync(join(tmpdir(), 'prep-attempts-'));
const url = `file:${join(directory, 'test.db')}`;
let db: Client;

beforeAll(() => {
  // lib/db reads this on its first query, which happens inside the tests.
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = '';
  db = createClient({ url });
});

afterAll(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

beforeEach(async () => {
  // The live schema's attempts table, after the client_id migration.
  await db.executeMultiple(`
    DROP TRIGGER IF EXISTS fail_level_update;
    DROP TABLE IF EXISTS attempts;
    DROP TABLE IF EXISTS problems;
    CREATE TABLE problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      interval_level INTEGER NOT NULL DEFAULT 0,
      next_due_date TEXT
    );
    CREATE TABLE attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
      time_taken_mins INTEGER NOT NULL,
      struggled INTEGER NOT NULL DEFAULT 0,
      practice_type TEXT,
      client_id TEXT
    );
    CREATE UNIQUE INDEX idx_attempts_client_id ON attempts(client_id);
    INSERT INTO problems (id, name, domain, interval_level, next_due_date) VALUES (1, 'Two Sum', 'dsa', 0, '2026-10-02');
    INSERT INTO problems (id, name, domain) VALUES (2, 'Valid Parentheses', 'dsa');
    INSERT INTO attempts (problem_id, attempted_at, time_taken_mins, struggled) VALUES (1, '2026-10-01 09:00:00', 10, 0);
  `);
});

function post(problemId: number, body: Record<string, unknown>) {
  const req = new NextRequest(`http://localhost/api/problems/${problemId}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return logAttempt(req, { params: Promise.resolve({ id: String(problemId) }) });
}

// A "got it" on 2026-10-02 after the 10-01 first attempt: level 0 → 1, due 3 days later.
const secondReview = { time_taken_mins: 8, struggled: false, attempted_at: '2026-10-02 09:00:00' };

async function scalar(sql: string) {
  return (await db.execute(sql)).rows[0];
}

describe('POST /api/problems/[id]/attempts', () => {
  it('records a retried attempt once and steps the level once', async () => {
    const first = await post(1, { ...secondReview, client_id: 'k1' });
    const retry = await post(1, { ...secondReview, client_id: 'k1' });

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect((await retry.json()).id).toBe((await first.json()).id);
    expect(await scalar(`SELECT COUNT(*) AS n FROM attempts WHERE problem_id = 1`)).toMatchObject({ n: 2 });
    // Inserted twice, the duplicate would have promoted the card again, to level 2.
    expect(await scalar(`SELECT interval_level, next_due_date FROM problems WHERE id = 1`))
      .toMatchObject({ interval_level: 1, next_due_date: '2026-10-05' });
  });

  it('refuses a key already used for a different card', async () => {
    await post(1, { ...secondReview, client_id: 'k1' });
    const res = await post(2, { ...secondReview, client_id: 'k1' });

    expect(res.status).toBe(409);
    expect(await scalar(`SELECT COUNT(*) AS n FROM attempts WHERE problem_id = 2`)).toMatchObject({ n: 0 });
  });

  it('still records every keyless attempt from the online log forms', async () => {
    expect((await post(2, secondReview)).status).toBe(201);
    expect((await post(2, secondReview)).status).toBe(201);
    expect(await scalar(`SELECT COUNT(*) AS n FROM attempts WHERE problem_id = 2`)).toMatchObject({ n: 2 });
  });

  it('returns 404 for a missing card and records nothing', async () => {
    const res = await post(99, { ...secondReview, client_id: 'k1' });
    expect(res.status).toBe(404);
    expect(await scalar(`SELECT COUNT(*) AS n FROM attempts`)).toMatchObject({ n: 1 });
  });

  it('rolls the attempt back when the level update fails', async () => {
    await db.execute(`
      CREATE TRIGGER fail_level_update BEFORE UPDATE OF interval_level ON problems
      BEGIN SELECT RAISE(ABORT, 'simulated failure'); END
    `);
    await expect(post(1, { ...secondReview, client_id: 'k1' })).rejects.toThrow(/simulated failure/);
    // Without the transaction the attempt would be stored while the card's schedule ignored it.
    expect(await scalar(`SELECT COUNT(*) AS n FROM attempts`)).toMatchObject({ n: 1 });
    expect(await scalar(`SELECT interval_level FROM problems WHERE id = 1`)).toMatchObject({ interval_level: 0 });
  });
});

describe('PATCH /api/attempts/[id]', () => {
  it("keeps an edited attempt's time of day, so same-day order and the level survive", async () => {
    // Two reviews on 10-02: a miss at 09:00, then a "got it" at 18:00 → level 0 → 0 → 1.
    await post(1, { time_taken_mins: 5, struggled: true, attempted_at: '2026-10-02 09:00:00' });
    const evening = await (await post(1, { time_taken_mins: 5, struggled: false, attempted_at: '2026-10-02 18:00:00' })).json();

    // What the history editor sends on Save: every field, the date as YYYY-MM-DD.
    const req = new NextRequest(`http://localhost/api/attempts/${evening.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_taken_mins: 6, struggled: false, attempted_at: '2026-10-02' }),
    });
    const res = await editAttempt(req, { params: Promise.resolve({ id: String(evening.id) }) });

    expect((await res.json()).attempted_at).toBe('2026-10-02 18:00:00');
    // Reset to midnight, the "got it" would replay before the miss and leave the card at level 0.
    expect(await scalar(`SELECT interval_level FROM problems WHERE id = 1`)).toMatchObject({ interval_level: 1 });
  });
});

describe('DELETE /api/attempts/[id]', () => {
  it('replays the remaining history in the same transaction', async () => {
    const created = await (await post(1, { ...secondReview, client_id: 'k1' })).json();
    const req = new NextRequest(`http://localhost/api/attempts/${created.id}`, { method: 'DELETE' });
    const res = await deleteAttempt(req, { params: Promise.resolve({ id: String(created.id) }) });

    expect(res.status).toBe(200);
    expect(await scalar(`SELECT interval_level, next_due_date FROM problems WHERE id = 1`))
      .toMatchObject({ interval_level: 0, next_due_date: '2026-10-02' });
  });
});
