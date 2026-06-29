import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'bucket', placeholder: 'All buckets', field: 'fe_bucket' },
];

export default function FrontendPage() {
  return (
    <DomainListPage
      domain="frontend"
      title="Frontend"
      basePath="/frontend"
      logLabel="Log Question"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No questions yet. Log your first attempt to get started."
    />
  );
}
