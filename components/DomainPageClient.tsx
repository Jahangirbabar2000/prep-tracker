'use client';

import { useState, useMemo } from 'react';
import { Problem } from '@/lib/types';
import { PROFICIENCY_LABELS, proficiencyLabel } from '@/lib/proficiency';
import { orderFieldValues } from '@/lib/domains';
import ProblemList from './ProblemList';
import DomainFilters from './DomainFilters';

export interface DomainFilterConfig {
  key: string;
  placeholder: string;
  field: string;
  /** The field's options in configured order; see orderFieldValues(). */
  order?: string[];
}

interface Props {
  allProblems: Problem[];
  basePath: string;
  filterConfigs: DomainFilterConfig[];
  initialParams: Record<string, string>;
  emptyMessage: string;
}

const PROFICIENCY_ORDER: readonly string[] = PROFICIENCY_LABELS;

// Shared definition — domainProblems() populates attempt_count, which is what
// separates a freshly logged "New" card from one that is genuinely "Struggling".
function labelOf(p: Problem): string {
  return proficiencyLabel(p.interval_level, !!p.next_due_date, p.attempt_count ?? 0);
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

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[b.length];
}

function fuzzyWordScore(titleWords: string[], queryWord: string): number {
  const maxDist = queryWord.length <= 4 ? 1 : queryWord.length <= 7 ? 2 : 3;
  let best = Infinity;
  for (const w of titleWords) {
    const d = levenshtein(queryWord, w);
    if (d < best) best = d;
  }
  return best <= maxDist ? best : -1;
}

// Score a problem against a search query — lower is better, -1 means no match.
// Pass 1: exact substring (scores 0-2). Pass 2: word-level Levenshtein (scores 3-4).
function searchScore(p: Problem, q: string): number {
  const name = p.name.toLowerCase();

  // Exact pass
  const idx = name.indexOf(q);
  if (idx === 0) return 0;
  if (idx > 0 && name[idx - 1] === ' ') return 1;
  if (idx > 0) return 2;

  // Fuzzy pass — each query word must match a title word within edit distance
  if (q.length >= 3) {
    const titleWords = name.split(/\W+/).filter(w => w.length >= 2);
    const queryWords = q.split(/\s+/).filter(w => w.length >= 3);
    if (queryWords.length === 0) return -1;
    let totalDist = 0;
    for (const qw of queryWords) {
      const s = fuzzyWordScore(titleWords, qw);
      if (s === -1) return -1;
      totalDist += s;
    }
    return totalDist === 0 ? 3 : 4;
  }

  return -1;
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
      if (v && !(k === 'sort' && v === 'oldest')) params.set(k, v);
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

  // Each dropdown's options reflect the OTHER active filters, not the whole
  // domain — so choosing a bucket narrows Topic to that bucket's topics, and no
  // dropdown ever offers a combination that would return nothing. Same rule the
  // review queue uses (app/page.tsx). A filter never narrows itself, or picking
  // a value would leave it as the only option.
  const derivedOptions = useMemo(() => {
    // Does this problem satisfy every active filter except the one we're
    // building options for?
    const matchesOthers = (p: Problem, exceptKey: string) => {
      for (const fc of filterConfigs) {
        if (fc.key === exceptKey) continue;
        const val = filters[fc.key];
        if (val && String(p.metadata[fc.field] ?? '') !== val) return false;
      }
      if (exceptKey !== 'proficiency' && filters.proficiency && labelOf(p) !== filters.proficiency) {
        return false;
      }
      return true;
    };

    const opts: Record<string, string[]> = {};
    for (const fc of filterConfigs) {
      const vals = new Set<string>();
      for (const p of allProblems) {
        if (!matchesOthers(p, fc.key)) continue;
        const v = p.metadata[fc.field];
        if (v != null && String(v) !== '') vals.add(String(v));
      }
      // Keep the current selection listed even once the other filters have
      // narrowed past it, so the <select> can still render what it's set to.
      const current = filters[fc.key];
      if (current) vals.add(current);
      opts[fc.key] = orderFieldValues([...vals], fc.order ?? []);
    }

    const profSet = new Set(
      allProblems.filter(p => matchesOthers(p, 'proficiency')).map(labelOf),
    );
    if (filters.proficiency) profSet.add(filters.proficiency);
    opts.proficiency = PROFICIENCY_ORDER.filter(l => profSet.has(l));
    return opts;
  }, [allProblems, filterConfigs, filters]);

  // Apply filters + search + sort in memory
  const visible = useMemo(() => {
    let result = allProblems;

    // Dropdown filters
    for (const fc of filterConfigs) {
      const val = filters[fc.key];
      if (val) result = result.filter(p => String(p.metadata[fc.field] ?? '') === val);
    }
    if (filters.proficiency) {
      result = result.filter(p => labelOf(p) === filters.proficiency);
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

    return sortedProblems(result, filters.sort || 'oldest');
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
    Object.entries(filters).some(([k, v]) => v !== '' && !(k === 'sort' && v === 'oldest'));

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
