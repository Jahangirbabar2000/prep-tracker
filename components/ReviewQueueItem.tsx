'use client';

import Link from 'next/link';
import { ReviewQueueItem as RQI } from '@/lib/types';
import DomainBadge from './DomainBadge';
import ProficiencyBadge from './ProficiencyBadge';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cardTagsFromFields, domainPath } from '@/lib/domains';
import { useStore } from '@/lib/store/store';

// Matches ProblemListRow's difficulty treatment — text-only, theme-aware,
// so it reads the same wherever a DSA difficulty shows up in the app.
const DIFFICULTY_STYLE: Record<string, string> = {
  Easy:   'text-emerald-500 dark:text-emerald-400',
  Medium: 'text-amber-500  dark:text-amber-400',
  Hard:   'text-red-500    dark:text-red-400',
};

export default function ReviewQueueItem({ item }: { item: RQI }) {
  const { data } = useStore();
  const [tag] = cardTagsFromFields(item, data.domain_fields);
  const detailPath = `${domainPath(data.domains, item.domain)}/${item.id}`;
  const overdue = item.days_overdue <= 0 ? 'due today' : `${item.days_overdue}d overdue`;
  const difficulty = item.metadata.difficulty;

  return (
    <Link
      href={detailPath}
      className="group flex items-center gap-4 px-4 py-3.5 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Overdue urgency bar */}
      <div className={`w-1 self-stretch rounded-full ${item.days_overdue > 3 ? 'bg-danger/70' : 'bg-accent/40'}`} />

      {/* Left: domain + category + difficulty (DSA only), then title.
          Difficulty sits here — same row as the category tag — rather than
          stacked on the right, matching where ProblemListRow puts it. */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <DomainBadge domain={item.domain} />
          {tag && <span className="text-xs text-muted truncate">{tag}</span>}
          {difficulty && (
            <span className={`text-xs font-medium tabular ${DIFFICULTY_STYLE[difficulty] ?? 'text-muted'}`}>
              {difficulty}
            </span>
          )}
        </div>
        {/* Wrap to two lines instead of truncating — otherwise many questions
            collapse to the same prefix ("How do you…") on narrow screens. */}
        <span className="font-medium text-fg leading-snug line-clamp-2">{item.name}</span>
      </div>

      {/* Right: proficiency + struggled + overdue — stacked so it stays
          narrow on mobile and leaves the title room to breathe. */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex flex-col items-end gap-1 text-right">
          <ProficiencyBadge
            level={item.interval_level}
            nextDueDate={item.next_due_date ?? null}
            attemptCount={item.attempt_count ?? 0}
          />
          <div className="flex flex-col items-end gap-0.5">
            {item.last_struggled ? (
              <span className="inline-flex items-center gap-1 text-xs text-danger font-medium">
                <AlertTriangle size={12} /> struggled
              </span>
            ) : null}
            <span className="text-xs text-muted tabular">{overdue}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
      </div>
    </Link>
  );
}
