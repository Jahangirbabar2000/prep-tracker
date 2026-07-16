'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy link"
      className="inline-flex items-center justify-center p-1.5 rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer shrink-0"
    >
      {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
    </button>
  );
}
