'use client';

import { useEffect, useRef } from 'react';

// Shared mobile swipe-to-navigate behaviour for the review session and the
// individual problem view. The tricky part is nested scrolling: answers render
// markdown that can contain horizontally-scrollable code blocks (`<pre>`), and
// those (plus text fields) must win the gesture so the user can scroll/read the
// full content instead of accidentally flipping to the next question.
//
// The decision helpers below are pure and exported so they can be unit-tested
// without synthesising real touch events.

export const SWIPE_MIN_DISTANCE = 60; // px of horizontal travel before it counts
export const SWIPE_DOMINANCE = 1.5;   // |dx| must exceed |dy| * this to be horizontal
const AXIS_LOCK_THRESHOLD = 5;         // px before we commit to an axis

export type SwipeDirection = 'left' | 'right' | null;

/** Classify a finished gesture into a swipe direction (or null if it isn't one). */
export function resolveSwipe(dx: number, dy: number): SwipeDirection {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return null;
  return dx < 0 ? 'left' : 'right';
}

/** True when the gesture began inside an editable/selectable field. */
export function isTextEntry(el: Element | null | undefined): boolean {
  return !!el?.closest?.('input, textarea, select, [contenteditable="true"]');
}

/**
 * Nearest ancestor (up to and including `root`) that can actually scroll
 * horizontally, or null. Used to hand the gesture to e.g. a `<pre>` code block.
 */
export function findScrollableX(
  el: Element | null | undefined,
  root?: Element | null,
): HTMLElement | null {
  let node: Element | null = el ?? null;
  while (node) {
    if (node instanceof HTMLElement && node.scrollWidth - node.clientWidth > 2) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return node;
    }
    if (node === root) break;
    node = node.parentElement;
  }
  return null;
}

/** Whether `el` can still scroll further in the direction implied by `dx`. */
export function canScrollX(el: HTMLElement, dx: number): boolean {
  const max = el.scrollWidth - el.clientWidth;
  if (dx < 0) return el.scrollLeft < max - 1; // swiping left reveals content to the right
  if (dx > 0) return el.scrollLeft > 1;        // swiping right reveals content to the left
  return false;
}

interface Options {
  enabled: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function useSwipeNav({ enabled, onSwipeLeft, onSwipeRight }: Options) {
  // Keep the latest callbacks in refs so the listeners don't re-subscribe every
  // render (and always call the freshest closure — important for `data`-derived nav).
  const leftRef = useRef(onSwipeLeft);
  const rightRef = useRef(onSwipeRight);
  useEffect(() => {
    leftRef.current = onSwipeLeft;
    rightRef.current = onSwipeRight;
  });

  useEffect(() => {
    if (!enabled) return;

    let startX = 0;
    let startY = 0;
    let axis: 'h' | 'v' | null = null;
    let skip = false; // gesture is owned by a text field or a scroll box
    let scrollBox: HTMLElement | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as Element;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      axis = null;
      skip = isTextEntry(target);
      scrollBox = skip ? null : findScrollableX(target);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (skip) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (axis === null && (Math.abs(dx) > AXIS_LOCK_THRESHOLD || Math.abs(dy) > AXIS_LOCK_THRESHOLD)) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        // First clearly-horizontal move: if it started in a scroll box that can
        // still scroll that way, hand the whole gesture to the box (native scroll).
        if (axis === 'h' && scrollBox && canScrollX(scrollBox, dx)) {
          skip = true;
          return;
        }
      }
      // Lock vertical scroll only while we're driving a horizontal nav gesture.
      if (axis === 'h') e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const wasSkip = skip;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      axis = null;
      skip = false;
      scrollBox = null;
      if (wasSkip) return;

      const dir = resolveSwipe(dx, dy);
      if (dir === 'left') leftRef.current();
      else if (dir === 'right') rightRef.current();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false }); // non-passive so preventDefault works
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled]);
}
