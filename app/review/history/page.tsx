'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fmtDate } from '@/lib/fmt';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HistoryFilters from '@/components/HistoryFilters';
import HistoryList from '@/components/HistoryList';
import { Domain } from '@/lib/types';
import { useStore } from '@/lib/store/store';
import { historyBuckets, clientToday } from '@/lib/store/queries';

const DOMAIN_ORDER: Domain[] = ['dsa', 'python', 'frontend', 'system_design', 'ai', 'lld'];
const DOMAIN_LABEL: Record<Domain, string> = {
  dsa: 'DSA', system_design: 'System Design', frontend: 'Frontend', python: 'Backend', ai: 'AI', lld: 'LLD',
};

function HistoryInner() {
  const sp = useSearchParams();
  const { data, ready } = useStore();
  const filterDomain = sp.get('domain') ?? '';
  const today = clientToday();

  const { reviewed, added } = historyBuckets(data, today, filterDomain || undefined);

  const totalReviewed = reviewed.length;
  const struggled     = reviewed.filter(a => a.struggled).length;
  const gotIt         = totalReviewed - struggled;

  const byDomain: Partial<Record<Domain, number>> = {};
  for (const a of reviewed) byDomain[a.domain] = (byDomain[a.domain] ?? 0) + 1;

  const isEmpty = reviewed.length === 0 && added.length === 0;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors mb-2">
            <ArrowLeft size={13} /> Review Queue <span className="opacity-40 ml-0.5">Esc</span>
          </Link>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Today&apos;s History</h1>
          <p className="text-sm text-muted mt-0.5">{fmtDate(today)}</p>
        </div>
      </div>

      <HistoryFilters currentDomain={filterDomain} />

      {!ready ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-fg font-medium">No activity yet today.</p>
          <p className="text-sm text-muted mt-1 mb-5">Start a session or log a question to see it here.</p>
          <Link href="/review/session" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors">
            Start Session
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats — reviews only */}
          {totalReviewed > 0 && (
            <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-6 flex flex-col gap-3">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-fg tabular">{totalReviewed}</p>
                  <p className="text-xs text-muted mt-0.5">reviewed</p>
                </div>
                <div className="w-px h-8 bg-border shrink-0" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent tabular">{gotIt}</p>
                  <p className="text-xs text-muted mt-0.5">got it</p>
                </div>
                <div className="w-px h-8 bg-border shrink-0" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-danger tabular">{struggled}</p>
                  <p className="text-xs text-muted mt-0.5">struggled</p>
                </div>
              </div>
              {Object.keys(byDomain).length > 1 && (
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
                  {DOMAIN_ORDER.filter(d => byDomain[d]).map(d => (
                    <span key={d} className="inline-flex items-center gap-1.5 text-xs text-muted px-2 py-0.5 bg-surface-2 rounded-full">
                      <span className="font-medium text-fg">{byDomain[d]}</span>
                      {DOMAIN_LABEL[d]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <HistoryList reviewed={reviewed} added={added} />
        </>
      )}
    </div>
  );
}

export default function TodayHistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryInner />
    </Suspense>
  );
}
