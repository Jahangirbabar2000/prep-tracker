import { describe, expect, it } from 'vitest';
import { DEMO_DB, LEGACY_DB, planLocalCleanup, storeDbName, userHintFrom } from './localAccount';

describe('userHintFrom', () => {
  it('reads the user id from the cookie header', () => {
    expect(userHintFrom('pt_demo=0; pt_user=usr_owner; theme=dark')).toBe('usr_owner');
    expect(userHintFrom('pt_user=usr_3f2a-9c')).toBe('usr_3f2a-9c');
  });

  it("ignores a missing or malformed value (it names a database, so it can't be just anything)", () => {
    expect(userHintFrom('')).toBeNull();
    expect(userHintFrom('theme=dark')).toBeNull();
    expect(userHintFrom('pt_user=../../etc')).toBeNull();
    expect(userHintFrom('pt_user=')).toBeNull();
  });
});

describe('storeDbName', () => {
  it('gives the demo its own database and each account its own', () => {
    expect(storeDbName({ demo: true, userId: 'usr_a' })).toBe(DEMO_DB);
    expect(storeDbName({ demo: false, userId: 'usr_a' })).toBe('prep-store-usr_a');
    expect(storeDbName({ demo: false, userId: null })).toBe(LEGACY_DB);
  });
});

describe('planLocalCleanup', () => {
  const ownerId = 'usr_owner';

  it("removes other accounts' databases and leaves the demo's", () => {
    expect(planLocalCleanup({
      userId: 'usr_b', ownerId,
      existing: ['prep-store-usr_a', 'prep-store-usr_b', DEMO_DB, 'some-other-app'],
    })).toEqual({ remove: ['prep-store-usr_a'], migrateLegacyInto: null });
  });

  it("moves the pre-accounts database into the owner's own", () => {
    expect(planLocalCleanup({ userId: ownerId, ownerId, existing: [LEGACY_DB] }))
      .toEqual({ remove: [], migrateLegacyInto: 'prep-store-usr_owner' });
  });

  it('deletes the pre-accounts database when anyone else signs in: it was the owner’s', () => {
    expect(planLocalCleanup({ userId: 'usr_rida', ownerId, existing: [LEGACY_DB, 'prep-store-usr_owner'] }))
      .toEqual({ remove: ['prep-store-usr_owner', LEGACY_DB], migrateLegacyInto: null });
  });

  it('does nothing when only this account is here', () => {
    expect(planLocalCleanup({ userId: 'usr_a', ownerId, existing: ['prep-store-usr_a'] }))
      .toEqual({ remove: [], migrateLegacyInto: null });
  });
});
