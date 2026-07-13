export type Domain = 'dsa' | 'system_design' | 'frontend' | 'python' | 'ai' | 'lld';

export interface Problem {
  id: number;
  name: string;
  domain: Domain;
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
