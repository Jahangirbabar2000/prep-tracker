// @vitest-environment node
// resolveUser against a real migrated database: linking by sub and by
// verified email, and a new account's starter decks, are all SQL.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveUser, starterDecks } from './accounts';

const directory = mkdtempSync(join(tmpdir(), 'prep-accounts-'));
const url = `file:${join(directory, 'test.db')}`;
let db: Client;

beforeAll(() => {
  execFileSync(process.execPath, ['scripts/migrate-domains.mjs'], {
    env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: '' },
    stdio: 'ignore',
  });
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = '';
  db = createClient({ url });
});

afterAll(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.executeMultiple(`
    DELETE FROM domain_field_options WHERE user_id <> 'usr_owner';
    DELETE FROM domain_fields WHERE user_id <> 'usr_owner';
    DELETE FROM study_domains WHERE user_id <> 'usr_owner';
    DELETE FROM users WHERE id <> 'usr_owner';
    UPDATE users SET email = 'owner@example.com', cognito_sub = NULL, deleted_at = NULL WHERE id = 'usr_owner';
  `);
});

const count = async (sql: string, args: unknown[] = []) =>
  Number((await db.execute({ sql, args: args as never[] })).rows[0].n);

describe('resolveUser', () => {
  it('links the waiting owner by verified email, then by sub', async () => {
    expect(await resolveUser({ sub: 'sub-owner', email: 'Owner@Example.com', emailVerified: true }))
      .toEqual({ userId: 'usr_owner', created: false });
    expect(await count(`SELECT COUNT(*) AS n FROM users WHERE id = 'usr_owner' AND cognito_sub = 'sub-owner'`)).toBe(1);
    // A later sign-in finds them by sub, whatever the email says now.
    expect(await resolveUser({ sub: 'sub-owner', email: 'changed@example.com', emailVerified: true }))
      .toEqual({ userId: 'usr_owner', created: false });
  });

  it('never links on an unverified email', async () => {
    const result = await resolveUser({ sub: 'sub-x', email: 'owner@example.com', emailVerified: false });
    expect(result).toMatchObject({ created: true });
    expect('userId' in result && result.userId).not.toBe('usr_owner');
    expect(await count(`SELECT COUNT(*) AS n FROM users WHERE id = 'usr_owner' AND cognito_sub IS NULL`)).toBe(1);
  });

  it('refuses an email another sign-in already owns', async () => {
    await resolveUser({ sub: 'sub-owner', email: 'owner@example.com', emailVerified: true });
    expect(await resolveUser({ sub: 'sub-imposter', email: 'owner@example.com', emailVerified: true }))
      .toEqual({ error: expect.stringMatching(/another account/) });
  });

  it('refuses a deleted account', async () => {
    await resolveUser({ sub: 'sub-owner', email: 'owner@example.com', emailVerified: true });
    await db.execute(`UPDATE users SET deleted_at = datetime('now') WHERE id = 'usr_owner'`);
    expect(await resolveUser({ sub: 'sub-owner', email: null, emailVerified: false }))
      .toEqual({ error: expect.stringMatching(/deleted/) });
  });

  it('creates a new user with the starter decks, empty', async () => {
    const result = await resolveUser({ sub: 'sub-new', email: 'new@example.com', emailVerified: true });
    if (!('userId' in result)) throw new Error(result.error);
    expect(result.created).toBe(true);
    expect(result.userId).toMatch(/^usr_[0-9a-f-]{36}$/);

    const id = result.userId;
    const slugs = (await db.execute({ sql: 'SELECT slug FROM study_domains WHERE user_id = ? ORDER BY sort_order', args: [id] })).rows.map(r => r.slug);
    expect(slugs).toEqual(['dsa', 'system-design', 'lld', 'backend', 'frontend', 'ai', 'behavioral']);
    expect(await count('SELECT COUNT(*) AS n FROM domain_fields WHERE user_id = ?', [id])).toBe(17);
    expect(await count(
      `SELECT COUNT(*) AS n FROM domain_field_options o JOIN domain_fields f ON f.id = o.field_id
       WHERE o.user_id = ? AND f.key = 'difficulty'`, [id],
    )).toBe(3);
    expect(await count('SELECT COUNT(*) AS n FROM problems WHERE user_id = ?', [id])).toBe(0);
    // Their decks are theirs: every field hangs off one of their own domains.
    expect(await count(
      `SELECT COUNT(*) AS n FROM domain_fields f LEFT JOIN study_domains d ON d.id = f.domain_id AND d.user_id = f.user_id
       WHERE f.user_id = ? AND d.id IS NULL`, [id],
    )).toBe(0);
    // And signing in again is the same account, not a second one.
    expect(await resolveUser({ sub: 'sub-new', email: 'new@example.com', emailVerified: true })).toEqual({ userId: id, created: false });
  });
});

describe('starterDecks', () => {
  it('gives every deck a fresh id and keeps each field on its own deck', () => {
    let n = 0;
    const { domains, fields } = starterDecks('usr_x', () => `id${n++}`);
    expect(new Set(domains.map(d => d.id)).size).toBe(7);
    for (const d of domains) expect(d.id).toMatch(/^dom_id\d$/);
    const ids = new Set(domains.map(d => d.id));
    for (const f of fields) expect(ids.has(f.domain_id)).toBe(true);
  });
});
