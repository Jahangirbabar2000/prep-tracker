import { describe, it, expect } from 'vitest';
import { cardTags } from './cardTags';

describe('cardTags', () => {
  it('uses pattern_tag + question_list for DSA', () => {
    expect(cardTags({ domain: 'dsa', pattern_tag: 'Binary Search', question_list: 'Blind 75' }))
      .toEqual(['Binary Search', 'Blind 75']);
  });

  it('uses category + topic for system_design', () => {
    expect(cardTags({ domain: 'system_design', sd_category: 'Core Concepts', sd_topic: 'Caching' }))
      .toEqual(['Core Concepts', 'Caching']);
  });

  it('falls back fe_question_set → question_list for frontend', () => {
    expect(cardTags({ domain: 'frontend', fe_bucket: 'JS', question_list: 'GreatFrontEnd' }))
      .toEqual(['JS', 'GreatFrontEnd']);
    expect(cardTags({ domain: 'frontend', fe_bucket: 'JS', fe_question_set: 'Set A', question_list: 'ignored' }))
      .toEqual(['JS', 'Set A']);
  });

  it('returns only the primary when secondary is missing', () => {
    expect(cardTags({ domain: 'ai', ai_category: 'Monitoring' })).toEqual(['Monitoring']);
  });

  it('returns an empty array when nothing is classified', () => {
    expect(cardTags({ domain: 'behavioral' })).toEqual([]);
  });

  it('de-duplicates when primary and secondary are equal', () => {
    expect(cardTags({ domain: 'lld', lld_category: 'Parking Lot', lld_topic: 'Parking Lot' }))
      .toEqual(['Parking Lot']);
  });

  it('uses a best-effort fallback for an unknown domain', () => {
    expect(cardTags({ domain: 'unknown', pattern_tag: 'Graphs', sd_topic: 'BFS' }))
      .toEqual(['Graphs', 'BFS']);
  });
});
