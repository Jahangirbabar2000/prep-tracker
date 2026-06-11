import SystemDesignLogForm from '@/components/SystemDesignLogForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SystemDesignLogPage() {
  return (
    <div className="max-w-lg">
      <Link href="/system-design" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-4 transition-colors">
        <ArrowLeft size={13} /> System Design
      </Link>
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log System Design Concept</h1>
      <SystemDesignLogForm />
    </div>
  );
}
