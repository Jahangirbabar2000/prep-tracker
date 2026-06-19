'use client';

import Link from 'next/link';
import { Problem } from '@/lib/types';
import { fmtDate } from '@/lib/fmt';
import { ChevronRight, Clock } from 'lucide-react';
import ProficiencyBadge from './ProficiencyBadge';

interface Props {
  problem: Problem & { avg_time?: number | null };
  basePath: string;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy:   'text-emerald-500 dark:text-emerald-400',
  Medium: 'text-amber-500  dark:text-amber-400',
  Hard:   'text-red-500    dark:text-red-400',
};

const DOMAIN_TAG_STYLE: Record<string, string> = {
  dsa:           'bg-blue-500/10 text-blue-500 dark:text-blue-400',
  system_design: 'bg-orange-500/10 text-orange-500 dark:text-orange-400',
  frontend:      'bg-violet-500/10 text-violet-500 dark:text-violet-400',
  python:        'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
  ai:            'bg-rose-500/10 text-rose-500 dark:text-rose-400',
};

export default function ProblemListRow({ problem: p, basePath }: Props) {
  const tag = p.pattern_tag ?? p.sd_category ?? p.fe_bucket ?? p.py_category ?? p.ai_category;
  const qset = p.question_list ?? p.fe_question_set ?? p.sd_topic;
  const isDue = p.next_due_date && p.next_due_date <= new Date().toLocaleDateString('en-CA');

  return (
    <Link
      href={`${basePath}/${p.id}`}
      className="group flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        {/* Row 1: name + difficulty */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-fg truncate">{p.name}</span>
          {p.difficulty && (
            <span className={`text-xs font-medium tabular ${DIFFICULTY_STYLE[p.difficulty] ?? 'text-muted'}`}>
              {p.difficulty}
            </span>
          )}
        </div>
        {/* Row 2: tags + proficiency badge + due */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {tag && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DOMAIN_TAG_STYLE[p.domain] ?? 'bg-surface-2 text-muted'}`}>{tag}</span>}
          {qset && <span className="text-xs text-muted">{qset}</span>}
          {(tag || qset) && <span className="text-border-strong text-xs">·</span>}
          <ProficiencyBadge
            level={p.interval_level}
            nextDueDate={p.next_due_date ? fmtDate(p.next_due_date) : null}
            attemptCount={p.attempt_count}
          />
          {isDue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-danger/10 text-danger">
              due
            </span>
          )}
          {p.avg_time != null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted">
              <Clock size={11} /> {p.avg_time}m
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
    </Link>
  );
}
