import { queryAll, queryOne } from './db';
import { normalizeProblem, validateMetadataValues } from './domains';
import type { DomainField, DomainFieldOption, Problem, StudyDomain } from './types';

// Every helper takes the signed-in user's id and reads only their rows.

export async function getStudyDomains(userId: string): Promise<StudyDomain[]> {
  return queryAll<StudyDomain>('SELECT * FROM study_domains WHERE user_id = ? ORDER BY sort_order, name', [userId]);
}

export async function getDomainFields(userId: string): Promise<DomainField[]> {
  return queryAll<DomainField>('SELECT * FROM domain_fields WHERE user_id = ? ORDER BY domain_id, sort_order, id', [userId]);
}

export async function getDomainFieldOptions(userId: string): Promise<DomainFieldOption[]> {
  return queryAll<DomainFieldOption>(
    'SELECT * FROM domain_field_options WHERE user_id = ? ORDER BY field_id, sort_order, id',
    [userId],
  );
}

export async function getStudyDomain(userId: string, id: string): Promise<StudyDomain | null> {
  return queryOne<StudyDomain>('SELECT * FROM study_domains WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function getStudyDomainBySlug(userId: string, slug: string): Promise<StudyDomain | null> {
  return queryOne<StudyDomain>('SELECT * FROM study_domains WHERE lower(slug) = lower(?) AND user_id = ?', [slug, userId]);
}

export async function getProblem(userId: string, id: string | number): Promise<Problem | null> {
  const row = await queryOne<Problem & { metadata_json?: string }>(
    'SELECT * FROM problems WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row ? normalizeProblem(row) : null;
}

/** `where` is extra SQL ANDed onto the user filter, with its own `args`. */
export async function getProblems(
  userId: string,
  where = '',
  args: unknown[] = [],
  orderBy = '',
): Promise<Problem[]> {
  const rows = await queryAll<Problem & { metadata_json?: string }>(
    `SELECT * FROM problems WHERE user_id = ?${where ? ` AND ${where}` : ''}${orderBy ? ` ORDER BY ${orderBy}` : ''}`,
    [userId, ...args],
  );
  return rows.map(normalizeProblem);
}

export async function validateProblemMetadata(
  userId: string,
  domainId: string,
  input: unknown,
): Promise<{ metadata: Record<string, string>; fields: DomainField[] } | { error: string }> {
  const fields = await queryAll<DomainField>(
    'SELECT * FROM domain_fields WHERE domain_id = ? AND user_id = ? AND archived_at IS NULL',
    [domainId, userId],
  );
  const selectFieldIds = fields.filter(field => field.kind === 'select').map(field => field.id);
  const options = selectFieldIds.length
    ? await queryAll<DomainFieldOption>(
        `SELECT * FROM domain_field_options
         WHERE user_id = ? AND archived_at IS NULL AND field_id IN (${selectFieldIds.map(() => '?').join(', ')})`,
        [userId, ...selectFieldIds],
      )
    : [];
  const result = validateMetadataValues(input, fields, options);
  if ('error' in result) {
    return result;
  }
  return { metadata: result.metadata, fields };
}

export function legacyWrites(
  metadata: Record<string, string>,
  fields: DomainField[],
): Array<{ column: string; value: string }> {
  return fields
    .filter(field => field.legacy_column && /^[a-z_][a-z0-9_]*$/.test(field.legacy_column))
    .filter(field => Object.hasOwn(metadata, field.key))
    .map(field => ({ column: field.legacy_column!, value: metadata[field.key] }));
}
