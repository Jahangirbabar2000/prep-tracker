import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  queryAll: vi.fn(async () => []),
  localToday: vi.fn(() => '2026-10-07'),
}));
vi.mock('@/lib/domain-server', () => ({
  getProblems: vi.fn(async () => []),
  getStudyDomains: vi.fn(async () => []),
  getDomainFields: vi.fn(async () => []),
  getDomainFieldOptions: vi.fn(async () => []),
}));

import { GET as sync } from './sync/route';
import { GET as reviewQueue } from './review-queue/route';

// A CDN doesn't key on the session cookie: any shared-cache directive
// (s-maxage, public) on these responses would serve one user's data to the next.
describe('per-user data endpoints', () => {
  it.each([
    ['/api/sync', sync],
    ['/api/review-queue', reviewQueue],
  ])('%s is never stored by a shared cache', async (_path, handler) => {
    const res = await handler();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
