import { describe, it, expect } from 'vitest';
import { createSession, verifySession, timingSafeEqual, AUTH_MAX_AGE_S } from './auth';

const SECRET = 'test-secret-value';

describe('session tokens', () => {
  it('verifies a freshly minted token', async () => {
    const token = await createSession(SECRET);
    expect(await verifySession(token, SECRET)).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSession(SECRET);
    expect(await verifySession(token, 'other-secret')).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const token = await createSession(SECRET);
    const [, sig] = token.split('.');
    const forged = `${btoa('{"iat":0,"exp":9999999999999}').replace(/=+$/, '')}.${sig}`;
    expect(await verifySession(forged, SECRET)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const now = 1_000_000_000_000;
    const token = await createSession(SECRET, now);
    const later = now + AUTH_MAX_AGE_S * 1000 + 1;
    expect(await verifySession(token, SECRET, later)).toBe(false);
  });

  it('rejects missing token or secret', async () => {
    expect(await verifySession(undefined, SECRET)).toBe(false);
    expect(await verifySession('a.b', undefined)).toBe(false);
    expect(await verifySession('', SECRET)).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('matches equal strings and rejects differing ones', () => {
    expect(timingSafeEqual('hunter2', 'hunter2')).toBe(true);
    expect(timingSafeEqual('hunter2', 'hunter3')).toBe(false);
    expect(timingSafeEqual('short', 'longer')).toBe(false);
  });
});
