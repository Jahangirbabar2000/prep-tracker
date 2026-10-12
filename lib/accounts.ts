import { writeTransaction, type Queries } from './db';
import { LEGACY_DOMAIN_FALLBACKS, LEGACY_FIELD_FALLBACKS } from './domains';
import type { Identity } from './oidc';

/**
 * The decks a new account starts with: the seven starter domains and their
 * fields, empty — no cards are copied from anyone. Fresh `dom_` ids (domain
 * ids are global; slugs are per user) and no legacy columns (a new user has
 * no rows to keep a rollback dual-write in step with).
 */
export function starterDecks(userId: string, newId: () => string = () => crypto.randomUUID()) {
  const ids = new Map(LEGACY_DOMAIN_FALLBACKS.map(domain => [domain.id, `dom_${newId()}`]));
  const domains = LEGACY_DOMAIN_FALLBACKS.map(domain => ({ ...domain, id: ids.get(domain.id)!, user_id: userId }));
  const fields = LEGACY_FIELD_FALLBACKS.map(field => ({
    domain_id: ids.get(field.domain_id)!,
    key: field.key,
    label: field.label,
    kind: field.kind,
    placeholder: field.placeholder,
    filterable: field.filterable,
    tag_role: field.tag_role,
    sort_order: field.sort_order,
    // DSA difficulty used to be hard-coded; it's the one field with options from the start.
    options: field.domain_id === 'dsa' && field.key === 'difficulty' ? ['Easy', 'Medium', 'Hard'] : [],
  }));
  return { domains, fields };
}

async function seedStarterDecks(tx: Queries, userId: string) {
  const { domains, fields } = starterDecks(userId);
  for (const d of domains) {
    await tx.execute(
      `INSERT INTO study_domains
        (id, user_id, slug, name, short_name, study_mode, icon, color, sort_order, item_label,
         log_label, log_title, empty_message, answer_placeholder, default_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, userId, d.slug, d.name, d.short_name, d.study_mode, d.icon, d.color, d.sort_order, d.item_label,
        d.log_label, d.log_title, d.empty_message, d.answer_placeholder, d.default_link],
    );
  }
  for (const f of fields) {
    const field = await tx.queryOne<{ id: number }>(
      `INSERT INTO domain_fields (user_id, domain_id, key, label, kind, placeholder, filterable, tag_role, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [userId, f.domain_id, f.key, f.label, f.kind, f.placeholder, f.filterable, f.tag_role, f.sort_order],
    );
    for (const [sortOrder, value] of f.options.entries()) {
      await tx.execute(
        'INSERT INTO domain_field_options (user_id, field_id, value, sort_order) VALUES (?, ?, ?, ?)',
        [userId, field!.id, value, sortOrder],
      );
    }
  }
}

export type ResolvedUser = { userId: string; created: boolean } | { error: string };

/**
 * The app user a verified Cognito identity signs in as:
 * 1. the user already linked to this Cognito `sub`;
 * 2. else a user waiting to be linked by verified email (the owner and the
 *    imported accounts are given their email ahead of their first sign-in);
 * 3. else a new user, with the starter decks.
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
    await seedStarterDecks(tx, userId);
    return { userId, created: true };
  });
}
