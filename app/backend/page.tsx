import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'category', placeholder: 'All categories', field: 'py_category' },
];

export default function BackendPage() {
  return (
    <DomainListPage
      domain="python"
      title="Backend"
      basePath="/backend"
      logLabel="Log Question"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No concepts yet. Log your first attempt to get started."
    />
  );
}
