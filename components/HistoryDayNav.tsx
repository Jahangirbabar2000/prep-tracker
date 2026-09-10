'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adjacentDay } from '@/lib/historyDay';

/**
 * Day stepper for the History page.
 *
 * The arrows step one calendar day at a time over *every* day, including ones
 * you logged nothing on — a rest day is part of your history and skipping it
 * would hide the gap. They stop at today going forward and at your first logged
 * day going back (see adjacentDay). An empty day renders its own empty state,
 * which offers a jump to the last session before it, so a long gap doesn't have
 * to be walked one click at a time.
 *
 * Navigation goes through the URL — `?date=` is the single source of truth, so
 * every view is linkable and the back button works. `date` is dropped entirely
 * when it equals today, keeping the canonical "/review/history" URL clean.
 */
export default function HistoryDayNav({
  date,
  today,
  days,
  basePath = '/review/history',
}: {
  date: string;
  today: string;
  days: string[];
  basePath?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // `days` is only consulted for its earliest entry — the back stop. Everything
  // before your first logged day is empty by definition, so there is nothing to
  // walk into.
  const prev = adjacentDay(date, -1, today, days[0]);
  const next = adjacentDay(date, 1, today, days[0]);

  const go = useCallback((target: string) => {
    const params = new URLSearchParams(sp.toString());
    if (target === today) params.delete('date');
    else params.set('date', target);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }, [basePath, router, sp, today]);

  // ArrowLeft / ArrowRight step the day, same targets as the buttons.
  //
  // The INPUT/SELECT guard is not optional here: the date picker and the domain
  // select both live in this row, and arrow keys inside them mean "change the
  // value". Without the guard, nudging the day field would also navigate. Same
  // guard shape as GlobalShortcuts, plus modifiers so browser history
  // (Cmd/Alt + arrow) still works.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const target = e.key === 'ArrowLeft' ? prev : next;
      if (!target) return;
      e.preventDefault();
      go(target);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, go]);

  // bg-surface, so the arrows sit on the same panel colour as the date input and
  // the domain select next to them. A disabled arrow dims only its chevron —
  // putting opacity on the button would fade the fill back to the page
  // background, which is the one thing these buttons are meant to sit above.
  const btn = 'p-1.5 rounded-lg border border-border bg-surface text-muted transition-colors';
  const btnOn = `${btn} hover:text-fg hover:bg-surface-2 cursor-pointer`;
  const btnOff = `${btn} cursor-not-allowed`;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <button
        onClick={() => prev && go(prev)}
        disabled={!prev}
        aria-label={prev ? `Previous day (${prev})` : 'Start of your history'}
        // The keyboard hint lives here rather than as a visible label — a "← →"
        // caption next to these buttons just reads as two more arrow controls.
        title={prev ? `${prev}  (←)` : 'Start of your history'}
        className={prev ? btnOn : btnOff}
      >
        <ChevronLeft size={15} className={prev ? undefined : 'opacity-30'} />
      </button>

      <input
        type="date"
        value={date}
        max={today}
        onChange={e => { if (e.target.value) go(e.target.value); }}
        aria-label="Jump to a day"
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-base sm:text-sm text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent/40 transition cursor-pointer"
      />

      <button
        onClick={() => next && go(next)}
        disabled={!next}
        aria-label={next ? `Next day (${next})` : 'Today — no later day'}
        title={next ? `${next}  (→)` : 'Today — no later day'}
        className={next ? btnOn : btnOff}
      >
        <ChevronRight size={15} className={next ? undefined : 'opacity-30'} />
      </button>

      {date !== today && (
        <button
          onClick={() => go(today)}
          className="px-3 py-1.5 text-xs font-semibold text-fg bg-surface border border-border rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
        >
          Today
        </button>
      )}
    </div>
  );
}
