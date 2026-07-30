import { Suspense } from 'react';
import GlobalSchemaLog from '@/components/GlobalSchemaLog';

export default function LogPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Attempt</h1>
      <Suspense fallback={null}><GlobalSchemaLog /></Suspense>
    </div>
  );
}
