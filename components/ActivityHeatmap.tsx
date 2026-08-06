'use client';

import { useEffect, useRef } from 'react';
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

export default function ActivityHeatmap({ days }: { days: DayActivity[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chronological order (oldest -> newest) reads naturally left-to-right, but
  // "today" should be what you see first — anchor the scroll position to the
  // right edge on load, so scrolling *back* (left) is what reveals the past.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

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
    <div ref={scrollRef} className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1 min-w-full">
        <div className="flex gap-[3px] pl-7">
          {monthLabels.map((label, i) => (
            <span key={i} className="w-[11px] text-[10px] text-muted shrink-0" style={{ marginRight: label ? undefined : 0 }}>
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] w-6 shrink-0">
            {DAY_LABELS.map((label, i) => (
              <span key={i} className="h-[11px] text-[9px] leading-[11px] text-muted text-right pr-1">{label}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map(day => (
                <div
                  key={day.date}
                  title={day.future ? undefined : `${day.date}: ${day.count} attempt${day.count === 1 ? '' : 's'}`}
                  className={`w-[11px] h-[11px] rounded-[2px] ${day.future ? 'invisible' : 'bg-surface-2'}`}
                  style={day.future ? undefined : cellStyle(day.count)}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 pl-7 mt-0.5">
          <span className="text-[11px] text-muted">{totalCount} attempts in the last year</span>
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
  );
}
