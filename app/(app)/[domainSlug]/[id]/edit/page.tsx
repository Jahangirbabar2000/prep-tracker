'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';
import { useStore } from '@/lib/store/store';
import { domainBySlugWithFallback } from '@/lib/domains';

export default function RuntimeDomainEditPage() {
  const { domainSlug, id } = useParams<{ domainSlug: string; id: string }>();
  const { data, ready } = useStore();
  const domain = domainBySlugWithFallback(data.domains, data.problems, domainSlug);
  if (!ready) return null;
  if (!domain) return <p className="text-sm text-muted py-12 text-center">Domain not found.</p>;
  return <ProblemDetailView id={id} domain={domain.id} basePath={`/${domain.slug}`} backLabel={domain.name} />;
}
