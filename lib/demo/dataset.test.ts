import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from './dataset';
import { DEMO_CARDS } from './cards';
import { DEMO_DOMAINS, DEMO_FIELD_OPTIONS, DEMO_FIELDS } from './registry';
import { replaySchedule } from '@/lib/sr';
import { reviewQueue } from '@/lib/store/queries';
import { computeStreak } from '@/lib/streak';
import { PROFICIENCY_LABELS, proficiencyLabel } from '@/lib/proficiency';
import { normalize } from '@/lib/store/store';

// Visitors open the demo on any date at any hour; the shape must hold for all.
const NOWS = [
  '2026-10-08 14:30:00',
  '2026-01-01 00:20:00', // just after midnight, on a year boundary
  '2026-03-08 09:00:00', // a US DST change
  '2027-02-28 23:55:00',
];

function stats(now: string) {
  const today = now.slice(0, 10);
  const data = normalize(buildDemoDataset(now));
  const attemptCount = new Map<number, number>();
  for (const a of data.attempts) attemptCount.set(a.problem_id, (attemptCount.get(a.problem_id) ?? 0) + 1);
  const labels = new Set(data.problems.map(p => proficiencyLabel(p.interval_level, !!p.next_due_date, attemptCount.get(p.id) ?? 0)));
  return {
    data,
    today,
    due: reviewQueue(data, today),
    streak: computeStreak(data.attempts.map(a => a.attempted_at), today),
    recall: data.attempts.filter(a => !a.struggled).length / data.attempts.length,
    labels,
  };
}

describe('buildDemoDataset', () => {
  it('is deterministic', () => {
    expect(buildDemoDataset(NOWS[0])).toEqual(buildDemoDataset(NOWS[0]));
  });

  it("matches the real scheduler for every card's level and due date", () => {
    const data = buildDemoDataset(NOWS[0]);
    for (const problem of data.problems) {
      const attempts = data.attempts.filter(a => a.problem_id === problem.id);
      if (attempts.length === 0) {
        // Added yesterday, never reviewed: level 0 and due today, as the seeds add cards.
        expect(problem).toMatchObject({ interval_level: 0, next_due_date: '2026-10-08' });
      } else {
        const { level, nextDueDate } = replaySchedule(attempts);
        expect(problem, problem.name).toMatchObject({ interval_level: level, next_due_date: nextDueDate });
      }
    }
  });

  it.each(NOWS)('looks like a real deck in use, opened at %s', now => {
    const { data, due, streak, recall, labels } = stats(now);
    expect(data.attempts.every(a => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(a.attempted_at))).toBe(true);
    expect(data.attempts.every(a => a.attempted_at <= now), 'no attempt in the future').toBe(true);
    expect(due.length).toBeGreaterThanOrEqual(5);
    expect(due.length).toBeLessThanOrEqual(12);
    expect(streak).toBeGreaterThanOrEqual(10);
    expect(recall).toBeGreaterThan(0.65);
    expect(recall).toBeLessThan(0.85);
    for (const label of PROFICIENCY_LABELS) expect(labels.has(label), label).toBe(true);
  });

  it('keeps every reference and id consistent', () => {
    const data = buildDemoDataset(NOWS[0]);
    const problemIds = new Set(data.problems.map(p => p.id));
    expect(problemIds.size).toBe(data.problems.length);
    expect(new Set(data.attempts.map(a => a.id)).size).toBe(data.attempts.length);
    expect(data.attempts.every(a => problemIds.has(a.problem_id))).toBe(true);
    expect(data.links.every(l => problemIds.has(l.problem_id))).toBe(true);
    const domainIds = new Set(data.domains.map(d => d.id));
    expect(data.problems.every(p => domainIds.has(p.domain))).toBe(true);
  });
});

describe('demo deck', () => {
  it('has 40 cards across DSA, System Design and AWS — and no Behavioral', () => {
    const count = (domain: string) => DEMO_CARDS.filter(c => c.domain === domain).length;
    expect([count('dsa'), count('system_design'), count('aws')]).toEqual([12, 14, 14]);
    expect(DEMO_DOMAINS.map(d => d.id)).toEqual(['dsa', 'system_design', 'aws']);
  });

  it('follows the house style: one flashcard answer of 250–450 characters', () => {
    for (const card of DEMO_CARDS.filter(c => c.domain !== 'dsa')) {
      expect(card.answer.length, card.name).toBeGreaterThanOrEqual(250);
      expect(card.answer.length, card.name).toBeLessThanOrEqual(450);
    }
    expect(new Set(DEMO_CARDS.map(c => c.name)).size).toBe(DEMO_CARDS.length);
  });

  it('links DSA cards to their problem and System Design cards to an article', () => {
    for (const card of DEMO_CARDS.filter(c => c.domain === 'dsa')) expect(card.link, card.name).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/);
    for (const card of DEMO_CARDS.filter(c => c.domain === 'system_design')) {
      expect(card.link, card.name).toMatch(/^https:\/\/www\.hellointerview\.com\/learn\/system-design\//);
    }
  });

  it('only uses select values the registry offers', () => {
    for (const card of DEMO_CARDS) {
      for (const field of DEMO_FIELDS.filter(f => f.domain_id === card.domain && f.kind === 'select')) {
        const value = card.metadata[field.key];
        expect(value, `${card.name}: ${field.key}`).toBeTruthy();
        expect(DEMO_FIELD_OPTIONS.some(o => o.field_id === field.id && o.value === value), `${card.name}: ${value}`).toBe(true);
      }
    }
  });
});
