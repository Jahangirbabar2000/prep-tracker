import { describe, expect, it } from 'vitest';
import {
  CARD_SWIPE_DISTANCE,
  CARD_SWIPE_VELOCITY,
  resolveCardSwipe,
} from './swipeCard';

describe('resolveCardSwipe', () => {
  it('commits drags that cross the distance threshold', () => {
    expect(resolveCardSwipe(-CARD_SWIPE_DISTANCE, 0)).toBe('left');
    expect(resolveCardSwipe(CARD_SWIPE_DISTANCE, 0)).toBe('right');
  });

  it('commits a short, decisive flick using projected velocity', () => {
    expect(resolveCardSwipe(-30, -CARD_SWIPE_VELOCITY)).toBe('left');
    expect(resolveCardSwipe(30, CARD_SWIPE_VELOCITY)).toBe('right');
  });

  it('springs short, slow or ambiguous releases back to center', () => {
    expect(resolveCardSwipe(40, 100)).toBeNull();
    expect(resolveCardSwipe(-20, 400)).toBeNull();
    expect(resolveCardSwipe(50, -CARD_SWIPE_VELOCITY)).toBeNull();
  });
});
