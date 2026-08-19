'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ArrowDown, X } from 'lucide-react';
import { DEFAULT_QUEUE_ORDER, QUEUE_ORDER_OPTIONS } from '@/lib/filters';
import type { QueueOrder } from '@/lib/store/queries';

// All three controls stay on one row, phone included. At their natural width
// they can't: a select is as wide as its widest option, so the domain one alone
// wants 180px of a 358px row ("Machine Learning"). So on mobile each takes a
// share of the row instead — min-w-0 plus a flex weight (below, per select)
// overrides that intrinsic width — and ellipsises what doesn't fit. The weights
// aren't equal thirds but proportional to what the unfiltered labels need, so
// "Level" doesn't sit on 20px of slack that "Overdue" is being ellipsised for;
// that keeps the row you land on clean down to a 360px viewport. A long
// *selected* value still ellipsises, which no split can avoid. The max-width is
// the other end of it: either filter select is dropped when the queue has only
// one domain or one level, and the survivors shouldn't stretch to fill the row.
//
// Natural widths come back at sm+, where there's room for them. text-base
// (16px) on mobile avoids iOS Safari's auto-zoom-on-focus for sub-16px form
// controls, and just reads more comfortably on a phone.
const cls = 'min-w-0 max-w-40 truncate sm:max-w-none sm:flex-none bg-surface border border-border rounded-lg px-2 sm:px-3 py-2 text-base sm:text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

// Mirror of scrollToTop in UpcomingForecast — cover both the <main> scroll
// container (desktop) and the window (mobile) so it works on every layout.
function scrollToBottom() {
  const main = document.querySelector('main');
  if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
}

interface Props {
  currentDomain: string;
  currentProficiency: string;
  currentOrder: QueueOrder;
  availableDomains: { value: string; label: string }[];
  availableProficiencies: string[];
}

export default function ReviewQueueFilters({
  currentDomain,
  currentProficiency,
  currentOrder,
  availableDomains,
  availableProficiencies,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Rebuilt from the current props each time (rather than from the live URL) so
  // unknown params stay dropped, as before. Keyed rather than positional —
  // three positional args across three controls is a missed-argument bug
  // waiting to happen. Mirrors set() in HistoryFilters.
  function set(key: 'domain' | 'proficiency' | 'order', value: string) {
    const next = {
      domain: currentDomain,
      proficiency: currentProficiency,
      order: currentOrder as string,
      [key]: value,
    };
    const params = new URLSearchParams();
    if (next.domain)      params.set('domain', next.domain);
    if (next.proficiency) params.set('proficiency', next.proficiency);
    // The default order stays out of the URL, matching the domain pages.
    if (next.order !== DEFAULT_QUEUE_ORDER) params.set('order', next.order);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : '/', { scroll: false } as never);
    });
  }

  // A non-default order counts for "Clear" (which resets everything) but the
  // two dropdowns are what "filtering" means here.
  const hasFilter = !!currentDomain || !!currentProficiency || currentOrder !== DEFAULT_QUEUE_ORDER;

  if (availableDomains.length === 0) return null;

  return (
    <div className={`flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 mb-5 items-center transition-opacity duration-150 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* The unfiltered labels are the short ones ("Domain", not "All
          domains") — with three of them sharing a phone's row, the longer copy
          only got ellipsised. The empty value still means "no filter". */}
      {availableDomains.length > 1 && (
        <select
          name="domain"
          aria-label="Filter by domain"
          value={currentDomain}
          onChange={e => set('domain', e.target.value)}
          className={`flex-1 ${cls}`}
        >
          <option value="">Domain</option>
          {availableDomains.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      )}

      {availableProficiencies.length > 1 && (
        <select
          name="proficiency"
          aria-label="Filter by level"
          value={currentProficiency}
          onChange={e => set('proficiency', e.target.value)}
          className={`flex-[0.8] ${cls}`}
        >
          <option value="">Level</option>
          {availableProficiencies.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {/* Always rendered — it's a sort, not a filter, so there's no "only one
          option available" case that would make it pointless. */}
      <select
        name="order"
        aria-label="Sort order"
        value={currentOrder}
        onChange={e => set('order', e.target.value)}
        className={`flex-[1.1] ${cls}`}
      >
        {QUEUE_ORDER_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Icon-only on mobile, like the button below it: spelling out "Clear"
          would come straight out of the three selects' share of the row. */}
      {hasFilter && (
        <button
          onClick={() => startTransition(() => router.replace('/', { scroll: false } as never))}
          title="Clear filters"
          aria-label="Clear filters"
          className="shrink-0 inline-flex items-center px-1 py-2 sm:px-3 text-sm text-muted hover:text-fg transition-colors cursor-pointer"
        >
          <X size={15} className="sm:hidden" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      )}

      {/* Flush-right, mirroring the "Go up" button in the forecast footer.
          Icon-only on mobile so it stays on the same row as the selects
          instead of wrapping onto a lonely line of its own. */}
      <button
        type="button"
        onClick={scrollToBottom}
        title="Go down"
        aria-label="Go down"
        className="shrink-0 ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg border border-border hover:border-border-strong rounded-lg px-1.5 sm:px-2.5 py-1.5 sm:py-1 transition-colors cursor-pointer"
      >
        <ArrowDown size={13} /> <span className="hidden sm:inline">Go down</span>
      </button>
    </div>
  );
}
