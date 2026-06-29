import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'bucket', placeholder: 'All buckets', field: 'sd_category' },
  { key: 'topic',  placeholder: 'All topics',  field: 'sd_topic'    },
];

export default function SystemDesignPage() {
  return (
    <DomainListPage
      domain="system_design"
      title="System Design"
      basePath="/system-design"
      logLabel="Log Question"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No concepts yet. Log your first concept to get started."
    />
  );
}
