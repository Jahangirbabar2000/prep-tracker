// Which IndexedDB database holds this browser's copy of an account, and what
// to clear when a different account signs in on the same device. Pure, so the
// rules are unit-tested; lib/store/idb.ts acts on them.
//
// The server sets `pt_user` (readable, unlike the httpOnly session cookie) to
// the signed-in user's id. It only picks a database name — every read and
// write is still checked against the real session on the server.

export const USER_HINT_COOKIE = 'pt_user';
export const DEMO_DB = 'prep-store-demo';
/** The one database every account shared before accounts existed: the owner's. */
export const LEGACY_DB = 'prep-store';
const ACCOUNT_DB_PREFIX = 'prep-store-usr_';

/** The user id `pt_user` names in a Cookie header (or document.cookie), if any. */
export function userHintFrom(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === USER_HINT_COOKIE) {
      const value = decodeURIComponent(rest.join('='));
      return /^usr_[A-Za-z0-9_-]+$/.test(value) ? value : null;
    }
  }
  return null;
}

/**
 * The database for this page: the demo's own, else one per account. With no
 * hint (auth off in local dev, or a session from before the hint existed)
 * it's the legacy shared name, as before.
 */
export function storeDbName({ demo, userId }: { demo: boolean; userId: string | null }): string {
  if (demo) return DEMO_DB;
  return userId ? `prep-store-${userId}` : LEGACY_DB;
}

export const isAccountDb = (name: string) => name === LEGACY_DB || name.startsWith(ACCOUNT_DB_PREFIX);

/**
 * On boot, for the signed-in `userId`: every other account's database on this
 * device goes (a shared device must not keep showing — or later upload — the
 * last person's data), and the legacy shared one is moved into the owner's
 * own database, unsent reviews and all, or deleted if someone else signed in.
 */
export function planLocalCleanup({ userId, existing, ownerId }: {
  userId: string;
  existing: string[];
  ownerId: string;
}): { remove: string[]; migrateLegacyInto: string | null } {
  const mine = storeDbName({ demo: false, userId });
  const remove = existing.filter(name => name.startsWith(ACCOUNT_DB_PREFIX) && name !== mine);
  const hasLegacy = existing.includes(LEGACY_DB);
  const migrateLegacyInto = hasLegacy && userId === ownerId ? mine : null;
  if (hasLegacy && !migrateLegacyInto) remove.push(LEGACY_DB);
  return { remove, migrateLegacyInto };
}
