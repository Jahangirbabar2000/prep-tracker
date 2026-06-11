'use client';

import Link from 'next/link';
import { Problem } from '@/lib/types';
import { ChevronRight, Clock } from 'lucide-react';

interface Props {
  problem: Problem & { avg_time?: number | null };
  basePath: string;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy:   'text-emerald-500 dark:text-emerald-400',
  Medium: 'text-amber-500  dark:text-amber-400',
  Hard:   'text-red-500    dark:text-red-400',
};

export default function ProblemListRow({ problem: p, basePath }: Props) {
  const tag = p.pattern_tag ?? p.sd_category ?? p.fe_bucket ?? p.py_category;
  const qset = p.question_list ?? p.fe_question_set;
  const isDue = p.next_due_date && p.next_due_date <= new Date().toLocaleDateString('en-CA');

  return (
    <Link
      href={`${basePath}/${p.id}`}
      className="group flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-fg truncate">{p.name}</span>
          {p.difficulty && (
            <span className={`text-xs font-medium tabular ${DIFFICULTY_STYLE[p.difficulty] ?? 'text-muted'}`}>
              {p.difficulty}
            </span>
          )}
          {isDue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-danger/10 text-danger">
              due
            </span>
          )}
        </div>
        {(tag || qset) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {tag && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-muted">{tag}</span>}
            {qset && <span className="text-xs text-muted">{qset}</span>}
          </div>
        )}
      </div>

      <div className="shrink-0 text-xs text-muted text-right tabular hidden sm:block">
        {p.next_due_date ? (
          <div>next {p.next_due_date}</div>
        ) : (
          <div className="opacity-60">not attempted</div>
        )}
        {p.avg_time != null && (
          <div className="flex items-center gap-1 justify-end mt-0.5">
            <Clock size={11} /> {p.avg_time} min avg
          </div>
        )}
      </div>
      <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
    </Link>
  );
}
