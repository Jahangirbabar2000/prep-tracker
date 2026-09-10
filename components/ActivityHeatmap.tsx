'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { DayActivity } from '@/lib/store/metrics';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Fixed buckets (not quantiles) — a day with 10+ attempts should always read
// as "a lot" regardless of how busy other days were, same as GitHub's scale.
function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

// `--accent` isn't a Tailwind-registered color, so arbitrary opacity classes
// like bg-accent/25 don't compile — mix it against the cell background inline.
const LEVEL_MIX: (number | null)[] = [null, 30, 55, 78, 100];

function cellStyle(count: number): React.CSSProperties {
  const pct = LEVEL_MIX[levelFor(count)];
  return pct === null ? {} : { backgroundColor: `color-mix(in srgb, var(--accent) ${pct}%, var(--surface-2))` };
}

const CARD_WIDTH = 200; // px — needed to keep the card inside the graph
const CARD_HEIGHT = 60;  // rough max, only used to decide above-vs-below

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * The hover card: the day at a glance — how much, and how well. Anything more
 * belongs on that day's History page, which the cell already links to.
 */
function DayCard({ day }: { day: DayActivity }) {
  const recall = day.reviews ? Math.round((day.recalled / day.reviews) * 100) : null;
  const parts = [
    recall !== null ? `${recall}% recall on ${day.reviews}` : null,
    day.newCards > 0 ? `${day.newCards} new` : null,
  ].filter(Boolean);
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left shadow-lg whitespace-nowrap">
      <div className="flex items-baseline gap-2 text-[11px]">
        <span className="font-semibold text-fg">{formatDay(day.date)}</span>
        <span className="tabular text-muted">
          {day.count === 0 ? 'nothing logged' : `${day.count} attempt${day.count === 1 ? '' : 's'}`}
        </span>
      </div>
      {parts.length > 0 && <p className="text-[11px] text-muted tabular">{parts.join(' · ')}</p>}
    </div>
  );
}

/**
 * `dayHref` turns the grid into a navigation control: a cell with activity links
 * to that day's History page. Omit it and cells stay inert, as they were.
 */
export default function ActivityHeatmap({
  days,
  dayHref,
}: {
  days: DayActivity[];
  dayHref?: (date: string) => string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The card is positioned against the outer wrapper, not the scrolling grid:
  // the scroller clips its own overflow, so a card drawn inside it gets cut off.
  const [hover, setHover] = useState<{ day: DayActivity; x: number; y: number; below: boolean } | null>(null);

  // The 26-week grid fits the card at any normal width, but a narrow viewport
  // still scrolls it (columns bottom out at 11px). Chronological order reads
  // left-to-right, so anchor the scroll to the right edge: "today" is what you
  // see first, and scrolling *back* (left) reveals the past.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  function showCard(day: DayActivity, cell: HTMLElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapBox = wrap.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    const half = CARD_WIDTH / 2;
    const centre = box.left + box.width / 2 - wrapBox.left;
    // Cards open above the cell, except in the top rows where there is no room
    // — those flip below rather than spilling over the section heading.
    const below = box.top - wrapBox.top < CARD_HEIGHT;
    setHover({
      day,
      // Clamp so a cell near either edge still shows a card that fits.
      x: Math.min(Math.max(centre, half), Math.max(wrapBox.width - half, half)),
      y: below ? box.bottom - wrapBox.top + 6 : box.top - wrapBox.top - 6,
      below,
    });
  }

  const weeks: DayActivity[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // A month label sits above the first week whose first (Sunday) cell falls
  // in a new month — mirrors GitHub's contribution graph.
  let lastMonth = -1;
  const monthLabels = weeks.map(week => {
    const month = new Date(`${week[0].date}T00:00:00Z`).getUTCMonth();
    const isNew = month !== lastMonth;
    if (isNew) lastMonth = month;
    return isNew ? MONTH_NAMES[month] : null;
  });

  const totalCount = days.reduce((s, d) => s + (d.future ? 0 : d.count), 0);

  return (
    <div ref={wrapRef} className="relative">
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-full">
          <div className="flex gap-[3px] pl-7">
            {monthLabels.map((label, i) => (
              <span key={i} className="basis-0 grow min-w-[11px] text-[10px] text-muted whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]" onMouseLeave={() => setHover(null)}>
            <div className="flex flex-col gap-[3px] w-6 shrink-0">
              {DAY_LABELS.map((label, i) => (
                <span key={i} className="basis-0 grow flex items-center justify-end pr-1 text-[9px] text-muted">{label}</span>
              ))}
            </div>
            {weeks.map((week, wi) => (
              // Columns share the card's width rather than being a fixed 11px, so
              // half a year fills the same box a year of tiny squares used to.
              <div key={wi} className="flex flex-col gap-[3px] basis-0 grow min-w-[11px]">
                {week.map(day => {
                  const label = day.future
                    ? undefined
                    : `${day.date}: ${day.count} attempt${day.count === 1 ? '' : 's'}`;
                  const cls = `w-full aspect-square rounded-[2px] ${day.future ? 'invisible' : 'bg-surface-2'}`;
                  const style = day.future ? undefined : cellStyle(day.count);
                  // Hovering (or tabbing to) any real cell opens the day card —
                  // empty days included, since "nothing here" is a fact too.
                  const hoverProps = day.future ? {} : {
                    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showCard(day, e.currentTarget),
                    onFocus: (e: React.FocusEvent<HTMLElement>) => showCard(day, e.currentTarget),
                    onBlur: () => setHover(null),
                  };
                  // Only days with something to show are links — a 0-attempt cell
                  // would navigate to an empty page.
                  return dayHref && !day.future && day.count > 0 ? (
                    <Link
                      key={day.date}
                      href={dayHref(day.date)}
                      aria-label={label}
                      className={`${cls} block hover:ring-1 hover:ring-fg/40 transition-shadow`}
                      style={style}
                      {...hoverProps}
                    />
                  ) : (
                    <div key={day.date} aria-label={label} className={cls} style={style} {...hoverProps} />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pl-7 mt-0.5">
            <span className="text-[11px] text-muted">{totalCount} attempts in the last 6 months</span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted">
              Less
              {LEVEL_MIX.map((pct, i) => (
                <span
                  key={i}
                  className={`w-[11px] h-[11px] rounded-[2px] ${pct === null ? 'bg-surface-2' : ''}`}
                  style={pct === null ? undefined : { backgroundColor: `color-mix(in srgb, var(--accent) ${pct}%, var(--surface-2))` }}
                />
              ))}
              More
            </span>
          </div>
        </div>
      </div>
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30"
          style={{
            left: hover.x,
            top: hover.y,
            transform: `translate(-50%, ${hover.below ? '0' : '-100%'})`,
          }}
        >
          <DayCard day={hover.day} />
        </div>
      )}
    </div>
  );
}
