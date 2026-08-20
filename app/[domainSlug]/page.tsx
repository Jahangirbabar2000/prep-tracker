'use client';

import { useParams } from 'next/navigation';
import DomainListPage from '@/components/DomainListPage';
import { useStore } from '@/lib/store/store';
import { domainBySlug, domainBySlugWithFallback, fieldsForDomain, optionsForField } from '@/lib/domains';

export default function RuntimeDomainPage() {
  const { domainSlug } = useParams<{ domainSlug: string }>();
  const { data, ready } = useStore();
  const domain = domainBySlugWithFallback(data.domains, data.problems, domainSlug);
  if (!ready) return null;
  if (!domain) return <p className="text-sm text-muted py-12 text-center">Domain not found.</p>;
  const filters = fieldsForDomain(data.domain_fields, domain.id)
    .filter(field => field.filterable)
    .map(field => ({
      key: field.key,
      placeholder: field.placeholder || `All ${field.label.toLowerCase()}s`,
      field: field.key,
      order: optionsForField(data.domain_field_options, field.id).map(option => option.value),
    }));
  return (
    <DomainListPage
      domain={domain.id}
      title={domain.name}
      basePath={`/${domain.slug}`}
      logLabel={domain.log_label}
      filterConfigs={filters}
      emptyMessage={domain.empty_message}
      canLog={!!domainBySlug(data.domains, domainSlug) && !domain.archived_at}
    />
  );
}
