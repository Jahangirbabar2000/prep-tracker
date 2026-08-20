'use client';

import {
  animate,
  motion,
  type PanInfo,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { findScrollableX, isTextEntry } from '@/lib/useSwipeNav';
import { usePhone } from '@/lib/usePhone';
import { resolveCardSwipe, type CardSwipeDirection } from '@/lib/swipeCard';

interface Props {
  children: ReactNode;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  nextPreview?: ReactNode;
  previousPreview?: ReactNode;
  disabled?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const interactiveSelector = 'button, a, input, textarea, select, [contenteditable="true"]';

export default function SwipeableReviewCard({
  children,
  canSwipeLeft,
  canSwipeRight,
  nextPreview,
  previousPreview,
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
}: Props) {
  const x = useMotionValue(0);
  // The drag value still measures the user's full gesture, but most of its
  // straight-line travel is cancelled on the visible card. After a short
  // translation-only lead-in, the card rotates around an imaginary pivot below
  // its bottom edge and naturally traces a downward circular arc.
  const cardX = useTransform(x, value => value * -0.68);
  const cardY = useTransform(x, value => Math.max(0, Math.abs(value) - 18) * 0.025);
  const rotate = useTransform(x, [-140, -18, 18, 140], [-12, 0, 0, 12]);
  // Adjacent cards are already positioned directly beneath the active card,
  // but stay completely hidden until the gesture moves in their direction.
  const nextOpacity = useTransform(x, [-12, 0], [1, 0]);
  const previousOpacity = useTransform(x, [0, 12], [0, 1]);
  const dragControls = useDragControls();
  // Swiping is a phone-only gesture; desktop and tablet drive the deck with the
  // Prev / Next controls instead (see lib/usePhone.ts).
  const swipeEnabled = usePhone();
  const reduceMotion = useReducedMotion();
  const activeAnimation = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => () => activeAnimation.current?.stop(), []);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!swipeEnabled || disabled || (!canSwipeLeft && !canSwipeRight)) return;
    const target = event.target as Element;
    if (isTextEntry(target) || target.closest(interactiveSelector)) return;
    if (findScrollableX(target, event.currentTarget)) return;

    // Touch/pen drags begin on explicit pan-y surfaces so native vertical
    // scrolling and horizontally-scrollable answer code remain available.
    if (event.pointerType !== 'mouse' && !target.closest('[data-swipe-handle="true"]')) return;
    dragControls.start(event, { distanceThreshold: 6 });
  }

  function springBack(velocity = 0) {
    activeAnimation.current?.stop();
    if (reduceMotion) {
      x.jump(0);
      return;
    }
    activeAnimation.current = animate(x, 0, {
      type: 'spring',
      stiffness: 520,
      damping: 34,
      mass: 0.75,
      velocity,
    });
  }

  function commit(direction: Exclude<CardSwipeDirection, null>, velocity: number) {
    const allowed = direction === 'left' ? canSwipeLeft : canSwipeRight;
    if (!allowed) {
      springBack(velocity);
      return;
    }
    const navigate = direction === 'left' ? onSwipeLeft : onSwipeRight;
    activeAnimation.current?.stop();
    // Match the Prev / Next buttons: once a swipe is accepted, switch cards
    // immediately. The revealed preview provides continuity during the drag.
    navigate();
  }

  function finishDrag(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const direction = resolveCardSwipe(info.offset.x, info.velocity.x);
    if (direction) commit(direction, info.velocity.x);
    else springBack(info.velocity.x);
  }

  return (
    <div className="relative isolate">
      {swipeEnabled && canSwipeRight && previousPreview && (
        <motion.div
          aria-hidden
          style={{ opacity: previousOpacity }}
          className="pointer-events-none absolute inset-0 z-0"
        >
          {previousPreview}
        </motion.div>
      )}
      {swipeEnabled && canSwipeLeft && nextPreview && (
        <motion.div
          aria-hidden
          style={{ opacity: nextOpacity }}
          className="pointer-events-none absolute inset-0 z-[1]"
        >
          {nextPreview}
        </motion.div>
      )}
      <motion.div
        data-testid="swipe-review-card"
        data-swipe={swipeEnabled ? 'on' : 'off'}
        drag={swipeEnabled ? 'x' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{
          left: swipeEnabled && canSwipeLeft ? -140 : 0,
          right: swipeEnabled && canSwipeRight ? 140 : 0,
        }}
        dragElastic={0.2}
        dragMomentum={false}
        onPointerDown={startDrag}
        onDragEnd={finishDrag}
        style={{ x }}
        className={`relative z-10 ${disabled ? 'pointer-events-none' : ''}`}
      >
        <motion.div
          whileDrag={reduceMotion ? undefined : { scale: 0.995 }}
          style={{
            x: cardX,
            y: cardY,
            rotate,
            transformOrigin: '50% 135%',
          }}
          className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
        >
          {swipeEnabled && (
            <div
              data-swipe-handle="true"
              aria-hidden
              className="absolute inset-x-0 top-0 z-30 h-5 cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'pan-y' }}
            >
              <span className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-border-strong/60" />
            </div>
          )}
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
