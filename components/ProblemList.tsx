import { Problem } from '@/lib/types';
import ProblemListRow from './ProblemListRow';

interface Props {
  problems: (Problem & { avg_time?: number | null })[];
  basePath: string;
  /** Group by logged date with dividers. Pass false for next_review sort where date order is meaningless. */
  groupByDate?: boolean;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso: string): string {
  const today = new Date().toLocaleDateString('en-CA');
  const dateStr = iso.slice(0, 10);
  if (dateStr === today) return 'Today';
  const [y, m, d] = dateStr.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  return y === thisYear ? `${MONTHS[m - 1]} ${d}` : `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function ProblemList({ problems, basePath, groupByDate = true }: Props) {
  if (!groupByDate) {
    return (
      <div className="flex flex-col gap-2">
        {problems.map(p => <ProblemListRow key={p.id} problem={p} basePath={basePath} />)}
      </div>
    );
  }

  // Group consecutive problems by their logged date
  type Group = { dateKey: string; label: string; items: typeof problems };
  const groups: Group[] = [];
  for (const p of problems) {
    const dateKey = (p.created_at ?? '').slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.dateKey === dateKey) {
      last.items.push(p);
    } else {
      groups.push({ dateKey, label: dateKey ? fmtDate(dateKey) : '', items: [p] });
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {groups.map((group, gi) => (
        <div key={group.dateKey || gi}>
          {/* Every group gets the same centered divider treatment */}
          <div className={`flex items-center gap-3 ${gi === 0 ? 'pb-2' : 'py-3'}`}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-medium text-muted/50 tracking-wide uppercase">
              {group.label}
              <span className="ml-1.5 opacity-60">· Count: {group.items.length}</span>
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-col gap-2">
            {group.items.map(p => <ProblemListRow key={p.id} problem={p} basePath={basePath} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
