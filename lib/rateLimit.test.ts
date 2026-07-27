import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rateLimit';

describe('createRateLimiter', () => {
  it('allows up to the limit within the window, then blocks', () => {
    const t = 1_000_000;
    const check = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    expect(check('a').ok).toBe(true);
    expect(check('a').ok).toBe(true);
    const third = check('a');
    expect(third.ok).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it('reports retryAfter counting down toward the window edge', () => {
    let t = 0;
    const check = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    check('a'); // at t=0
    check('a');
    t = 30_000; // 30s later, oldest hit expires in 30s
    expect(check('a')).toEqual({ ok: false, retryAfter: 30 });
  });

  it('lets requests through again once the window slides past old hits', () => {
    let t = 0;
    const check = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    check('a');
    check('a');
    t = 60_001; // both hits now older than the window
    expect(check('a').ok).toBe(true);
  });

  it('tracks keys independently', () => {
    const t = 0;
    const check = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t });
    check('a');
    check('a');
    expect(check('a').ok).toBe(false);
    expect(check('b').ok).toBe(true); // different key, own budget
  });
});
