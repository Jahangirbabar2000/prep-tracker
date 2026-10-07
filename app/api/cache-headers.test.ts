import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  queryAll: vi.fn(async () => []),
}));
vi.mock('@/lib/domain-server', () => ({
  getProblems: vi.fn(async () => []),
  getStudyDomains: vi.fn(async () => []),
  getDomainFields: vi.fn(async () => []),
  getDomainFieldOptions: vi.fn(async () => []),
}));

import { GET as sync } from './sync/route';

// A CDN doesn't key on the session cookie: any shared-cache directive
// (s-maxage, public) on this response would serve one user's data to the next.
describe('GET /api/sync', () => {
  it('is never stored by a shared cache', async () => {
    const res = await sync();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
