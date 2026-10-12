import { queryAll, queryOne, writeTransaction } from './db';

/**
 * The per-user tables, children before parents: the order a delete must go
 * in. Keep in step with USER_TABLES in scripts/migrate-domains.mjs.
 */
export const ACCOUNT_TABLES = [
  'attempts', 'notes', 'links', 'problems',
  'domain_field_options', 'domain_fields', 'config_options', 'study_domains',
  'plan_tasks', 'study_plans',
] as const;

/** Everything one account holds, for the "Download my data" export. */
export async function exportAccount(userId: string) {
  const user = await queryOne<{ id: string; email: string | null; created_at: string }>(
    'SELECT id, email, created_at FROM users WHERE id = ?',
    [userId],
  );
  const tables: Record<string, unknown[]> = {};
  for (const table of ACCOUNT_TABLES) {
    tables[table] = await queryAll(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY id`, [userId]);
  }
  return { exported_at: new Date().toISOString(), user, ...tables };
}

/**
 * Delete an account: every row it owns, in one transaction, and the user
 * marked deleted with its email and Cognito link cleared — so the same email
 * can start a fresh account later, and a session minted before the delete
 * stops working (lib/currentUser.ts checks deleted_at).
 */
export async function deleteAccount(userId: string): Promise<{ cognitoSub: string | null }> {
  return writeTransaction(async tx => {
    const user = await tx.queryOne<{ cognito_sub: string | null }>('SELECT cognito_sub FROM users WHERE id = ?', [userId]);
    for (const table of ACCOUNT_TABLES) await tx.execute(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    await tx.execute(
      `UPDATE users SET deleted_at = datetime('now'), email = NULL, cognito_sub = NULL WHERE id = ?`,
      [userId],
    );
    return { cognitoSub: user?.cognito_sub ?? null };
  });
}

/** True for a user that exists and hasn't been deleted. */
export async function isActiveUser(userId: string): Promise<boolean> {
  const row = await queryOne<{ deleted_at: string | null }>('SELECT deleted_at FROM users WHERE id = ?', [userId]);
  return !!row && !row.deleted_at;
}
