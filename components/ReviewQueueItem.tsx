'use client';

import Link from 'next/link';
import { ReviewQueueItem as RQI } from '@/lib/types';
import DomainBadge from './DomainBadge';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export default function ReviewQueueItem({ item }: { item: RQI }) {
  const tag = item.pattern_tag ?? item.sd_category ?? item.fe_bucket ?? item.py_category;
  const detailPath = `/${item.domain.replace('_', '-')}/${item.id}`;
  const overdue = item.days_overdue <= 0 ? 'due today' : `${item.days_overdue}d overdue`;

  return (
    <Link
      href={detailPath}
      className="group flex items-center gap-4 px-4 py-3.5 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Overdue urgency bar */}
      <div className={`w-1 self-stretch rounded-full ${item.days_overdue > 3 ? 'bg-danger/70' : 'bg-accent/40'}`} />

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <DomainBadge domain={item.domain} />
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
