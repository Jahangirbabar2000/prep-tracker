'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useIsDemo } from '@/lib/demo/useIsDemo';

/**
 * In the demo, screens that edit content (adding or editing cards, Settings)
 * show this instead: the demo covers the review loop, and those screens write
 * straight to the server. Outside the demo it renders its children unchanged.
 */
export default function DemoGate({ what, children }: { what: string; children: React.ReactNode }) {
  if (!useIsDemo()) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <Lock size={20} className="text-accent" />
      </div>
      <h1 className="text-lg font-semibold text-fg">{what} isn’t part of the demo</h1>
      <p className="mt-2 text-sm text-muted">
        The demo shows the review loop on sample cards: review, grade, practise, and see your History and Stats.
        Everything else works the same in a real deck.
      </p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover">
        Back to the Review Queue
      </Link>
    </div>
  );
}
