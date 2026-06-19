'use client';

import { useRouter } from 'next/navigation';

const cls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

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

  function push(domain: string, proficiency: string) {
    const params = new URLSearchParams();
    if (domain)      params.set('domain', domain);
    if (proficiency) params.set('proficiency', proficiency);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/');
  }

  const hasFilter = !!currentDomain || !!currentProficiency;

  if (availableDomains.length === 0) return null;

  return (
    <div className="hidden md:flex flex-wrap gap-2 mb-5 items-center">
      {availableDomains.length > 1 && (
        <select
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
          onClick={() => router.push('/')}
          className="px-3 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
