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
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { findScrollableX, isTextEntry } from '@/lib/useSwipeNav';
import { resolveCardSwipe, type CardSwipeDirection } from '@/lib/swipeCard';

interface Props {
  children: ReactNode;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  disabled?: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const interactiveSelector = 'button, a, input, textarea, select, [contenteditable="true"]';

export default function SwipeableReviewCard({
  children,
  canSwipeLeft,
  canSwipeRight,
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
}: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-11, 0, 11]);
  const nextOpacity = useTransform(x, [-180, -45, 0], [1, 0.15, 0]);
  const previousOpacity = useTransform(x, [0, 45, 180], [0, 0.15, 1]);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [animating, setAnimating] = useState(false);
  const activeAnimation = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => () => activeAnimation.current?.stop(), []);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (disabled || animating || (!canSwipeLeft && !canSwipeRight)) return;
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
    if (reduceMotion) {
      x.jump(0);
      navigate();
      return;
    }

    setAnimating(true);
    const viewport = typeof window === 'undefined' ? 900 : window.innerWidth;
    const target = direction === 'left' ? -(viewport + 240) : viewport + 240;
    activeAnimation.current?.stop();
    const controls = animate(x, target, {
      type: 'spring',
      stiffness: 240,
      damping: 28,
      mass: 0.85,
      velocity,
    });
    activeAnimation.current = controls;
    void controls.then(() => navigate());
  }

  function finishDrag(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const direction = resolveCardSwipe(info.offset.x, info.velocity.x);
    if (direction) commit(direction, info.velocity.x);
    else springBack(info.velocity.x);
  }

  return (
    <div className="relative isolate">
      {(canSwipeLeft || canSwipeRight) && (
        <>
          <div aria-hidden className="absolute inset-0 translate-y-3 scale-[0.965] rounded-2xl border border-border/60 bg-surface-2/55" />
          <div aria-hidden className="absolute inset-0 translate-y-1.5 scale-[0.985] rounded-2xl border border-border/80 bg-surface-2" />
        </>
      )}
      <motion.div
        data-testid="swipe-review-card"
        drag="x"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{
          left: canSwipeLeft ? -220 : 0,
          right: canSwipeRight ? 220 : 0,
        }}
        dragElastic={0.72}
        dragMomentum={false}
        onPointerDown={startDrag}
        onDragEnd={finishDrag}
        whileDrag={reduceMotion ? undefined : { scale: 1.015 }}
        style={{ x, rotate }}
        className={`relative z-10 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm ${
          disabled || animating ? 'pointer-events-none' : ''
        }`}
      >
        <div
          data-swipe-handle="true"
          aria-hidden
          className="absolute inset-x-0 top-0 z-30 h-5 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          <span className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-border-strong/60" />
        </div>
        <motion.div
          aria-hidden
          style={{ opacity: nextOpacity }}
          className="pointer-events-none absolute left-5 top-7 z-30 -rotate-6 rounded-lg border-2 border-accent px-3 py-1 text-xs font-black tracking-[0.2em] text-accent"
        >
          NEXT
        </motion.div>
        <motion.div
          aria-hidden
          style={{ opacity: previousOpacity }}
          className="pointer-events-none absolute right-5 top-7 z-30 rotate-6 rounded-lg border-2 border-border-strong px-3 py-1 text-xs font-black tracking-[0.16em] text-muted"
        >
          PREV
        </motion.div>
        {children}
      </motion.div>
    </div>
  );
}
