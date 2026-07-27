'use client';

import { CalendarDays, ArrowUp } from 'lucide-react';

function scrollToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
  python:        'Backend',
  ai:            'AI',
  lld:           'LLD',
  behavioral:    'Behavioral',
};

const DOMAIN_STYLE: Record<string, string> = {
  dsa:           'text-blue-400',
  system_design: 'text-orange-400',
  frontend:      'text-violet-400',
  python:        'text-emerald-400',
  ai:            'text-rose-400',
  lld:           'text-amber-400',
  behavioral:    'text-teal-400',
};

// Ordered so the domain row is always consistent left-to-right
const DOMAIN_ORDER = ['python', 'dsa', 'frontend', 'system_design', 'ai', 'lld', 'behavioral'];

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
        <button
          type="button"
          onClick={scrollToTop}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg border border-border hover:border-border-strong rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
        >
          <ArrowUp size={13} /> Go up
        </button>
      </div>

      {/* 7-day columns. Day/date/total header stays aligned across columns;
          the per-domain dot stack flows below with dynamic height, so a busy
          day simply reads taller — no fixed clip to overflow into the labels. */}
      <div className="flex items-start gap-1.5 sm:gap-2 mb-5">
        {slots.map((slot) => {
          const domainEntries = DOMAIN_ORDER
            .filter(d => slot.domains[d] > 0)
            .map(d => [d, slot.domains[d]] as [string, number]);

          return (
            <div
              key={slot.dateKey}
              className="group flex-1 min-w-0 flex flex-col items-center gap-1"
              title={`${slot.total} review${slot.total === 1 ? '' : 's'} due ${slot.label}`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted/60 leading-none">
                {slot.shortLabel}
              </span>
              <span className="text-[10px] text-muted/50 tabular leading-none">
                {slot.dateKey.slice(5, 7)}/{slot.dateKey.slice(8, 10)}
              </span>
              <span className={`text-[15px] font-semibold tabular leading-none mt-0.5 ${slot.total > 0 ? 'text-fg' : 'text-muted/30'}`}>
                {slot.total}
              </span>

              {/* Per-domain breakdown — dynamic height, hover to read each domain */}
              <div className="flex flex-col items-center gap-0.5 pt-1.5">
                {domainEntries.map(([domain, count]) => (
                  <div
                    key={domain}
                    className="flex items-center gap-1 rounded px-1 -mx-1 group-hover:bg-surface-2 transition-colors"
                    title={`${DOMAIN_LABEL[domain] ?? domain}: ${count}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOMAIN_STYLE[domain] ?? 'text-muted'}`} style={{ backgroundColor: 'currentColor' }} />
                    <span className={`text-[10px] font-medium tabular ${DOMAIN_STYLE[domain] ?? 'text-muted'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
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
