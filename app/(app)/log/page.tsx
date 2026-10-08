import { Suspense } from 'react';
import GlobalSchemaLog from '@/components/GlobalSchemaLog';
import DemoGate from '@/components/DemoGate';

function LogPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-fg tracking-tight mb-6">Log Attempt</h1>
      <Suspense fallback={null}><GlobalSchemaLog /></Suspense>
    </div>
  );
}

// Content editing writes straight to the server, so the demo shows an explanation instead.
export default function Page() {
  return <DemoGate what="Adding a card"><LogPage /></DemoGate>;
}
