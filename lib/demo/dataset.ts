// The demo's data, built fresh for whenever it's opened.
//
// Nothing here stores a date. buildDemoDataset(now) replays about three months
// of a simulated learner working through the deck — studying most days, doing
// the due queue (up to a daily cap), sometimes struggling — ending yesterday,
// with "now" as the visitor's own clock. So the demo never goes stale: there is
// always a queue due today, a live streak, a filled-in heatmap. Every card's
// level and due date come from replaySchedule (lib/sr.ts) over its simulated
// attempts, so the demo can never disagree with the real scheduler.
//
// This is the one place synthetic attempts are allowed: the seeding rules in
// AGENTS.md forbid them for real decks, and this data never reaches a server.

import type { StoreData } from '@/lib/store/store';
import type { Attempt, Link, Problem } from '@/lib/types';
import { replaySchedule } from '@/lib/sr';
import { DEMO_CARDS, type DemoCard } from './cards';
import { DEMO_DOMAINS, DEMO_FIELD_OPTIONS, DEMO_FIELDS } from './registry';

/** The first simulated card is introduced this many days before today. */
const HISTORY_DAYS = 100;
/** …and the last one this many days before today, so a few cards are still young. */
const LAST_INTRO_DAYS_AGO = 4;
/** The days just before today are always study days, so the streak is alive. */
const STREAK_DAYS = 10;
/** Before that, a day is skipped with this probability (unless a card is introduced). */
const SKIP_RATE = 0.15;
/** Reviews the learner gets through per day; the rest wait, overdue. */
const DAILY_CAP = 6;
/** A busy last few days — fewer reviews done — so today opens with a small overdue backlog. */
const BUSY_DAYS = 2;
const BUSY_CAP = 3;
/** Chance of "Struggled" on a review, by how hard the card is for this learner. */
const STRUGGLE_RATE: Record<DemoCard['difficulty'], number> = { easy: 0.07, medium: 0.17, hard: 0.36 };
/** Material that hasn't stuck yet (levels 0–1) is struggled on this much more often. */
const YOUNG_CARD_FACTOR = 1.6;
/** Minutes a DSA attempt takes, [min, max], by difficulty. Flashcards log 0, as real ones do. */
const SOLVE_MINUTES: Record<DemoCard['difficulty'], [number, number]> = { easy: [6, 15], medium: [14, 32], hard: [28, 55] };
/** Fixed, so every build replays the same history. */
export const DEMO_SEED = 268; // picked from a search: every proficiency level, a small overdue backlog, ~75% recall

/** mulberry32: a small, fast, seedable PRNG — deterministic across runs and engines. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (day: string, minutes: number) => `${day} ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;

/** Round-robin across domains, so every domain has old (mastered) and recent cards. */
function interleaveByDomain(cards: DemoCard[]): DemoCard[] {
  const queues = [...new Set(cards.map(c => c.domain))].map(domain => cards.filter(c => c.domain === domain));
  const out: DemoCard[] = [];
  while (queues.some(q => q.length)) for (const q of queues) { const next = q.shift(); if (next) out.push(next); }
  return out;
}

/**
 * The demo dataset as of `now`, the visitor's local "YYYY-MM-DD HH:MM:SS"
 * (clientNow()). Deterministic: the same `now` (and seed) always yields the
 * same data. `seed` exists for tests; the app always uses the default.
 */
