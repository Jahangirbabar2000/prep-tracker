'use client';

import { useState, useMemo } from 'react';
import { Problem } from '@/lib/types';
import ProblemList from './ProblemList';
import DomainFilters from './DomainFilters';

export interface DomainFilterConfig {
  key: string;
  placeholder: string;
  field: keyof Problem;
}

interface Props {
  allProblems: Problem[];
  basePath: string;
  filterConfigs: DomainFilterConfig[];
  initialParams: Record<string, string>;
  emptyMessage: string;
}

const PROFICIENCY_ORDER = ['New', 'Struggling', 'Learning', 'Familiar', 'Confident', 'Mastered'];

function proficiencyLabel(p: Problem): string {
  if (p.interval_level === 0 && !p.next_due_date) return 'New';
  if (p.interval_level === 0) return 'Struggling';
  if (p.interval_level === 1) return 'Learning';
  if (p.interval_level === 2) return 'Familiar';
  if (p.interval_level === 3) return 'Confident';
  return 'Mastered';
}

function sortedProblems(problems: Problem[], sort: string): Problem[] {
  const arr = [...problems];
  if (sort === 'next_review') {
    return arr.sort((a, b) => {
      if (!a.next_due_date && !b.next_due_date) return 0;
      if (!a.next_due_date) return 1;
      if (!b.next_due_date) return -1;
      return a.next_due_date < b.next_due_date ? -1 : 1;
    });
  }
  if (sort === 'oldest') return arr.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return arr.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
}

// Score a problem against a search query — lower is better, -1 means no match
function searchScore(p: Problem, q: string): number {
  const name = p.name.toLowerCase();
  const idx = name.indexOf(q);
  if (idx === -1) return -1;
  if (idx === 0) return 0;                          // starts with query
  if (name[idx - 1] === ' ') return 1;              // word boundary match
  return 2;                                         // substring match
}

export default function DomainPageClient({
  allProblems,
  basePath,
  filterConfigs,
  initialParams,
  emptyMessage,
}: Props) {
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const fc of filterConfigs) init[fc.key] = initialParams[fc.key] ?? '';
    init.proficiency = initialParams.proficiency ?? '';
    init.sort = initialParams.sort ?? '';
    return init;
  });
  const [search, setSearch] = useState(initialParams.q ?? '');

  function updateFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
    const next = { ...filters, [key]: value };
    syncUrl(next, search);
  }

  function updateSearch(value: string) {
    setSearch(value);
    syncUrl(filters, value);
  }

  function syncUrl(f: Record<string, string>, s: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v && !(k === 'sort' && v === 'newest')) params.set(k, v);
    }
    if (s.trim()) params.set('q', s.trim());
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${basePath}?${qs}` : basePath);
  }

  function clearFilters() {
    const cleared: Record<string, string> = { proficiency: '', sort: '' };
    for (const fc of filterConfigs) cleared[fc.key] = '';
    setFilters(cleared);
    setSearch('');
    window.history.replaceState(null, '', basePath);
  }

  // Derive available filter options only from values present in actual data
  const derivedOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const fc of filterConfigs) {
      const vals = new Set<string>();
      for (const p of allProblems) {
        const v = p[fc.field];
        if (v != null && String(v) !== '') vals.add(String(v));
      }
      opts[fc.key] = [...vals].sort();
    }
    const profSet = new Set(allProblems.map(proficiencyLabel));
    opts.proficiency = PROFICIENCY_ORDER.filter(l => profSet.has(l));
    return opts;
  }, [allProblems, filterConfigs]);

  // Apply filters + search + sort in memory
  const visible = useMemo(() => {
    let result = allProblems;

    // Dropdown filters
    for (const fc of filterConfigs) {
      const val = filters[fc.key];
      if (val) result = result.filter(p => String(p[fc.field] ?? '') === val);
    }
    if (filters.proficiency) {
      result = result.filter(p => proficiencyLabel(p) === filters.proficiency);
    }

    // Search: filter then sort by match quality
    const q = search.trim().toLowerCase();
    if (q) {
      const scored = result
        .map(p => ({ p, score: searchScore(p, q) }))
        .filter(({ score }) => score !== -1);
      scored.sort((a, b) => a.score - b.score);
      result = scored.map(({ p }) => p);
      return result; // skip date sort when searching — relevance order is more useful
    }

    return sortedProblems(result, filters.sort || 'newest');
  }, [allProblems, filters, filterConfigs, search]);

  const selects = [
    ...filterConfigs.map(fc => ({
      key: fc.key,
      placeholder: fc.placeholder,
      current: filters[fc.key] ?? '',
      options: derivedOptions[fc.key] ?? [],
    })),
    {
      key: 'proficiency',
      placeholder: 'All levels',
      current: filters.proficiency ?? '',
      options: derivedOptions.proficiency ?? [],
    },
  ];

  const hasFilter = search.trim() !== '' ||
    Object.entries(filters).some(([k, v]) => v !== '' && !(k === 'sort' && v === 'newest'));

  return (
    <>
      <DomainFilters
        selects={selects}
        currentSort={filters.sort || ''}
        onFilterChange={updateFilter}
        search={search}
        onSearchChange={updateSearch}
        hasFilter={hasFilter}
        onClear={clearFilters}
      />
      {visible.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">
          {hasFilter ? 'No questions match.' : emptyMessage}
        </p>
      ) : (
        <ProblemList
          problems={visible}
          basePath={basePath}
          groupByDate={!search.trim() && (filters.sort || '') !== 'next_review'}
        />
      )}
    </>
  );
}
