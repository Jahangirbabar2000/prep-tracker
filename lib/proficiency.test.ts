import { describe, it, expect } from 'vitest';
import { isStrugglingState, projectSuccess, projectStruggle } from './proficiency';

describe('isStrugglingState', () => {
  it('is false for any level above 0, regardless of due date/attempts', () => {
    expect(isStrugglingState(1, true, 5)).toBe(false);
    expect(isStrugglingState(3, true, 5)).toBe(false);
  });

  it('is false at level 0 with no due date (a genuinely new problem)', () => {
    expect(isStrugglingState(0, false, 0)).toBe(false);
  });

  it('is false at level 0 with a due date but fewer than 2 attempts (grace period)', () => {
    expect(isStrugglingState(0, true, 1)).toBe(false);
  });

  it('is true at level 0 with a due date and 2+ attempts', () => {
    expect(isStrugglingState(0, true, 2)).toBe(true);
    expect(isStrugglingState(0, true, 3)).toBe(true);
  });
});

describe('projectSuccess', () => {
  it('advances one level on success', () => {
    expect(projectSuccess(0, 'New')).toEqual({ label: 'Learning', changed: true });
    expect(projectSuccess(1, 'Learning')).toEqual({ label: 'Familiar', changed: true });
    expect(projectSuccess(2, 'Familiar')).toEqual({ label: 'Confident', changed: true });
    expect(projectSuccess(3, 'Confident')).toEqual({ label: 'Mastered', changed: true });
  });

  it('caps at Mastered — never promises a tier beyond the scheduler ceiling', () => {
    expect(projectSuccess(4, 'Mastered')).toEqual({ label: 'Mastered', changed: false });
  });
});

describe('projectStruggle', () => {
  it('drops Mastered to Confident', () => {
    expect(projectStruggle(4, 10, 'Mastered')).toEqual({ label: 'Confident', changed: true });
  });

  it('drops Confident to Familiar', () => {
    expect(projectStruggle(3, 10, 'Confident')).toEqual({ label: 'Familiar', changed: true });
  });

  it('drops Familiar to Learning', () => {
    expect(projectStruggle(2, 5, 'Familiar')).toEqual({ label: 'Learning', changed: true });
  });

  it('drops Learning to Struggling, not "stays at Learning" (the bug this replaces)', () => {
    // Reaching Learning requires a prior successful attempt, so attemptCount is
    // already >=1; one more (struggled) attempt pushes it to >=2 → Struggling.
    expect(projectStruggle(1, 1, 'Learning')).toEqual({ label: 'Struggling', changed: true });
  });

  it('a brand-new problem (0 attempts) struggling once stays New (grace period)', () => {
    expect(projectStruggle(0, 0, 'New')).toEqual({ label: 'New', changed: false });
  });

  it('a New problem with one prior struggle (1 attempt) becomes Struggling on the next', () => {
    expect(projectStruggle(0, 1, 'New')).toEqual({ label: 'Struggling', changed: true });
  });
});
