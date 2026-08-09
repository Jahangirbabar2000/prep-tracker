'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { CalendarDays, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store/store';
import { allDomains, resolveDomain } from '@/lib/domains';
import { resolveCardSwipe } from '@/lib/swipeCard';
import { totalUpcoming as sumWeeks, type ForecastWeek } from '@/lib/upcoming';
import { domainPalette } from './domainVisuals';

function scrollToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

interface Props {
  weeks: ForecastWeek[];
}

export default function UpcomingForecast({ weeks }: Props) {
  const { data } = useStore();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion();
  const domainOrder = allDomains(data.domains).map(domain => domain.id);

  if (weeks.length === 0) return null;

  // Data can shrink under us (a review gets logged, the last week empties out),
  // so clamp rather than trusting the stored page index.
  const index = Math.min(page, weeks.length - 1);
  const week = weeks[index];
  const canGoBack = index > 0;
  const canGoForward = index < weeks.length - 1;
  const beyondThisWeek = sumWeeks(weeks) - weeks[0].total;

  function goTo(next: number) {
    if (next < 0 || next > weeks.length - 1) return;
    setDirection(next > index ? 1 : -1);
    setPage(next);
  }

  // Swiping left reveals later weeks, matching the review-card gesture.
  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const swipe = resolveCardSwipe(info.offset.x, info.velocity.x);
    if (swipe === 'left') goTo(index + 1);
    else if (swipe === 'right') goTo(index - 1);
  }

  const slide = reduceMotion
    ? { initial: false as const, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, x: direction >= 0 ? 28 : -28 },
        animate: { opacity: 1, x: 0 },
        exit:    { opacity: 0, x: direction >= 0 ? -28 : 28 },
      };

  return (
    <div className="mt-10 pt-6 border-t border-border">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={14} className="text-muted" />
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
          Upcoming · {week.label}
        </h2>
        <span className="text-xs text-muted/50 tabular">{week.total} reviews</span>
        <button
          type="button"
          onClick={scrollToTop}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg border border-border hover:border-border-strong rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
        >
          <ArrowUp size={13} /> Go up
        </button>
      </div>

      {/* Week pager — swipe on touch, chevrons/dots everywhere else. Hidden
          entirely when there's only one week's worth of reviews scheduled. */}
      {weeks.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={!canGoBack}
            aria-label="Previous week"
            className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border border-border text-muted hover:text-fg hover:border-border-strong disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Dots are 6px visually but sit inside a padded button so they stay
              tappable on a phone. */}
          <div className="flex items-center">
            {weeks.map((w, i) => (
              <button
                key={w.startKey}
                type="button"
                onClick={() => goTo(i)}
                aria-label={i === 0 ? 'Next 7 days' : `Week of ${w.label}`}
                aria-current={i === index ? 'true' : undefined}
                className="group/dot px-1 py-2 cursor-pointer"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? 'w-5 bg-accent' : 'w-1.5 bg-border-strong group-hover/dot:opacity-60'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={!canGoForward}
            aria-label="Next week"
            className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border border-border text-muted hover:text-fg hover:border-border-strong disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>

          {index === 0 && beyondThisWeek > 0 && (
            <span className="ml-auto text-[11px] text-muted/60 tabular">
              +{beyondThisWeek} beyond
            </span>
          )}
        </div>
      )}

      {/* Drag surface: pan-y keeps vertical page scrolling native, so only a
          clearly horizontal gesture pages the forecast. */}
      <motion.div
        drag={weeks.length > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ touchAction: 'pan-y' }}
        className="overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={week.startKey}
            initial={slide.initial}
            animate={slide.animate}
            exit={slide.exit}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {/* 7-day columns. Day/date/total header stays aligned across columns;
                the per-domain dot stack flows below with dynamic height, so a busy
                day simply reads taller — no fixed clip to overflow into the labels. */}
            <div className="flex items-start gap-1.5 sm:gap-2 mb-5">
              {week.slots.map((slot) => {
                const domainEntries = domainOrder
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
                    <span className={`text-[15px] font-semibold tabular leading-none mt-0.5 ${slot.total > 0 ? 'text-fg' : 'text-muted opacity-40'}`}>
                      {slot.total}
                    </span>

                    {/* Per-domain breakdown — dynamic height, hover to read each domain */}
                    <div className="flex flex-col items-center gap-0.5 pt-1.5">
                      {domainEntries.map(([domain, count]) => (
                        <div
                          key={domain}
                          className="flex items-center gap-1 rounded px-1 -mx-1 group-hover:bg-surface-2 transition-colors"
                          title={`${resolveDomain(data.domains, domain).name}: ${count}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${domainPalette(resolveDomain(data.domains, domain).color).text}`} style={{ backgroundColor: 'currentColor' }} />
                          <span className={`text-[10px] font-medium tabular ${domainPalette(resolveDomain(data.domains, domain).color).text}`}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Domain totals for the week on screen */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {domainOrder
                .filter(d => week.domainTotals[d] > 0)
                .map(domain => (
                  <span key={domain} className="text-xs text-muted">
                    <span className={`font-semibold ${domainPalette(resolveDomain(data.domains, domain).color).text}`}>
                      {week.domainTotals[domain]}
                    </span>
                    {' '}{resolveDomain(data.domains, domain).name}
                  </span>
                ))
              }
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
