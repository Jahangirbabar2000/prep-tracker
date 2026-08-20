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

// flex-1 min-w-0 on mobile: text-base (16px) has to stay to avoid iOS Safari's
// auto-zoom-on-focus, so the selects share the row and clip their own labels
// rather than wrapping onto extra lines. Intrinsic width again from sm up.
const selectCls = 'flex-1 min-w-0 sm:flex-none min-h-11 sm:min-h-0 truncate bg-surface border border-border rounded-lg px-2 sm:px-3 py-2 text-base sm:text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition cursor-pointer';

const SORT_OPTIONS = [
  { value: 'newest',      label: 'Newest' },
  { value: 'oldest',      label: 'Oldest' },
  { value: 'next_review', label: 'Next review' },
];

// "All topics" -> "Topic". The selects share one row on a phone, and at 16px
// (kept to avoid iOS auto-zoom) each gets ~70px of text: the field name fits
// where the "All x" phrasing clipped mid-word. The full placeholder still goes
// to aria-label, so nothing is lost for screen readers.
function shortLabel(placeholder: string): string {
  const noun = placeholder.replace(/^All\s+/i, '').replace(/s$/, '');
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

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
          aria-label="Search questions"
          placeholder="Search questions…"
          className="w-full min-h-11 sm:min-h-0 truncate bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-base sm:text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
        />
      </div>

      {/* Filters — right; one shared row on mobile, wrapping only from sm up */}
      <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap">
        {selects.map(s => s.options.length >= 3 && (
          <select
            key={s.key}
            aria-label={s.placeholder}
            value={s.current}
            onChange={e => onFilterChange(s.key, e.target.value)}
            className={selectCls}
          >
            <option value="">{shortLabel(s.placeholder)}</option>
            {s.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        <select
          aria-label="Sort order"
          value={currentSort || 'oldest'}
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
            className="shrink-0 min-h-11 sm:min-h-0 px-2 sm:px-3 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
