import { describe, it, expect } from 'vitest';
import { isStrugglingState, proficiencyLabel, projectSuccess, projectStruggle } from './proficiency';

describe('isStrugglingState', () => {
  it('is false for any level above 0, regardless of due date/attempts', () => {
    expect(isStrugglingState(1, true, 5)).toBe(false);
    expect(isStrugglingState(5, true, 5)).toBe(false);
  });

  it('is false at level 0 with no due date (a genuinely new problem)', () => {
    expect(isStrugglingState(0, false, 0)).toBe(false);
  });

  it('is false at level 0 with a due date but fewer than 2 attempts (grace period)', () => {
    // Every first log now lands here — a freshly added card must not read "Struggling".
    expect(isStrugglingState(0, true, 1)).toBe(false);
  });

  it('is true at level 0 with a due date and 2+ attempts', () => {
    expect(isStrugglingState(0, true, 2)).toBe(true);
    expect(isStrugglingState(0, true, 3)).toBe(true);
  });
});

describe('proficiencyLabel', () => {
  it('names each level on the ladder', () => {
    expect(proficiencyLabel(0, false, 0)).toBe('New');
    expect(proficiencyLabel(1, true, 2)).toBe('Learning');
    expect(proficiencyLabel(2, true, 3)).toBe('Familiar');
    expect(proficiencyLabel(3, true, 4)).toBe('Proficient');
    expect(proficiencyLabel(4, true, 5)).toBe('Confident');
    expect(proficiencyLabel(5, true, 6)).toBe('Mastered');
  });

  it('reads New after one log, Struggling once missed twice', () => {
    expect(proficiencyLabel(0, true, 1)).toBe('New');
    expect(proficiencyLabel(0, true, 2)).toBe('Struggling');
  });

  it('clamps out-of-range levels', () => {
    expect(proficiencyLabel(99, true, 9)).toBe('Mastered');
    expect(proficiencyLabel(-1, false, 0)).toBe('New');
  });
});

describe('projectSuccess', () => {
  it('advances one level on success', () => {
    expect(projectSuccess(0, 'New')).toEqual({ label: 'Learning', changed: true });
    expect(projectSuccess(2, 'Familiar')).toEqual({ label: 'Proficient', changed: true });
    expect(projectSuccess(3, 'Proficient')).toEqual({ label: 'Confident', changed: true });
    expect(projectSuccess(4, 'Confident')).toEqual({ label: 'Mastered', changed: true });
  });

  it('caps at Mastered — never promises a tier beyond the scheduler ceiling', () => {
    expect(projectSuccess(5, 'Mastered')).toEqual({ label: 'Mastered', changed: false });
  });
});

describe('projectStruggle', () => {
  it('steps down one level', () => {
    expect(projectStruggle(5, 10, 'Mastered')).toEqual({ label: 'Confident', changed: true });
    expect(projectStruggle(4, 10, 'Confident')).toEqual({ label: 'Proficient', changed: true });
    expect(projectStruggle(3, 6, 'Proficient')).toEqual({ label: 'Familiar', changed: true });
  });

  it('drops Learning to Struggling once the miss count crosses the grace period', () => {
    expect(projectStruggle(1, 1, 'Learning')).toEqual({ label: 'Struggling', changed: true });
  });

  it('a brand-new problem struggling its first time stays New (grace period)', () => {
    expect(projectStruggle(0, 0, 'New')).toEqual({ label: 'New', changed: false });
  });

  it('a New problem with one prior attempt becomes Struggling on the next miss', () => {
    expect(projectStruggle(0, 1, 'New')).toEqual({ label: 'Struggling', changed: true });
  });
});
