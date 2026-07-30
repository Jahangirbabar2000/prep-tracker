'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { activeDomains, domainById } from '@/lib/domains';
import { useStore } from '@/lib/store/store';
import SchemaLogForm from './SchemaLogForm';

const inputCls = 'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40';

export default function GlobalSchemaLog() {
  const search = useSearchParams();
  const { data, ready } = useStore();
  const domains = useMemo(() => activeDomains(data.domains), [data.domains]);
  const requested = search.get('domain');
  const initial = requested && domainById(domains, requested) ? requested : domains[0]?.id;
  const [domainId, setDomainId] = useState(initial ?? '');
  useEffect(() => {
    if (!ready || domainById(domains, domainId)) return;
    setDomainId(
      requested && domainById(domains, requested)
        ? requested
        : domains[0]?.id ?? '',
    );
  }, [domainId, domains, ready, requested]);
  const selected = domainById(domains, domainId) ?? domains[0];
  if (!ready) return null;
  if (!selected) return <p className="text-sm text-muted">Create an active domain in Settings before logging.</p>;
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">Domain</span>
        <select value={selected.id} onChange={event => setDomainId(event.target.value)} className={inputCls}>
          {domains.map(domain => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
        </select>
      </label>
      <SchemaLogForm key={selected.id} domain={selected} />
    </div>
  );
}
