'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import EscapeBack from '@/components/EscapeBack';
import SchemaLogForm from '@/components/SchemaLogForm';
import { useStore } from '@/lib/store/store';
import { domainBySlug } from '@/lib/domains';

export default function RuntimeDomainLogPage() {
  const { domainSlug } = useParams<{ domainSlug: string }>();
  const { data, ready } = useStore();
  const domain = domainBySlug(data.domains, domainSlug);
  if (!ready) return null;
  if (!domain || domain.archived_at) return <p className="text-sm text-muted py-12 text-center">Domain not available for logging.</p>;
  const basePath = `/${domain.slug}`;
  return (
    <div className="max-w-2xl">
      <EscapeBack href={basePath} />
      <Link href={basePath} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> {domain.name} <span className="opacity-40 font-normal text-[10px] ml-0.5">Esc</span>
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">{domain.log_title}</h1>
      <SchemaLogForm domain={domain} />
    </div>
  );
}
