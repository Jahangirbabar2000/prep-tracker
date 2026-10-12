// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE, createSession } from '@/lib/auth';
import { proxy } from './proxy';

const SECRET = 'test-secret';

async function signedIn(path: string) {
  vi.stubEnv('AUTH_SECRET', SECRET);
  const token = await createSession(SECRET);
  return new NextRequest(`https://prep.test${path}`, {
    headers: { cookie: `${AUTH_COOKIE}=${token}` },
  });
}

afterEach(() => vi.unstubAllEnvs());

// The proxy runs behind the CDN on AWS, so a page the CDN keeps is a page the
// proxy never sees again: it must not be cacheable by a shared cache.
describe('proxy Cache-Control', () => {
  it('marks an allowed page private', async () => {
    const res = await proxy(await signedIn('/stats'));
    expect(res.headers.get('Cache-Control')).toBe('private, no-cache');
  });

  it('leaves API routes to set their own', async () => {
    const res = await proxy(await signedIn('/api/sync'));
    expect(res.headers.get('Cache-Control')).toBeNull();
  });
});
