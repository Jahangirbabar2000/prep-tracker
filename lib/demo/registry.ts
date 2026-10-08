// The demo's domains, fields and options. They mirror the real app's DSA,
// System Design and AWS domains (same ids, slugs, fields and roles), so every
// screen behaves exactly as it does for a real deck — minus anything pointing
// at a paid course: no default links, and System Design is a plain flashcard
// domain rather than the Solo/Mock variant.

import type { DomainField, DomainFieldOption, StudyDomain } from '@/lib/types';
import { DEMO_CARDS, type DemoDomainId } from './cards';

const base = {
  default_link: '',
  archived_at: null,
} as const;

export const DEMO_DOMAINS: StudyDomain[] = [
  {
    ...base, id: 'dsa', slug: 'dsa', name: 'DSA', short_name: 'DSA', study_mode: 'timed_problem',
    icon: 'binary', color: 'blue', sort_order: 0, item_label: 'Problem', log_label: 'Log Attempt',
    log_title: 'Log DSA Attempt', empty_message: 'No problems yet.', answer_placeholder: 'Short context… (markdown supported)',
  },
  {
    ...base, id: 'system_design', slug: 'system-design', name: 'System Design', short_name: 'SysD', study_mode: 'flashcard',
    icon: 'network', color: 'orange', sort_order: 1, item_label: 'Question', log_label: 'Log Question',
    log_title: 'Log System Design Question', empty_message: 'No concepts yet.', answer_placeholder: 'Key points, tradeoffs, when to use it… (markdown supported)',
  },
  {
    ...base, id: 'aws', slug: 'aws', name: 'AWS', short_name: 'AWS', study_mode: 'flashcard',
    icon: 'globe', color: 'amber', sort_order: 2, item_label: 'Question', log_label: 'Log Question',
    log_title: 'Log AWS Question', empty_message: 'No questions yet.', answer_placeholder: 'Write the answer… (markdown supported)',
  },
];

type FieldSpec = Pick<DomainField, 'key' | 'label' | 'kind' | 'placeholder' | 'filterable' | 'tag_role'> & { domain_id: DemoDomainId };

const FIELD_SPECS: FieldSpec[] = [
  { domain_id: 'dsa', key: 'difficulty', label: 'Difficulty', kind: 'select', placeholder: 'All difficulties', filterable: 1, tag_role: 'none' },
  { domain_id: 'dsa', key: 'platform', label: 'Platform', kind: 'select', placeholder: 'All platforms', filterable: 0, tag_role: 'none' },
  { domain_id: 'dsa', key: 'question_list', label: 'Question List', kind: 'select', placeholder: 'All question lists', filterable: 0, tag_role: 'secondary' },
  { domain_id: 'dsa', key: 'pattern_tag', label: 'Pattern', kind: 'text', placeholder: 'All patterns', filterable: 1, tag_role: 'primary' },
  { domain_id: 'system_design', key: 'sd_category', label: 'Bucket', kind: 'select', placeholder: 'All buckets', filterable: 1, tag_role: 'primary' },
  { domain_id: 'system_design', key: 'sd_topic', label: 'Topic', kind: 'select', placeholder: 'All topics', filterable: 1, tag_role: 'secondary' },
  { domain_id: 'aws', key: 'aws_cert', label: 'Certification', kind: 'select', placeholder: 'All certifications', filterable: 1, tag_role: 'primary' },
  { domain_id: 'aws', key: 'topic', label: 'Topic', kind: 'select', placeholder: 'All topics', filterable: 1, tag_role: 'secondary' },
];

// Per-domain sort order follows the spec order above.
export const DEMO_FIELDS: DomainField[] = FIELD_SPECS.map((spec, i) => ({
  ...spec,
  id: i + 1,
  sort_order: FIELD_SPECS.filter(other => other.domain_id === spec.domain_id).indexOf(spec),
  archived_at: null,
  legacy_column: null,
}));

// A select field's options are the values the deck actually uses, in first-use
// order — so every option has cards behind it and the filters read naturally.
export const DEMO_FIELD_OPTIONS: DomainFieldOption[] = (() => {
  const options: DomainFieldOption[] = [];
  for (const field of DEMO_FIELDS.filter(f => f.kind === 'select')) {
    const values: string[] = [];
    for (const card of DEMO_CARDS) {
      const value = card.domain === field.domain_id ? card.metadata[field.key] : undefined;
      if (value && !values.includes(value)) values.push(value);
    }
    values.forEach((value, sort_order) => options.push({ id: options.length + 1, field_id: field.id, value, sort_order, archived_at: null }));
  }
  return options;
})();
