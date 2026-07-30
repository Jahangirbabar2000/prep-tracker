import { queryAll, queryOne } from './db';
import { normalizeProblem, validateMetadataValues } from './domains';
import type { DomainField, DomainFieldOption, Problem, StudyDomain } from './types';

export async function getStudyDomains(): Promise<StudyDomain[]> {
  return queryAll<StudyDomain>('SELECT * FROM study_domains ORDER BY sort_order, name');
}

export async function getDomainFields(): Promise<DomainField[]> {
  return queryAll<DomainField>('SELECT * FROM domain_fields ORDER BY domain_id, sort_order, id');
}

export async function getDomainFieldOptions(): Promise<DomainFieldOption[]> {
  return queryAll<DomainFieldOption>('SELECT * FROM domain_field_options ORDER BY field_id, sort_order, id');
}

export async function getStudyDomain(id: string): Promise<StudyDomain | null> {
  return queryOne<StudyDomain>('SELECT * FROM study_domains WHERE id = ?', [id]);
}

export async function getStudyDomainBySlug(slug: string): Promise<StudyDomain | null> {
  return queryOne<StudyDomain>('SELECT * FROM study_domains WHERE lower(slug) = lower(?)', [slug]);
}

export async function getProblem(id: string | number): Promise<Problem | null> {
  const row = await queryOne<Problem & { metadata_json?: string }>('SELECT * FROM problems WHERE id = ?', [id]);
  return row ? normalizeProblem(row) : null;
}

export async function getProblems(sql = 'SELECT * FROM problems', args: unknown[] = []): Promise<Problem[]> {
  const rows = await queryAll<Problem & { metadata_json?: string }>(sql, args);
  return rows.map(normalizeProblem);
}

export async function validateProblemMetadata(
  domainId: string,
  input: unknown,
): Promise<{ metadata: Record<string, string>; fields: DomainField[] } | { error: string }> {
  const fields = await queryAll<DomainField>(
    'SELECT * FROM domain_fields WHERE domain_id = ? AND archived_at IS NULL',
    [domainId],
  );
  const selectFieldIds = fields.filter(field => field.kind === 'select').map(field => field.id);
  const options = selectFieldIds.length
    ? await queryAll<DomainFieldOption>(
        `SELECT * FROM domain_field_options
         WHERE archived_at IS NULL AND field_id IN (${selectFieldIds.map(() => '?').join(', ')})`,
        selectFieldIds,
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
