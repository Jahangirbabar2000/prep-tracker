import { describe, expect, it, vi } from 'vitest';

// The session's user is taken as live; lib/accountData.test.ts covers that check.
vi.mock('@/lib/accountData', () => ({ isActiveUser: async () => true }));
vi.mock('@/lib/db', () => ({
  queryAll: vi.fn(async () => []),
}));
vi.mock('@/lib/domain-server', () => ({
  getProblems: vi.fn(async () => []),
  getStudyDomains: vi.fn(async () => []),
  getDomainFields: vi.fn(async () => []),
  getDomainFieldOptions: vi.fn(async () => []),
}));

import { NextRequest } from 'next/server';
import { GET as sync } from './sync/route';

// A CDN doesn't key on the session cookie: any shared-cache directive
// (s-maxage, public) on this response would serve one user's data to the next.
describe('GET /api/sync', () => {
  it('is never stored by a shared cache', async () => {
    const res = await sync(new NextRequest('http://localhost/api/sync'), {});
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
