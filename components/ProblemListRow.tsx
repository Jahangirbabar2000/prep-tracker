'use client';

import Link from 'next/link';
import { Problem } from '@/lib/types';
import { fmtDate } from '@/lib/fmt';
import { ChevronRight, Clock } from 'lucide-react';
import ProficiencyBadge from './ProficiencyBadge';
import { cardTagsFromFields, resolveDomain } from '@/lib/domains';
import { useStore } from '@/lib/store/store';
import { domainPalette } from './domainVisuals';

interface Props {
  problem: Problem & { avg_time?: number | null };
  basePath: string;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy:   'text-emerald-500 dark:text-emerald-400',
  Medium: 'text-amber-500  dark:text-amber-400',
  Hard:   'text-red-500    dark:text-red-400',
};

function tagStyle(shades: string[], tag: string): string {
  if (!shades.length) return 'bg-surface-2 text-muted';
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return shades[h % shades.length];
}

export default function ProblemListRow({ problem: p, basePath }: Props) {
  const { data } = useStore();
  const [tag, qset] = cardTagsFromFields(p, data.domain_fields);
  const definition = resolveDomain(data.domains, p.domain);
  const shades = domainPalette(definition.color).tagShades;
  const difficulty = p.metadata.difficulty;
  const isDue = p.next_due_date && p.next_due_date <= new Date().toLocaleDateString('en-CA');

  return (
    <Link
      href={`${basePath}/${p.id}`}
      className="group flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        {/* Row 1: name + difficulty */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-fg truncate">{p.name}</span>
          {difficulty && (
            <span className={`text-xs font-medium tabular ${DIFFICULTY_STYLE[difficulty] ?? 'text-muted'}`}>
              {difficulty}
            </span>
          )}
        </div>
        {/* Row 2: category tag left · proficiency + due right */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {tag && <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${tagStyle(shades, tag)}`}>{tag}</span>}
            {qset && <span className="hidden sm:inline text-xs text-muted truncate">{qset}</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
      </div>
      <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
    </Link>
  );
}
