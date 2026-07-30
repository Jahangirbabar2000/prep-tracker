export const CARD_SWIPE_DISTANCE = 96;
export const CARD_SWIPE_VELOCITY = 700;

export type CardSwipeDirection = 'left' | 'right' | null;

/**
 * Commit deliberate drags and quick flicks while ignoring short, slow releases.
 * Velocity is projected slightly forward so a compact flick still feels natural.
 */
export function resolveCardSwipe(offsetX: number, velocityX: number): CardSwipeDirection {
  if (Math.abs(offsetX) >= CARD_SWIPE_DISTANCE) {
    return offsetX < 0 ? 'left' : 'right';
  }
  const projectedX = offsetX + velocityX * 0.12;
  if (
    Math.abs(velocityX) >= CARD_SWIPE_VELOCITY
    && Math.abs(projectedX) >= CARD_SWIPE_DISTANCE * 0.65
  ) {
    return projectedX < 0 ? 'left' : 'right';
  }
  return null;
}
