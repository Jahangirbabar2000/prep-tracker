'use client';

import Link from 'next/link';
import { ReviewQueueItem as RQI } from '@/lib/types';
import DomainBadge from './DomainBadge';
import { AlertTriangle, ChevronRight } from 'lucide-react';

const DOMAIN_PATH: Record<string, string> = {
  system_design: '/system-design',
  python:        '/backend',
};

function domainPath(domain: string) {
  return DOMAIN_PATH[domain] ?? `/${domain}`;
}

export default function ReviewQueueItem({ item }: { item: RQI }) {
  const tag = item.pattern_tag ?? item.sd_category ?? item.fe_bucket ?? item.py_category ?? item.ai_category ?? item.beh_category ?? item.lld_category;
  const detailPath = `${domainPath(item.domain)}/${item.id}`;
  const overdue = item.days_overdue <= 0 ? 'due today' : `${item.days_overdue}d overdue`;

  return (
    <Link
      href={detailPath}
      className="group flex items-center gap-4 px-4 py-3.5 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Overdue urgency bar */}
      <div className={`w-1 self-stretch rounded-full ${item.days_overdue > 3 ? 'bg-danger/70' : 'bg-accent/40'}`} />

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <DomainBadge domain={item.domain} />
          {item.difficulty && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
              item.difficulty === 'Easy'   ? 'bg-green-500/10 text-green-500' :
              item.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
              item.difficulty === 'Hard'   ? 'bg-red-500/10 text-red-500' :
              'bg-surface-2 text-muted'
            }`}>{item.difficulty}</span>
          )}
          {item.last_struggled ? (
            <span className="inline-flex items-center gap-1 text-xs text-danger font-medium">
              <AlertTriangle size={12} /> struggled
            </span>
          ) : null}
        </div>
        <span className="font-medium text-fg truncate">{item.name}</span>
        {tag && <span className="text-xs text-muted">{tag}</span>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted tabular">{overdue}</span>
        <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
