'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Domain } from '@/lib/types';
import DomainPageClient, { DomainFilterConfig } from '@/components/DomainPageClient';
import LogShortcut from '@/components/LogShortcut';
import { useStore } from '@/lib/store/store';
import { domainProblems, todayStats, clientToday } from '@/lib/store/queries';

interface Props {
  domain: Domain;
  title: string;
  basePath: string;
  logLabel: string;
  filterConfigs: DomainFilterConfig[];
  emptyMessage: string;
}

function DomainListInner({ domain, title, basePath, logLabel, filterConfigs, emptyMessage }: Props) {
  const sp = useSearchParams();
  const { data, ready } = useStore();
  const today = clientToday();

  const problems = domainProblems(data, domain);
  const todayCount = todayStats(data, today).counts[domain] ?? 0;
  const initialParams = Object.fromEntries(sp.entries());

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">{title}</h1>
          <span className="text-sm text-muted">
            <span className="font-semibold text-fg tabular">{ready ? problems.length : '—'}</span> total
          </span>
          {todayCount > 0 && (
            <span className="text-sm text-muted">
              · <span className="font-semibold text-accent tabular">{todayCount}</span> today
            </span>
          )}
        </div>
        <LogShortcut href={`${basePath}/log`} />
        <Link href={`${basePath}/log`} className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer">
          <Plus size={16} /> {logLabel} <span className="opacity-50 font-normal text-xs ml-0.5">L</span>
        </Link>
      </div>

      {ready ? (
        <DomainPageClient
          allProblems={problems}
          basePath={basePath}
          filterConfigs={filterConfigs}
          initialParams={initialParams}
          emptyMessage={emptyMessage}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DomainListPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <DomainListInner {...props} />
    </Suspense>
  );
}
