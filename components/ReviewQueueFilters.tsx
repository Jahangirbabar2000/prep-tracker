'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ArrowDown } from 'lucide-react';

const cls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

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
  availableDomains: { value: string; label: string }[];
  availableProficiencies: string[];
}

export default function ReviewQueueFilters({
  currentDomain,
  currentProficiency,
  availableDomains,
  availableProficiencies,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function push(domain: string, proficiency: string) {
    const params = new URLSearchParams();
    if (domain)      params.set('domain', domain);
    if (proficiency) params.set('proficiency', proficiency);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : '/', { scroll: false } as never);
    });
  }

  const hasFilter = !!currentDomain || !!currentProficiency;

  if (availableDomains.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 mb-5 items-center transition-opacity duration-150 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      {availableDomains.length > 1 && (
        <select
          name="domain"
          aria-label="Filter by domain"
          value={currentDomain}
          onChange={e => push(e.target.value, currentProficiency)}
          className={cls}
        >
          <option value="">All domains</option>
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
          onChange={e => push(currentDomain, e.target.value)}
          className={cls}
        >
          <option value="">All levels</option>
          {availableProficiencies.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {hasFilter && (
        <button
          onClick={() => startTransition(() => router.replace('/', { scroll: false } as never))}
          className="px-3 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer"
        >
          Clear
        </button>
      )}

      {/* Flush-right, mirroring the "Go up" button in the forecast footer. */}
      <button
        type="button"
        onClick={scrollToBottom}
        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg border border-border hover:border-border-strong rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
      >
        <ArrowDown size={13} /> Go down
      </button>
    </div>
  );
}
