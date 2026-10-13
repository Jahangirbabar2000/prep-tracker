import { writeTransaction } from './db';
import type { Identity } from './oidc';

export type ResolvedUser = { userId: string; created: boolean } | { error: string };

/**
 * The app user a verified Cognito identity signs in as:
 * 1. the user already linked to this Cognito `sub`;
 * 2. else a user waiting to be linked by verified email (the owner and the
 *    imported accounts are given their email ahead of their first sign-in);
 * 3. else a new user, with no decks: the Review Queue's first-run screen
 *    asks them to create one (components/QueueEmptyState.tsx).
 * An email is only ever trusted once Cognito has verified it.
 */
export async function resolveUser(identity: Identity): Promise<ResolvedUser> {
  return writeTransaction(async tx => {
    const linked = await tx.queryOne<{ id: string; deleted_at: string | null }>(
      'SELECT id, deleted_at FROM users WHERE cognito_sub = ?',
      [identity.sub],
    );
    if (linked) {
      return linked.deleted_at ? { error: 'This account was deleted.' } : { userId: linked.id, created: false };
    }

    const email = identity.emailVerified && identity.email ? identity.email.trim() : null;
    if (email) {
      const byEmail = await tx.queryOne<{ id: string; cognito_sub: string | null; deleted_at: string | null }>(
        'SELECT id, cognito_sub, deleted_at FROM users WHERE lower(email) = lower(?)',
        [email],
      );
      if (byEmail) {
        // Someone else's sign-in already owns this email (e.g. a Cognito
        // account that was deleted and made again): don't hand the data over.
        if (byEmail.cognito_sub || byEmail.deleted_at) {
          return { error: 'That email belongs to another account. Contact the site owner.' };
        }
        await tx.execute('UPDATE users SET cognito_sub = ? WHERE id = ?', [identity.sub, byEmail.id]);
        return { userId: byEmail.id, created: false };
      }
    }

    const userId = `usr_${crypto.randomUUID()}`;
    await tx.execute(
      'INSERT INTO users (id, email, cognito_sub) VALUES (?, ?, ?)',
      [userId, email, identity.sub],
    );
    return { userId, created: true };
  });
}
