import { describe, expect, it } from 'vitest';
import type { DomainField, DomainFieldOption, Problem, StudyDomain } from './types';
import {
  activeDomains,
  archivedDomainIds,
  cardTagsFromFields,
  domainBySlugWithFallback,
  domainBySlug,
  domainPath,
  isTimedMode,
  isValidDomainSlug,
  legacyOptionsFromConfig,
  navigationShortcutMap,
  normalizeDomainSlug,
  normalizeProblem,
  normalizeStudyMode,
  orderFieldValues,
  validateMetadataValues,
} from './domains';

const domains: StudyDomain[] = [
  {
    id: 'dsa', slug: 'dsa', name: 'DSA', short_name: 'DSA',
    study_mode: 'timed_problem', icon: 'binary', color: 'blue', sort_order: 1,
    item_label: 'Problem', log_label: 'Log Attempt', log_title: 'Log DSA Attempt',
    empty_message: 'Empty', answer_placeholder: 'Notes', default_link: '', archived_at: null,
  },
  {
    id: 'custom', slug: 'databases', name: 'Databases', short_name: 'DB',
    study_mode: 'flashcard', icon: 'database', color: 'cyan', sort_order: 0,
    item_label: 'Question', log_label: 'Log Question', log_title: 'Log Database Question',
    empty_message: 'Empty', answer_placeholder: 'Answer', default_link: '', archived_at: '2026-07-29',
  },
];

const fields: DomainField[] = [
  { id: 1, domain_id: 'dsa', key: 'pattern', label: 'Pattern', kind: 'text', placeholder: '', filterable: 1, tag_role: 'primary', sort_order: 0, archived_at: null, legacy_column: 'pattern_tag' },
  { id: 2, domain_id: 'dsa', key: 'list', label: 'List', kind: 'select', placeholder: '', filterable: 0, tag_role: 'secondary', sort_order: 1, archived_at: null, legacy_column: 'question_list' },
];

const options: DomainFieldOption[] = [
  { id: 1, field_id: 2, value: 'Blind 75', sort_order: 0, archived_at: null },
  { id: 2, field_id: 2, value: 'Archived list', sort_order: 1, archived_at: '2026-07-29' },
];

