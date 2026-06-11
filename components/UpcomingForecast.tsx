'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';

interface DaySlot {
  dateKey: string;
  label: string;
  shortLabel: string;
  total: number;
  domains: Record<string, number>;
}

interface Props {
  slots: DaySlot[];
  domainTotals: Record<string, number>;
  totalUpcoming: number;
}

const DOMAIN_LABEL: Record<string, string> = {
  dsa:           'DSA',
  system_design: 'System Design',
  frontend:      'Frontend',
  python:        'Python',
};

const DOMAIN_STYLE: Record<string, string> = {
  dsa:           'text-accent',
  system_design: 'text-orange-400',
  frontend:      'text-purple-400',
  python:        'text-emerald-400',
};

const DOMAIN_DOT: Record<string, string> = {
  dsa:           'bg-accent',
  system_design: 'bg-orange-400',
  frontend:      'bg-purple-400',
  python:        'bg-emerald-400',
};

export default function UpcomingForecast({ slots, domainTotals, totalUpcoming }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (totalUpcoming === 0) return null;

  const maxDay = Math.max(...slots.map(s => s.total), 1);
  const BAR_MAX_H = 36; // px

  return (
    <div className="mt-10 pt-6 border-t border-border">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={14} className="text-muted" />
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
          Upcoming · next 7 days
        </h2>
        <span className="text-xs text-muted/50 tabular">{totalUpcoming} reviews</span>
      </div>

      {/* 7-day bar chart */}
      <div className="flex items-end gap-2 mb-5">
        {slots.map((slot, i) => {
          const barH = slot.total > 0
            ? Math.max(4, Math.round((slot.total / maxDay) * BAR_MAX_H))
            : 0;
          const isHovered = hoveredIdx === i;
          const domainEntries = Object.entries(slot.domains).sort((a, b) => b[1] - a[1]);

          return (
            <div
              key={slot.dateKey}
              className="relative flex flex-col items-center gap-1.5 flex-1 cursor-default"
              onMouseEnter={() => slot.total > 0 && setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && domainEntries.length > 0 && (
                <div className={`
                  absolute bottom-full mb-2 z-50
                  bg-surface border border-border-strong rounded-xl shadow-lg
                  px-3 py-2.5 min-w-[130px]
                  ${i >= 5 ? 'right-0' : i <= 1 ? 'left-0' : 'left-1/2 -translate-x-1/2'}
                `}>
                  <p className="text-[11px] font-semibold text-fg mb-2">{slot.label}</p>
                  <div className="flex flex-col gap-1.5">
                    {domainEntries.map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOMAIN_DOT[domain] ?? 'bg-muted'}`} />
                          <span className="text-[11px] text-muted">{DOMAIN_LABEL[domain] ?? domain}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-fg tabular">{count}</span>
                      </div>
                    ))}
                  </div>
                  {/* Arrow */}
                  <div className={`
                    absolute top-full w-2.5 h-2.5 bg-surface border-r border-b border-border-strong rotate-45 -translate-y-[6px]
                    ${i >= 5 ? 'right-3' : i <= 1 ? 'left-3' : 'left-1/2 -translate-x-1/2'}
                  `} />
                </div>
              )}

              {/* Count */}
              <span className={`text-[11px] tabular font-medium transition-colors ${
                slot.total > 0
                  ? isHovered ? 'text-accent' : 'text-fg'
                  : 'text-muted/30'
              }`}>
                {slot.total > 0 ? slot.total : '–'}
              </span>

              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: `${BAR_MAX_H}px` }}>
                {slot.total > 0 ? (
                  <div
                    className={`w-full rounded-t-sm transition-colors ${isHovered ? 'bg-accent/70' : 'bg-accent/35'}`}
                    style={{ height: `${barH}px` }}
                  />
                ) : (
                  <div className="w-full rounded-t-sm bg-border/40" style={{ height: '3px' }} />
                )}
              </div>

              {/* Day label */}
              <span className={`text-[11px] font-medium uppercase tracking-wide transition-colors ${
                isHovered ? 'text-fg' : 'text-muted/60'
              }`}>
                {slot.shortLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Domain breakdown — total for the week */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {Object.entries(domainTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([domain, count]) => (
            <span key={domain} className="text-xs text-muted">
              <span className={`font-semibold ${DOMAIN_STYLE[domain] ?? 'text-fg'}`}>{count}</span>
              {' '}{DOMAIN_LABEL[domain] ?? domain}
            </span>
          ))
        }
      </div>
    </div>
  );
}
