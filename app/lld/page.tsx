import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'category', placeholder: 'All categories', field: 'lld_category' },
  { key: 'topic',    placeholder: 'All topics',      field: 'lld_topic'    },
];

export default function LLDPage() {
  return (
    <DomainListPage
      domain="lld"
      title="Low-Level Design"
      basePath="/lld"
      logLabel="Log Question"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No concepts yet. Log your first concept to get started."
    />
  );
}