describe('runtime domains', () => {
  it('resolves stable IDs to configured slugs and excludes archived domains from navigation', () => {
    expect(domainPath(domains, 'dsa')).toBe('/dsa');
    expect(domainBySlug(domains, 'databases')?.id).toBe('custom');
    expect(activeDomains(domains).map(domain => domain.id)).toEqual(['dsa']);
  });

  // The set the review queue and practice sets filter cards against, so that
  // archiving a domain takes it out of rotation without touching its cards.
  it('reports the archived domain IDs, and nothing for an all-active registry', () => {
    expect([...archivedDomainIds(domains)]).toEqual(['custom']);
    expect(archivedDomainIds([domains[0]]).size).toBe(0);
    expect(archivedDomainIds([]).size).toBe(0);
  });

  it('keeps renamed built-in detail routes valid without a hydrated domain registry', () => {
    expect(domainPath([], 'python')).toBe('/backend');
    expect(domainPath([], 'system_design')).toBe('/system-design');
    expect(domainBySlugWithFallback([], [{ domain: 'python' }], 'backend')?.id).toBe('python');
  });

  it('assigns numeric shortcuts from active Settings order and skips archived domains', () => {
    const backend = {
      ...domains[0],
      id: 'backend',
      slug: 'backend',
      name: 'Backend',
      sort_order: -1,
    };
    expect(navigationShortcutMap([...domains, backend])).toEqual({
      '1': '/',
      '2': '/backend',
      '3': '/dsa',
    });
  });

  it('normalizes and validates user-entered slugs', () => {
    expect(normalizeDomainSlug('  TOEFL Vocabulary  ')).toBe('toefl-vocabulary');
    expect(isValidDomainSlug('toefl-vocabulary')).toBe(true);
    expect(isValidDomainSlug('api')).toBe(false);
  });

  it('derives card tags from field roles instead of domain IDs', () => {
    const problem = {
      id: 1, name: 'Binary search', domain: 'dsa',
      metadata: { pattern: 'Binary Search', list: 'Blind 75' },
      interval_level: 0, created_at: '2026-07-29',
    } as Problem;
    expect(cardTagsFromFields(problem, fields)).toEqual(['Binary Search', 'Blind 75']);
  });

  it('upgrades legacy problem columns into metadata', () => {
    const problem = normalizeProblem({
      id: 1, name: 'Two Sum', domain: 'dsa', pattern_tag: 'Arrays',
      interval_level: 0, created_at: '2026-07-29',
    });
    expect(problem.metadata.pattern_tag).toBe('Arrays');
  });

  it('upgrades legacy Settings options for offline IndexedDB snapshots', () => {
    const upgraded = legacyOptionsFromConfig([
      { id: 4, domain: 'dsa', field: 'question_list', value: 'Blind 75', sort_order: 2 },
      { id: 5, domain: 'dsa', field: 'default_link', value: 'https://example.com', sort_order: 0 },
    ]);
    expect(upgraded.some(option => option.value === 'Blind 75')).toBe(true);
    expect(upgraded.some(option => option.value === 'https://example.com')).toBe(false);
    expect(upgraded.filter(option => ['Easy', 'Medium', 'Hard'].includes(option.value))).toHaveLength(3);
  });

  it('keeps workflow behavior behind explicit study-mode extension points', () => {
    expect(isTimedMode('timed_problem')).toBe(true);
    expect(isTimedMode('flashcard')).toBe(false);
  });

  it('coerces the retired flashcard_practice mode to plain flashcard', () => {
    expect(normalizeStudyMode('flashcard_practice')).toBe('flashcard');
    expect(normalizeStudyMode('flashcard')).toBe('flashcard');
    expect(normalizeStudyMode('timed_problem')).toBe('timed_problem');
    expect(normalizeStudyMode('anything-unknown')).toBe('flashcard');
  });

  it('validates metadata keys, types, and managed-select options', () => {
    expect(validateMetadataValues(
      { pattern: ' Arrays ', list: 'Blind 75' },
      fields,
      options,
    )).toEqual({ metadata: { pattern: 'Arrays', list: 'Blind 75' } });
    expect(validateMetadataValues({ unknown: 'x' }, fields, options)).toEqual({
      error: 'Unknown metadata field: unknown',
    });
    expect(validateMetadataValues({ list: 'Archived list' }, fields, options)).toEqual({
      error: 'Invalid option for metadata field: list',
    });
    expect(validateMetadataValues({ pattern: 42 }, fields, options)).toEqual({
      error: 'Metadata field pattern must be a string',
    });
  });
});

describe('orderFieldValues', () => {
  // The Behavioral categories: a course order that alphabetical sorting ruins.
  const configured = [
    'Why the Behavioral Matters',
    'Decode: How Interviews Work',
    'Select: Choosing Responses',
    'The Big Three Questions',
  ];

  it('follows the configured order rather than the alphabet', () => {
    const present = ['Select: Choosing Responses', 'Why the Behavioral Matters', 'Decode: How Interviews Work'];
    expect(orderFieldValues(present, configured)).toEqual([
      'Why the Behavioral Matters',
      'Decode: How Interviews Work',
      'Select: Choosing Responses',
    ]);
  });

  it('appends unconfigured values alphabetically, after everything configured', () => {
    expect(orderFieldValues(['Zebra', 'Select: Choosing Responses', 'Ad hoc'], configured))
      .toEqual(['Select: Choosing Responses', 'Ad hoc', 'Zebra']);
  });

  it('falls back to alphabetical when nothing is configured, and does not mutate its input', () => {
    const present = ['Graphs', 'Arrays'];
    expect(orderFieldValues(present, [])).toEqual(['Arrays', 'Graphs']);
    expect(present).toEqual(['Graphs', 'Arrays']);
  });
});
