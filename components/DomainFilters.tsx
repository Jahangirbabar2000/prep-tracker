'use client';

import { Search } from 'lucide-react';

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
  search: string;
  onSearchChange: (value: string) => void;
  hasFilter: boolean;
  onClear: () => void;
}

const selectCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-base sm:text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Sort: Newest' },
  { value: 'oldest',      label: 'Sort: Oldest' },
  { value: 'next_review', label: 'Sort: Next review' },
];

export default function DomainFilters({ selects, currentSort, onFilterChange, search, onSearchChange, hasFilter, onClear }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
      {/* Search — left, stretches to fill available space */}
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search questions…"
          className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
        />
      </div>

      {/* Filters — right, wrap on mobile */}
      <div className="flex items-center gap-2 flex-wrap">
        {selects.map(s => s.options.length >= 3 && (
          <select
            key={s.key}
            value={s.current}
            onChange={e => onFilterChange(s.key, e.target.value)}
            className={selectCls}
          >
            <option value="">{s.placeholder}</option>
            {s.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        <select
          value={currentSort || 'newest'}
          onChange={e => onFilterChange('sort', e.target.value)}
          className={selectCls}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {hasFilter && (
          <button
            onClick={onClear}
            className="px-3 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
