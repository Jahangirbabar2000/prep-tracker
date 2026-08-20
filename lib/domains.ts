import type {
  DomainField,
  DomainFieldOption,
  Problem,
  StudyDomain,
  StudyMode,
} from './types';

export const STUDY_MODES: readonly StudyMode[] = [
  'timed_problem',
  'flashcard',
] as const;

export const DOMAIN_ICONS = [
  'binary', 'network', 'blocks', 'code', 'layout', 'brain', 'messages',
  'book', 'database', 'globe', 'graduation-cap', 'languages', 'terminal',
] as const;

export const DOMAIN_COLORS = [
  'blue', 'orange', 'amber', 'emerald', 'violet', 'rose', 'teal', 'cyan',
] as const;

export const RESERVED_DOMAIN_SLUGS = new Set([
  'api', 'review', 'settings', 'stats', 'login', 'log', '_next',
]);

/** Migration-only fallback for legacy IndexedDB snapshots without domains. */
export const LEGACY_DOMAIN_FALLBACKS: StudyDomain[] = [
  ['dsa', 'dsa', 'DSA', 'DSA', 'timed_problem', 'binary', 'blue', 0],
  ['system_design', 'system-design', 'System Design', 'SysD', 'flashcard', 'network', 'orange', 1],
  ['lld', 'lld', 'Low-Level Design', 'LLD', 'flashcard', 'blocks', 'amber', 2],
  ['python', 'backend', 'Backend', 'BE', 'flashcard', 'code', 'emerald', 3],
  ['frontend', 'frontend', 'Frontend', 'FE', 'flashcard', 'layout', 'violet', 4],
  ['ai', 'ai', 'AI', 'AI', 'flashcard', 'brain', 'rose', 5],
  ['behavioral', 'behavioral', 'Behavioral', 'Beh', 'flashcard', 'messages', 'teal', 6],
].map(([id, slug, name, shortName, studyMode, icon, color, sortOrder]) => ({
  id: String(id),
  slug: String(slug),
  name: String(name),
  short_name: String(shortName),
  study_mode: studyMode as StudyMode,
  icon: String(icon),
  color: String(color),
  sort_order: Number(sortOrder),
  item_label: id === 'dsa' ? 'Problem' : 'Question',
  log_label: id === 'dsa' ? 'Log Attempt' : 'Log Question',
  log_title: id === 'dsa' ? 'Log DSA Attempt' : `Log ${name} Question`,
  empty_message: id === 'dsa'
    ? 'No problems yet. Log your first attempt to get started.'
    : 'No questions yet. Log your first question to get started.',
  answer_placeholder: 'Write the answer… (markdown supported)',
  default_link: '',
  archived_at: null,
}));

const LEGACY_FIELD_DEFINITIONS = [
  ['dsa', 'difficulty', 'Difficulty', 'select', 'All difficulties', 1, 'none', 0],
  ['dsa', 'platform', 'Platform', 'select', 'All platforms', 0, 'none', 1],
  ['dsa', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 2],
  ['dsa', 'pattern_tag', 'Pattern', 'text', 'All patterns', 1, 'primary', 3],
  ['system_design', 'sd_category', 'Bucket', 'select', 'All buckets', 1, 'primary', 0],
  ['system_design', 'sd_topic', 'Topic', 'select', 'All topics', 1, 'secondary', 1],
  ['system_design', 'sd_source', 'Source', 'text', 'All sources', 0, 'none', 2],
  ['lld', 'lld_category', 'Category', 'select', 'All categories', 1, 'primary', 0],
  ['lld', 'lld_topic', 'Topic', 'select', 'All topics', 1, 'secondary', 1],
  ['python', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 0],
  ['python', 'py_category', 'Category', 'select', 'All categories', 1, 'primary', 1],
  ['frontend', 'fe_bucket', 'Bucket', 'select', 'All buckets', 1, 'primary', 0],
  ['frontend', 'fe_question_set', 'Question Set', 'select', 'All question sets', 0, 'secondary', 1],
  ['ai', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 0],
  ['ai', 'ai_category', 'Category', 'select', 'All categories', 1, 'primary', 1],
  ['behavioral', 'question_list', 'Question List', 'select', 'All question lists', 0, 'secondary', 0],
  ['behavioral', 'beh_category', 'Category', 'select', 'All categories', 1, 'primary', 1],
] as const;

/** Migration-only field registry for legacy IndexedDB snapshots. */
export const LEGACY_FIELD_FALLBACKS: DomainField[] = LEGACY_FIELD_DEFINITIONS.map((
  [domainId, key, label, kind, placeholder, filterable, tagRole, sortOrder],
  index,
) => ({
  id: -(index + 1),
  domain_id: domainId,
  key,
  label,
  kind,
  placeholder,
  filterable,
  tag_role: tagRole,
  sort_order: sortOrder,
  archived_at: null,
  legacy_column: key,
}));

