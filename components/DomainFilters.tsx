'use client';

import { useRouter } from 'next/navigation';

export interface SelectConfig {
  key: string;        // query-param name
  placeholder: string;
  current: string;
  options: string[];
}

interface Props {
  basePath: string;
  selects: SelectConfig[];
  currentSort: string;
}

const cls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Sort: Newest first' },
  { value: 'oldest',      label: 'Sort: Oldest first' },
  { value: 'next_review', label: 'Sort: Next review' },
];

export default function DomainFilters({ basePath, selects, currentSort }: Props) {
  const router = useRouter();

  function push(changedKey: string, changedValue: string) {
    const params = new URLSearchParams();
    for (const s of selects) {
      const v = s.key === changedKey ? changedValue : s.current;
      if (v) params.set(s.key, v);
    }
    const sort = changedKey === 'sort' ? changedValue : currentSort;
    if (sort && sort !== 'newest') params.set('sort', sort);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const hasFilter = selects.some(s => s.current) || (currentSort && currentSort !== 'newest');

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap mb-6 items-center">
      {selects.map(s => (
        <select
          key={s.key}
          value={s.current}
          onChange={e => push(s.key, e.target.value)}
          className={`${cls} w-full sm:w-auto`}
        >
          <option value="">{s.placeholder}</option>
          {s.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}

      <select
        value={currentSort || 'newest'}
        onChange={e => push('sort', e.target.value)}
        className={`${cls} w-full sm:w-auto`}
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasFilter && (
        <button
          onClick={() => router.push(basePath)}
          className="px-3 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer col-span-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
