import AILogForm from '@/components/AILogForm';
import EscapeBack from '@/components/EscapeBack';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AILogPage() {
  return (
    <div className="max-w-2xl">
      <EscapeBack href="/ai" />
      <Link href="/ai" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> AI <span className="opacity-40 font-normal text-[10px] ml-0.5">Esc</span>
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log AI Question</h1>
      <AILogForm />
    </div>
  );
}
