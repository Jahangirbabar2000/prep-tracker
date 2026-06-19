import FrontendLogForm from '@/components/FrontendLogForm';
import EscapeBack from '@/components/EscapeBack';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function FrontendLogPage() {
  return (
    <div className="max-w-2xl">
      <EscapeBack href="/frontend" />
      <Link href="/frontend" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> Frontend <span className="opacity-40 font-normal text-[10px] ml-0.5">Esc</span>
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Frontend Question</h1>
      <FrontendLogForm />
    </div>
  );
}
