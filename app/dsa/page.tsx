import DomainListPage from '@/components/DomainListPage';
import { DomainFilterConfig } from '@/components/DomainPageClient';

const FILTER_CONFIGS: DomainFilterConfig[] = [
  { key: 'pattern',    placeholder: 'All patterns',     field: 'pattern_tag' },
  { key: 'difficulty', placeholder: 'All difficulties', field: 'difficulty'  },
];

export default function DSAPage() {
  return (
    <DomainListPage
      domain="dsa"
      title="DSA"
      basePath="/dsa"
      logLabel="Log Attempt"
      filterConfigs={FILTER_CONFIGS}
      emptyMessage="No problems yet. Log your first attempt to get started."
    />
  );
}
