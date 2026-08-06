'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store/store';
import { allDomains } from '@/lib/domains';

const selectCls = 'bg-surface border border-border rounded-lg px-3 py-1.5 text-base sm:text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 transition cursor-pointer';

export default function HistoryFilters({ currentDomain, basePath = '/review/history' }: { currentDomain: string; basePath?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { data } = useStore();
  const domains = allDomains(data.domains);

  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <select value={currentDomain} onChange={e => set('domain', e.target.value)} className={selectCls}>
        <option value="">All domains</option>
        {domains.map(domain => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
      </select>
    </div>
  );
}
