import QuickLogForm from '@/components/QuickLogForm';
import { Domain } from '@/lib/types';

const VALID_DOMAINS: Domain[] = ['dsa', 'system_design', 'frontend', 'python'];

export default async function LogPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const domain = VALID_DOMAINS.includes(sp.domain as Domain) ? (sp.domain as Domain) : undefined;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Attempt</h1>
      <QuickLogForm defaultDomain={domain} />
    </div>
  );
}
