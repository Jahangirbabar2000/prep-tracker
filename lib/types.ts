/**
 * Domain identifiers are persisted and user-created at runtime. Keep this
 * alias for call sites that deal in domain IDs, but do not narrow it to the
 * seven legacy domains.
 */
export type Domain = string;

export type StudyMode = 'timed_problem' | 'flashcard' | 'flashcard_practice';
export type DomainFieldKind = 'text' | 'select';
export type DomainFieldTagRole = 'none' | 'primary' | 'secondary';

export interface StudyDomain {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  study_mode: StudyMode;
  icon: string;
  color: string;
  sort_order: number;
  item_label: string;
  log_label: string;
  log_title: string;
  empty_message: string;
  answer_placeholder: string;
  default_link: string;
  archived_at: string | null;
}

export interface DomainField {
  id: number;
  domain_id: string;
  key: string;
  label: string;
  kind: DomainFieldKind;
  placeholder: string;
  filterable: number;
  tag_role: DomainFieldTagRole;
  sort_order: number;
  archived_at: string | null;
  legacy_column: string | null;
}

export interface DomainFieldOption {
  id: number;
  field_id: number;
  value: string;
  sort_order: number;
  archived_at: string | null;
}

export interface Problem {
  id: number;
  name: string;
  domain: Domain;
  metadata: Record<string, string>;
  // DSA
  platform?: string | null;
  pattern_tag?: string | null;
  question_list?: string | null;
  difficulty?: string | null;
  // System Design
  sd_category?: string | null;
  sd_topic?: string | null;
  sd_source?: string | null;
  // Frontend
  fe_bucket?: string | null;
  fe_question_set?: string | null;
  // Python
  py_category?: string | null;
  // AI
  ai_category?: string | null;
  // Low-Level Design
  lld_category?: string | null;
  lld_topic?: string | null;
  // Behavioral
  beh_category?: string | null;
  // Universal
  resource_url?: string | null;
  notes_text?: string | null;
  // SR state
  interval_level: number;
  next_due_date?: string | null;
  created_at: string;
  // Computed in list queries
  attempt_count?: number;
  avg_time?: number | null;
}

export interface Attempt {
  id: number;
  problem_id: number;
  attempted_at: string;
  time_taken_mins: number;
  struggled: number; // 0 | 1
  practice_type?: string | null; // 'solo' | 'mock'
}

export interface Note {
  id: number;
  problem_id: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface Link {
  id: number;
  problem_id: number;
  url: string;
  label?: string | null;
  created_at: string;
}

export interface ProblemWithStats extends Problem {
  attempts: Attempt[];
  notes: Note[];
  links: Link[];
  avg_time?: number | null;
  last_attempt?: Attempt | null;
}

export interface ReviewQueueItem extends Problem {
  last_attempted_at: string;
  last_struggled: number;
  days_overdue: number;
}
