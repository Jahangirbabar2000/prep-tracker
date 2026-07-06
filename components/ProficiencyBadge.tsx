'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Level {
  label: string;
  description: string;
  interval: string;
  pill: string;   // Tailwind classes for the badge
  dot: string;    // dot colour
}

const STRUGGLING: Level = {
  label:       'Struggling',
  description: "Tried but not clicking yet — keep at it, it'll stick.",
  interval:    'Next review in ~3 days',
  pill:        'bg-danger/10 text-danger',
  dot:         'bg-danger',
};

const LEVELS: Record<number, Level> = {
  0: {
    label:       'New',
    description: 'Not yet reviewed — log an attempt to start tracking.',
    interval:    'No review scheduled yet',
    pill:        'bg-muted/15 text-muted',
    dot:         'bg-muted',
  },
  1: {
    label:       'Learning',
    description: 'Still building familiarity — comes back soon to reinforce memory.',
    interval:    'Next review in ~7 days',
    pill:        'bg-orange-500/10 text-orange-500',
    dot:         'bg-orange-500',
  },
  2: {
    label:       'Familiar',
    description: 'You know it, but it needs more repetition to stick long-term.',
    interval:    'Next review in ~14 days',
    pill:        'bg-blue-500/10 text-blue-500',
    dot:         'bg-blue-500',
  },
  3: {
    label:       'Confident',
    description: 'Solid recall — review spacing is widening nicely.',
    interval:    'Next review in ~30 days',
    pill:        'bg-accent/10 text-accent',
    dot:         'bg-accent',
  },
  4: {
    label:       'Mastered',
    description: 'Long-term retention achieved. Keep it fresh with monthly checks.',
    interval:    'Next review in ~30 days',
    pill:        'bg-emerald-500/10 text-emerald-500',
    dot:         'bg-emerald-500',
  },
};

interface Props {
  level: number;
  nextDueDate?: string | null;
  attemptCount?: number;
}

const TOOLTIP_WIDTH = 256; // w-64
const VIEWPORT_MARGIN = 8;
const GAP = 8;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export default function ProficiencyBadge({ level, nextDueDate, attemptCount }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number; placement: 'top' | 'bottom' } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isStruggling = level === 0 && !!nextDueDate && (attemptCount ?? 0) >= 2;
  const cfg = isStruggling ? STRUGGLING : LEVELS[Math.min(Math.max(level, 0), 4)];

  const struggleResult = isStruggling ? 'stays at Struggling' : level <= 1 ? 'stays at Learning' : `drops to ${LEVELS[level - 1]?.label}`;
  const successResult  = isStruggling ? 'advances to Learning' : level >= 4 ? 'stays at Mastered' : `advances to ${LEVELS[level + 1]?.label}`;

  function show() {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Prefer above the badge; flip below if there isn't roughly enough room.
    const placement: 'top' | 'bottom' = rect.top > 200 ? 'top' : 'bottom';

    // Right-align to the badge by default, then clamp so it never runs off either edge.
    const idealLeft = rect.right - TOOLTIP_WIDTH;
    const left = clamp(idealLeft, VIEWPORT_MARGIN, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN);

    // Arrow stays aligned under/over the badge's center regardless of clamping.
    const badgeCenter = rect.left + rect.width / 2;
    const arrowLeft = clamp(badgeCenter - left, 16, TOOLTIP_WIDTH - 16);

    const top = placement === 'top' ? rect.top - GAP : rect.bottom + GAP;

    setPos({ top, left, arrowLeft, placement });
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  // Hide on scroll/resize instead of tracking — avoids a stale tooltip position.
  useEffect(() => {
    if (!visible) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [visible]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-default select-none ${cfg.pill}`}
        aria-label={`Proficiency: ${cfg.label}. ${cfg.description} ${cfg.interval}.`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </button>

      {/* Portal to <body> so the tooltip escapes any overflow-hidden ancestor
          (card containers, scroll areas) and viewport-edge clamping above is honored. */}
      {visible && pos && createPortal(
        <div
          className="fixed z-[100] w-64 pointer-events-none"
          style={{
            left: pos.left,
            ...(pos.placement === 'top'
              ? { bottom: window.innerHeight - pos.top }
              : { top: pos.top }),
          }}
        >
          {pos.placement === 'bottom' && (
            <div
              className="absolute bottom-full w-2.5 h-2.5 bg-surface border-l border-t border-border-strong rotate-45 translate-y-[6px]"
              style={{ left: pos.arrowLeft }}
            />
          )}
          <div className="bg-surface border border-border-strong rounded-xl shadow-lg px-3.5 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-sm font-semibold text-fg">{cfg.label}</span>
              <span className="ml-auto text-[11px] font-medium text-muted tabular">Level {level}</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">{cfg.description}</p>
            <div className="border-t border-border pt-2 flex flex-col gap-1">
              <p className="text-xs text-fg font-medium">{cfg.interval}</p>
              {nextDueDate && (
                <p className="text-[11px] text-muted tabular">Due {nextDueDate}</p>
              )}
            </div>
            <div className="border-t border-border pt-2 flex flex-col gap-1">
              <p className="text-[11px] text-muted">
                <span className="text-accent font-medium">No struggle</span> → {successResult}
              </p>
              <p className="text-[11px] text-muted">
                <span className="text-danger font-medium">Struggled</span> → {struggleResult}
              </p>
            </div>
          </div>
          {pos.placement === 'top' && (
            <div
              className="absolute top-full w-2.5 h-2.5 bg-surface border-r border-b border-border-strong rotate-45 -translate-y-[6px]"
              style={{ left: pos.arrowLeft }}
            />
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