export function buildDemoDataset(now: string, seed: number = DEMO_SEED): StoreData {
  const today = now.slice(0, 10);
  const rand = prng(seed);
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  const idOf = new Map(DEMO_CARDS.map((card, i) => [card, i + 1]));
  const history = new Map<DemoCard, Attempt[]>(DEMO_CARDS.map(card => [card, []]));
  const nextDue = new Map<DemoCard, string>();
  let attemptId = 0;

  const simulated = interleaveByDomain(DEMO_CARDS.filter(card => !card.stage));
  const introOffset = new Map(simulated.map((card, i) => [
    card,
    -HISTORY_DAYS + Math.round((i * (HISTORY_DAYS - LAST_INTRO_DAYS_AGO)) / Math.max(simulated.length - 1, 1)),
  ]));

  /** Whether this review is a struggle — likelier on hard cards and on ones that haven't stuck yet. */
  function struggles(card: DemoCard): boolean {
    const attempts = history.get(card)!;
    const young = attempts.length === 0 || replaySchedule(attempts).level <= 1;
    return rand() < STRUGGLE_RATE[card.difficulty] * (young ? YOUNG_CARD_FACTOR : 1);
  }

  function log(card: DemoCard, at: string, struggled: boolean) {
    const [min, max] = SOLVE_MINUTES[card.difficulty];
    const attempts = history.get(card)!;
    attempts.push({
      id: ++attemptId,
      problem_id: idOf.get(card)!,
      attempted_at: at,
      time_taken_mins: card.domain === 'dsa' ? between(min, max) : 0,
      struggled: struggled ? 1 : 0,
      practice_type: null,
      client_id: null,
    });
    const { nextDueDate } = replaySchedule(attempts);
    if (nextDueDate) nextDue.set(card, nextDueDate);
  }

  for (let offset = -HISTORY_DAYS; offset <= -1; offset++) {
    const day = addDays(today, offset);
    const introductions = simulated.filter(card => introOffset.get(card) === offset);
    const mustStudy = offset >= -STREAK_DAYS || introductions.length > 0;
    if (!mustStudy && rand() < SKIP_RATE) continue;

    // One sitting, starting somewhere between 7am and 8pm, a few minutes per card.
    let clock = between(7 * 60, 20 * 60);
    const at = () => { const t = stamp(day, clock); clock += between(2, 9); return t; };
    let logged = 0;

    for (const card of introductions) { log(card, at(), struggles(card)); logged++; }

    // The due queue, most overdue first — what the real Review Queue would show.
    const due = simulated
      .filter(card => !introductions.includes(card) && (nextDue.get(card) ?? '9999') <= day)
      .sort((a, b) => nextDue.get(a)!.localeCompare(nextDue.get(b)!) || idOf.get(a)! - idOf.get(b)!);
    for (const card of due.slice(0, offset >= -BUSY_DAYS ? BUSY_CAP : DAILY_CAP)) { log(card, at(), struggles(card)); logged++; }

    // A streak day with nothing due: the learner practices the card due soonest.
    if (logged === 0 && offset >= -STREAK_DAYS) {
      const soonest = simulated
        .filter(card => nextDue.has(card))
        .sort((a, b) => nextDue.get(a)!.localeCompare(nextDue.get(b)!))[0];
      if (soonest) log(soonest, at(), struggles(soonest));
    }
  }

  // 'today': added and first reviewed this morning — an hour before `now`,
  // never earlier than just after midnight, so History never shows the future.
  const nowMinutes = Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16));
  for (const card of DEMO_CARDS.filter(c => c.stage === 'today')) {
    log(card, stamp(today, Math.max(nowMinutes - 60, 1)), false);
  }

  const problems: Problem[] = DEMO_CARDS.map(card => {
    const attempts = history.get(card)!;
    // 'new' cards: added yesterday with zero attempts and due today, exactly
    // as the seed scripts add a card — so the queue shows a New one.
    const { level, nextDueDate } = card.stage === 'new'
      ? { level: 0, nextDueDate: today }
      : replaySchedule(attempts);
    return {
      id: idOf.get(card)!,
      name: card.name,
      domain: card.domain,
      metadata: { ...card.metadata },
      notes_text: card.answer,
      resource_url: null,
      interval_level: level,
      next_due_date: nextDueDate,
      created_at: attempts[0]?.attempted_at ?? stamp(addDays(today, -1), 18 * 60),
    };
  });

  const attempts = DEMO_CARDS.flatMap(card => history.get(card)!);
  const links: Link[] = DEMO_CARDS.filter(card => card.link).map((card, i) => ({
    id: i + 1,
    problem_id: idOf.get(card)!,
    url: card.link!,
    label: card.name,
    created_at: problems[idOf.get(card)! - 1].created_at,
  }));

  return {
    problems,
    attempts,
    notes: [],
    links,
    config_options: [],
    domains: DEMO_DOMAINS,
    domain_fields: DEMO_FIELDS,
    domain_field_options: DEMO_FIELD_OPTIONS,
  };
}
