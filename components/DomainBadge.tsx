'use client';

import { Domain } from '@/lib/types';
import { Binary, Network, Layout, Code2, Brain, Blocks, LucideIcon } from 'lucide-react';

const config: Record<Domain, { label: string; classes: string; Icon: LucideIcon }> = {
  dsa: { label: 'DSA', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20', Icon: Binary },
  system_design: { label: 'System Design', classes: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20', Icon: Network },
  frontend: { label: 'Frontend', classes: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20', Icon: Layout },
  python: { label: 'Backend', classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20', Icon: Code2 },
  ai: { label: 'AI', classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20', Icon: Brain },
  lld: { label: 'LLD', classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20', Icon: Blocks },
};

export default function DomainBadge({ domain, showIcon = true }: { domain: Domain; showIcon?: boolean }) {
  const c = config[domain];
  if (!c) return null;
  const { label, classes, Icon } = c;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${classes}`}>
      {showIcon && <Icon size={12} />}
      {label}
    </span>
  );
}
