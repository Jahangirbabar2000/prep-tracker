import { Domain } from '@/lib/types';

/** Fields used to derive the primary + secondary labels on a card. */
export interface CardTagSource {
  domain: Domain | string;
  pattern_tag?: string | null;
  sd_category?: string | null;
  sd_topic?: string | null;
  fe_bucket?: string | null;
  fe_question_set?: string | null;
  py_category?: string | null;
  ai_category?: string | null;
  beh_category?: string | null;
  lld_category?: string | null;
  lld_topic?: string | null;
  question_list?: string | null;
}

/**
 * Up to two classification labels for a problem card:
 * primary = category/bucket/pattern, secondary = topic or question list.
 */
export function cardTags(p: CardTagSource): string[] {
  let primary: string | null = null;
  let secondary: string | null = null;

  switch (p.domain) {
    case 'dsa':
      primary = p.pattern_tag ?? null;
      secondary = p.question_list ?? null;
      break;
    case 'system_design':
      primary = p.sd_category ?? null;
      secondary = p.sd_topic ?? null;
      break;
    case 'frontend':
      primary = p.fe_bucket ?? null;
      secondary = p.fe_question_set ?? p.question_list ?? null;
      break;
    case 'python':
      primary = p.py_category ?? null;
      secondary = p.question_list ?? null;
      break;
    case 'ai':
      primary = p.ai_category ?? null;
      secondary = p.question_list ?? null;
      break;
    case 'behavioral':
      primary = p.beh_category ?? null;
      secondary = p.question_list ?? null;
      break;
    case 'lld':
      primary = p.lld_category ?? null;
      secondary = p.lld_topic ?? null;
      break;
    default:
      primary =
        p.pattern_tag ?? p.sd_category ?? p.fe_bucket ?? p.py_category ??
        p.ai_category ?? p.beh_category ?? p.lld_category ?? null;
      secondary = p.sd_topic ?? p.lld_topic ?? p.fe_question_set ?? p.question_list ?? null;
  }

  const tags: string[] = [];
  if (primary) tags.push(primary);
  if (secondary && secondary !== primary) tags.push(secondary);
  return tags;
}
