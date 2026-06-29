import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'category', placeholder: 'All categories', field: 'ai_category' },
];

export default function AIPage() {
  return (
    <DomainListPage
      domain="ai"
      title="AI"
      basePath="/ai"
      logLabel="Log Question"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No questions yet. Log your first to get started."
    />
  );
}
