import Link from 'next/link';
import { Check, Dumbbell, Sparkles } from 'lucide-react';
import type { StudyDomain } from '@/lib/types';
import { domainIcon, domainPalette } from './domainVisuals';
import { LOOP_STEPS } from '@/lib/loopSteps';

// The Review Queue with nothing to show. Two different situations:
//
// - No cards at all (a first visit, a fresh deployment). "You're all caught
//   up" would be false and leave nothing to do, so explain the loop and offer
//   a way into every domain.
// - Cards, but none due. That's the honest "caught up" — plus Practice, since
//   the day after adding a first card is exactly when a new person wonders
//   how to review anything.

function DomainLinks({ domains, href }: { domains: StudyDomain[]; href: (domain: StudyDomain) => string }) {
  const links = domains.map(domain => ({ domain, Icon: domainIcon(domain.icon), palette: domainPalette(domain.color) }));
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {links.map(({ domain, Icon, palette }) => (
        <Link
          key={domain.id}
          href={href(domain)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors hover:brightness-110 ${palette.badge}`}
        >
          <Icon size={14} /> {domain.name}
        </Link>
      ))}
    </div>
  );
}


export default function QueueEmptyState({ domains, domainsWithCards }: {
  /** Active domains, in sidebar order. */
  domains: StudyDomain[];
  /** The active domains that have at least one card. */
  domainsWithCards: StudyDomain[];
}) {
  if (domainsWithCards.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <Sparkles size={22} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-fg">Start your first deck</h2>
        <p className="mt-1 text-sm text-muted">
          This queue fills with cards on the day they’re due. Here’s the loop:
        </p>

        <ol className="mt-6 space-y-3 rounded-2xl border border-border bg-surface p-5 text-left">
          {LOOP_STEPS.map(([title, detail], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <p className="text-sm text-muted">
                <span className="font-medium text-fg">{title}.</span> {detail}
              </p>
            </li>
          ))}
        </ol>

        {domains.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-fg">Add a card to:</p>
            <DomainLinks domains={domains} href={domain => `/${domain.slug}/log`} />
          </div>
        )}

        <p className="mt-6 text-xs text-muted">
          Don’t want to wait for tomorrow? Every domain has <span className="font-medium text-fg">Practice</span>,
          which reviews any of its cards right away.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <Check size={22} className="text-accent" />
      </div>
      <p className="font-medium text-fg">Nothing due</p>
      <p className="mt-1 text-sm text-muted">You’re all caught up. Come back tomorrow.</p>
      <div className="mt-8">
        <p className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted">
          <Dumbbell size={14} /> Want to review anyway? Practice a domain off-schedule:
        </p>
        <DomainLinks domains={domainsWithCards} href={domain => `/${domain.slug}/review`} />
      </div>
    </div>
  );
}
