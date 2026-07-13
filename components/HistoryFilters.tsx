'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const DOMAINS = [
  { value: '',             label: 'All domains' },
  { value: 'dsa',         label: 'DSA' },
  { value: 'system_design', label: 'System Design' },
  { value: 'frontend',    label: 'Frontend' },
  { value: 'python',      label: 'Backend' },
  { value: 'ai',          label: 'AI' },
  { value: 'lld',         label: 'LLD' },
];

const selectCls = 'bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 transition cursor-pointer';

export default function HistoryFilters({ currentDomain, basePath = '/review/history' }: { currentDomain: string; basePath?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <select value={currentDomain} onChange={e => set('domain', e.target.value)} className={selectCls}>
        {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
    </div>
  );
}
