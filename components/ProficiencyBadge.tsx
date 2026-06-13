'use client';

import { useState } from 'react';

interface Level {
  label: string;
  description: string;
  interval: string;
  pill: string;   // Tailwind classes for the badge
  dot: string;    // dot colour
}

const LEVELS: Record<number, Level> = {
  0: {
    label:       'New',
    description: 'Not yet reviewed — log an attempt to start your streak.',
    interval:    'No review scheduled yet',
    pill:        'bg-muted/15 text-muted',
    dot:         'bg-muted',
  },
  1: {
    label:       'Learning',
    description: 'Still building familiarity — comes back soon to reinforce memory.',
    interval:    'Next review in ~3 days',
    pill:        'bg-orange-500/10 text-orange-500',
    dot:         'bg-orange-500',
  },
  2: {
    label:       'Familiar',
    description: 'You know it, but it needs more repetition to stick long-term.',
    interval:    'Next review in ~7 days',
    pill:        'bg-blue-500/10 text-blue-500',
    dot:         'bg-blue-500',
  },
  3: {
    label:       'Confident',
    description: 'Solid recall — review spacing is widening nicely.',
    interval:    'Next review in ~14 days',
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
}

export default function ProficiencyBadge({ level, nextDueDate }: Props) {
  const [visible, setVisible] = useState(false);
  const cfg = LEVELS[Math.min(Math.max(level, 0), 4)];

  const struggleResult = level <= 1 ? 'stays at Learning' : `drops to ${LEVELS[level - 1]?.label}`;
  const successResult  = level >= 4 ? 'stays at Mastered'  : `advances to ${LEVELS[level + 1]?.label}`;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-default select-none ${cfg.pill}`}
        aria-label={`Proficiency: ${cfg.label}. ${cfg.description} ${cfg.interval}.`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </button>

      {/* Tooltip */}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 pointer-events-none">
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
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-surface border-r border-b border-border-strong rotate-45 -translate-y-[6px]" />
        </div>
      )}
    </span>
  );
}
