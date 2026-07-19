import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'category', placeholder: 'All categories', field: 'beh_category' },
];

export default function BehavioralPage() {
  return (
    <DomainListPage
      domain="behavioral"
      title="Behavioral"
      basePath="/behavioral"
      logLabel="Log Question"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No questions yet. Log your first to get started."
    />
  );
}
