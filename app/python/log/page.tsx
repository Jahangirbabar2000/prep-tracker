import QuickLogForm from '@/components/QuickLogForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PythonLogPage() {
  return (
    <div className="max-w-lg">
      <Link href="/python" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> Python
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Python Concept</h1>
      <QuickLogForm defaultDomain="python" />
    </div>
  );
}
