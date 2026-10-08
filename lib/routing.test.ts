import { describe, expect, it } from 'vitest';
import { decideRoute, safeNextPath } from './routing';

describe('decideRoute', () => {
  const visit = (pathname: string, opts: { authEnabled?: boolean; signedIn?: boolean; search?: string } = {}) =>
    decideRoute({ pathname, search: opts.search ?? '', authEnabled: opts.authEnabled ?? true, signedIn: opts.signedIn ?? false });

  it('lets everything through when the passcode gate is off', () => {
    expect(visit('/stats', { authEnabled: false })).toEqual({ kind: 'allow' });
    expect(visit('/api/sync', { authEnabled: false })).toEqual({ kind: 'allow' });
  });

  it('lets a signed-in visitor through', () => {
    expect(visit('/', { signedIn: true })).toEqual({ kind: 'allow' });
    expect(visit('/api/sync', { signedIn: true })).toEqual({ kind: 'allow' });
  });

  it('answers a signed-out API call with a 401 instead of a redirect', () => {
    expect(visit('/api/sync')).toEqual({ kind: 'unauthorized' });
    expect(visit('/api')).toEqual({ kind: 'unauthorized' });
  });

  it('sends a signed-out page visit to sign in, keeping where it was going', () => {
    expect(visit('/stats', { search: '?domain=dsa' })).toEqual({ kind: 'sign-in', next: '/stats?domain=dsa' });
    expect(visit('/')).toEqual({ kind: 'sign-in', next: '/' });
  });

  it("doesn't mistake a page that merely starts with 'api' for the API", () => {
    expect(visit('/apiary')).toEqual({ kind: 'sign-in', next: '/apiary' });
  });
});

describe('safeNextPath', () => {
  it('keeps a path on this site', () => {
    expect(safeNextPath('/stats?domain=dsa')).toBe('/stats?domain=dsa');
  });

  it('refuses anything that would leave the site', () => {
    for (const raw of ['//evil.example', '/\\evil.example', 'https://evil.example', 'evil.example', '']) {
      expect(safeNextPath(raw), raw).toBe('/');
    }
    expect(safeNextPath(null)).toBe('/');
  });
});
