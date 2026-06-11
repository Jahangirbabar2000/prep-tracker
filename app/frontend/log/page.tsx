import FrontendLogForm from '@/components/FrontendLogForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function FrontendLogPage() {
  return (
    <div className="max-w-lg">
      <Link href="/frontend" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> Frontend
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Frontend Question</h1>
      <FrontendLogForm />
    </div>
  );
}
