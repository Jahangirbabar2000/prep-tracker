'use client';

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
  dsa:           'text-red-400',
  system_design: 'text-orange-400',
  frontend:      'text-purple-400',
  python:        'text-emerald-400',
};

const DOMAIN_DOT: Record<string, string> = {
  dsa:           'bg-red-400',
  system_design: 'bg-orange-400',
  frontend:      'bg-purple-400',
  python:        'bg-emerald-400',
};

// Ordered so the domain row is always consistent left-to-right
const DOMAIN_ORDER = ['python', 'dsa', 'frontend', 'system_design'];

export default function UpcomingForecast({ slots, domainTotals, totalUpcoming }: Props) {
  if (totalUpcoming === 0) return null;

  return (
    <div className="mt-10 pt-6 border-t border-border">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays size={14} className="text-muted" />
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
          Upcoming · next 7 days
        </h2>
        <span className="text-xs text-muted/50 tabular">{totalUpcoming} reviews</span>
      </div>

      {/* 7-day columns */}
      <div className="flex items-end gap-2 mb-5">
        {slots.map((slot) => {
          const domainEntries = DOMAIN_ORDER
            .filter(d => slot.domains[d] > 0)
            .map(d => [d, slot.domains[d]] as [string, number]);

          return (
            <div
              key={slot.dateKey}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              {/* Date label e.g. 06/22 */}
              <span className="text-[10px] text-muted/50 tabular">
                {slot.dateKey.slice(5, 7)}/{slot.dateKey.slice(8, 10)}
              </span>

              {/* Per-domain breakdown — fixed height so all columns align */}
              <div className="flex flex-col items-center gap-0.5 h-[60px] justify-start pt-0.5">
                {domainEntries.map(([domain, count]) => (
                  <div key={domain} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOMAIN_DOT[domain] ?? 'bg-muted'}`} />
                    <span className={`text-[10px] font-medium tabular ${DOMAIN_STYLE[domain] ?? 'text-muted'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day label */}
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted/60">
                {slot.shortLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Weekly domain totals */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {DOMAIN_ORDER
          .filter(d => domainTotals[d] > 0)
          .map(domain => (
            <span key={domain} className="text-xs text-muted">
              <span className={`font-semibold ${DOMAIN_STYLE[domain] ?? 'text-fg'}`}>
                {domainTotals[domain]}
              </span>
              {' '}{DOMAIN_LABEL[domain] ?? domain}
            </span>
          ))
        }
      </div>
    </div>
  );
}