export function legacyOptionsFromConfig(
  config: Array<{ id: number; domain: string; field: string; value: string; sort_order: number }>,
): DomainFieldOption[] {
  const options = config.flatMap(item => {
    const field = LEGACY_FIELD_FALLBACKS.find(candidate =>
      candidate.domain_id === item.domain && candidate.key === item.field && candidate.kind === 'select',
    );
    return field
      ? [{ id: -(10_000 + item.id), field_id: field.id, value: item.value, sort_order: item.sort_order, archived_at: null }]
      : [];
  });
  const difficulty = LEGACY_FIELD_FALLBACKS.find(field =>
    field.domain_id === 'dsa' && field.key === 'difficulty',
  );
  if (difficulty) {
    for (const [sortOrder, value] of ['Easy', 'Medium', 'Hard'].entries()) {
      if (!options.some(option => option.field_id === difficulty.id && option.value === value)) {
        options.push({
          id: -(20_000 + sortOrder),
          field_id: difficulty.id,
          value,
          sort_order: sortOrder,
          archived_at: null,
        });
      }
    }
  }
  return options;
}

export function normalizeDomainSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function isValidDomainSlug(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value)
    && !RESERVED_DOMAIN_SLUGS.has(value);
}

export function activeDomains(domains: StudyDomain[]): StudyDomain[] {
  return domains
    .filter(domain => !domain.archived_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/**
 * IDs of the archived domains. Their cards stay in the store and on the domain
 * page, but they are out of rotation — see reviewQueue() in store/queries.ts and
 * buildPracticeSet() in practice.ts, which both skip them. An id that isn't in
 * this set counts as active, including one missing from `domains` entirely: that
 * is the same call fallbackDomain() below makes with `archived_at: null`, and it
 * keeps a store that hasn't hydrated its domains yet from blanking the queue.
 */
export function archivedDomainIds(domains: StudyDomain[]): Set<string> {
  return new Set(domains.filter(domain => domain.archived_at).map(domain => domain.id));
}

/** Numeric navigation shortcuts: 1 is the queue, 2–9 follow active Settings order. */
export function navigationShortcutMap(domains: StudyDomain[]): Record<string, string> {
  return Object.fromEntries([
    ['1', '/'],
    ...activeDomains(domains)
      .slice(0, 8)
      .map((domain, index) => [String(index + 2), `/${domain.slug}`]),
  ]);
}

export function allDomains(domains: StudyDomain[]): StudyDomain[] {
  return [...domains].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function domainById(domains: StudyDomain[], id: string): StudyDomain | undefined {
  return domains.find(domain => domain.id === id);
}

export function domainBySlug(domains: StudyDomain[], slug: string): StudyDomain | undefined {
  return domains.find(domain => domain.slug === slug);
}

function legacyDomainById(id: string): StudyDomain | undefined {
  return LEGACY_DOMAIN_FALLBACKS.find(domain => domain.id === id);
}

export function domainBySlugWithFallback(
  domains: StudyDomain[],
  problems: Array<Pick<Problem, 'domain'>>,
  slug: string,
): StudyDomain | undefined {
  const configured = domainBySlug(domains, slug);
  if (configured) return configured;
  // Preserve renamed built-in routes (for example internal `python` now lives
  // at `/backend`) while an offline/older IndexedDB snapshot has problems but
  // no runtime domain registry yet.
  const legacy = LEGACY_DOMAIN_FALLBACKS.find(domain => domain.slug === slug);
  if (legacy && problems.some(problem => problem.domain === legacy.id)) return legacy;
  const orphanId = problems.find(problem => fallbackDomain(problem.domain).slug === slug)?.domain;
  return orphanId ? fallbackDomain(orphanId) : undefined;
}

export function fallbackDomain(id: string): StudyDomain {
  const slug = normalizeDomainSlug(id) || 'unknown-domain';
  const name = id.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    id,
    slug,
    name: name || 'Unknown domain',
    short_name: name || 'Unknown',
    study_mode: 'flashcard',
    icon: 'book',
    color: 'blue',
    sort_order: Number.MAX_SAFE_INTEGER,
    item_label: 'Question',
    log_label: 'Log Question',
    log_title: `Log ${name || 'Question'}`,
    empty_message: 'No questions yet. Log your first question to get started.',
    answer_placeholder: 'Write the answer… (markdown supported)',
    default_link: '',
    archived_at: null,
  };
}

export function resolveDomain(domains: StudyDomain[], id: string): StudyDomain {
  return domainById(domains, id) ?? legacyDomainById(id) ?? fallbackDomain(id);
}

export function domainPath(domains: StudyDomain[], id: string): string {
  return `/${resolveDomain(domains, id).slug}`;
}

export function fieldsForDomain(
  fields: DomainField[],
  domainId: string,
  includeArchived = false,
): DomainField[] {
  return fields
    .filter(field =>
      field.domain_id === domainId && (includeArchived || !field.archived_at),
    )
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/**
 * Field values in the order Settings configures them, with anything not
 * configured appended alphabetically.
 *
 * Filter dropdowns derive their options from the cards themselves, so they
 * can't offer a value that would match nothing. That derivation used to end in
 * a plain alphabetical sort, which scrambled any deck whose options carry a
 * meaning order — the Behavioral categories follow the course's article order,
 * and read as nonsense filed under C-D-D-P-S-T-W. `configured` comes from
 * optionsForField(), so the dropdown and the log form agree.
 */
export function orderFieldValues(values: string[], configured: string[]): string[] {
  const rank = new Map(configured.map((value, index) => [value, index]));
  return [...values].sort((a, b) => {
    const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    return ra !== rb ? ra - rb : a.localeCompare(b);
  });
}

export function optionsForField(
  options: DomainFieldOption[],
  fieldId: number,
): DomainFieldOption[] {
  return options
    .filter(option => option.field_id === fieldId && !option.archived_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function cardTagsFromFields(problem: Problem, fields: DomainField[]): string[] {
  return tagsForMetadata(problem.domain, problem.metadata, fields);
}

export function tagsForMetadata(
  domainId: string,
  metadata: Record<string, string>,
  fields: DomainField[],
): string[] {
  const domainFields = fieldsForDomain(fields, domainId);
  const values = (['primary', 'secondary'] as const)
    .map(role => domainFields.find(field => field.tag_role === role))
    .map(field => field ? metadata[field.key] : undefined)
    .filter((value): value is string => !!value);
  return [...new Set(values)];
}

export function metadataValue(problem: Problem, key: string): string {
  return problem.metadata?.[key] ?? '';
}

export function validateMetadataValues(
  input: unknown,
  fields: DomainField[],
  options: DomainFieldOption[],
): { metadata: Record<string, string> } | { error: string } {
  if (input == null) return { metadata: {} };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'metadata must be an object' };
  }
  const byKey = new Map(fields.map(field => [field.key, field]));
  const metadata: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = byKey.get(key);
    if (!field) return { error: `Unknown metadata field: ${key}` };
    if (raw == null || raw === '') continue;
    if (typeof raw !== 'string') {
      return { error: `Metadata field ${key} must be a string` };
    }
    const value = raw.trim();
    if (
      field.kind === 'select'
      && !options.some(option =>
        option.field_id === field.id
        && !option.archived_at
        && option.value === value
      )
    ) {
      return { error: `Invalid option for metadata field: ${key}` };
    }
    metadata[key] = value;
  }
  return { metadata };
}

const LEGACY_FIELD_COLUMNS = [
  'platform', 'pattern_tag', 'question_list', 'difficulty',
  'sd_category', 'sd_topic', 'sd_source',
  'fe_bucket', 'fe_question_set', 'py_category', 'ai_category',
  'lld_category', 'lld_topic', 'beh_category',
] as const;

/** Upgrade legacy server/IndexedDB problem rows into the runtime metadata shape. */
export function normalizeProblem(problem: Partial<Problem> & Pick<Problem, 'id' | 'name' | 'domain'>): Problem {
  let parsed: Record<string, string> = {};
  const rawMetadata = (problem as unknown as { metadata_json?: unknown }).metadata_json;
  if (problem.metadata && typeof problem.metadata === 'object') {
    parsed = { ...problem.metadata };
  } else if (typeof rawMetadata === 'string' && rawMetadata) {
    try {
      const value = JSON.parse(rawMetadata);
      if (value && typeof value === 'object' && !Array.isArray(value)) parsed = value;
    } catch {
      parsed = {};
    }
  }
  for (const column of LEGACY_FIELD_COLUMNS) {
    const value = problem[column];
    if (value != null && value !== '' && parsed[column] == null) parsed[column] = String(value);
  }
  return { ...problem, metadata: parsed } as Problem;
}

export function isTimedMode(mode: StudyMode): boolean {
  return mode === 'timed_problem';
}

/**
 * Coerce a persisted study_mode into a currently-valid one. The retired
 * `flashcard_practice` (Solo/Mock) mode collapses to plain `flashcard`, so
 * older domain rows load and render correctly without a DB migration.
 */
export function normalizeStudyMode(mode: string): StudyMode {
  return mode === 'timed_problem' ? 'timed_problem' : 'flashcard';
}

/** Apply study_mode coercion to a domain as it enters the runtime store. */
export function normalizeDomain(domain: StudyDomain): StudyDomain {
  const mode = normalizeStudyMode(domain.study_mode);
  return mode === domain.study_mode ? domain : { ...domain, study_mode: mode };
}
