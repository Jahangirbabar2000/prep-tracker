import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoCookieIsSet, installDemoFetchGuard, isDemo } from './mode';

const clearCookie = () => { document.cookie = 'pt_demo=; max-age=0; path=/'; };
afterEach(() => { clearCookie(); vi.unstubAllGlobals(); });

describe('demoCookieIsSet', () => {
  it('finds the switch among other cookies, and only when it is on', () => {
    expect(demoCookieIsSet('a=1; pt_demo=1; b=2')).toBe(true);
    expect(demoCookieIsSet('pt_demo=0')).toBe(false);
    expect(demoCookieIsSet('xpt_demo=1')).toBe(false);
    expect(demoCookieIsSet(undefined)).toBe(false);
  });

  it('reads the page cookie in the browser', () => {
    expect(isDemo()).toBe(false);
    document.cookie = 'pt_demo=1; path=/';
    expect(isDemo()).toBe(true);
  });
});

describe('installDemoFetchGuard', () => {
  it('turns every /api request into a local 403, and leaves other sites alone', async () => {
    const real = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', real);
    document.cookie = 'pt_demo=1; path=/';
    installDemoFetchGuard();

    const write = await fetch('/api/problems/1/attempts', { method: 'POST', body: '{}' });
    const read = await fetch('/api/sync');
    expect([write.status, read.status]).toEqual([403, 403]);
    expect(real).not.toHaveBeenCalled();

    await fetch('https://leetcode.com/problems/two-sum/');
    expect(real).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the demo', async () => {
    const real = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', real);
    installDemoFetchGuard();
    await fetch('/api/sync');
    expect(real).toHaveBeenCalledTimes(1);
  });
});
