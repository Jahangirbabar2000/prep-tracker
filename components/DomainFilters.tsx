'use client';

export interface SelectConfig {
  key: string;
  placeholder: string;
  current: string;
  options: string[];
}

interface Props {
  selects: SelectConfig[];
  currentSort: string;
  onFilterChange: (key: string, value: string) => void;
  hasFilter: boolean;
  onClear: () => void;
}

const cls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Sort: Newest first' },
  { value: 'oldest',      label: 'Sort: Oldest first' },
  { value: 'next_review', label: 'Sort: Next review' },
];

export default function DomainFilters({ selects, currentSort, onFilterChange, hasFilter, onClear }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap mb-6 items-center">
      {selects.map(s => s.options.length >= 3 && (
        <select
          key={s.key}
          value={s.current}
          onChange={e => onFilterChange(s.key, e.target.value)}
          className={`${cls} w-full sm:w-auto`}
        >
          <option value="">{s.placeholder}</option>
          {s.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}

      <select
        value={currentSort || 'newest'}
        onChange={e => onFilterChange('sort', e.target.value)}
        className={`${cls} w-full sm:w-auto`}
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasFilter && (
        <button
          onClick={onClear}
          className="px-3 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer col-span-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
