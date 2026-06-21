import BackendLogForm from '@/components/BackendLogForm';
import EscapeBack from '@/components/EscapeBack';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PythonLogPage() {
  return (
    <div className="max-w-2xl">
      <EscapeBack href="/backend" />
      <Link href="/backend" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> Backend <span className="opacity-40 font-normal text-[10px] ml-0.5">Esc</span>
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Backend Question</h1>
      <BackendLogForm />
    </div>
  );
}
