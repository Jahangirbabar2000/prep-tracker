'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Shuffle } from 'lucide-react';
import ProblemListRow from '@/components/ProblemListRow';
import { useStore } from '@/lib/store/store';
import { clientToday } from '@/lib/store/queries';
import { domainBySlugWithFallback, fieldsForDomain, optionsForField, orderFieldValues } from '@/lib/domains';
import { QUEUE_PROFICIENCY_OPTIONS } from '@/lib/filters';
import {
  buildPracticeSet, practiceHref, parsePracticeSpec,
  PRACTICE_SCOPES, PRACTICE_ORDERS, PRACTICE_LIMITS,
  type PracticeSpec,
} from '@/lib/practice';

const PREVIEW_ROWS = 10;

const selectCls =
  'bg-surface border border-border rounded-lg px-2.5 py-2 text-sm text-fg cursor-pointer ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

/** A seed that changes only when the user asks for a new shuffle. */
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

interface Preset {
  id: string;
  label: string;
  hint: string;
  spec: (base: PracticeSpec) => PracticeSpec;
}

// Presets are nothing but param combinations, so a preset card and the custom
// builder below produce the same URL for the same choices.
const PRESETS: readonly Preset[] = [
  { id: 'due',    label: 'Due now',    hint: 'What the schedule says is ready',
    spec: b => ({ ...b, scope: 'due',  order: 'overdue' }) },
  { id: 'weak',   label: 'Weak spots', hint: 'Struggling, or missed last time',
    spec: b => ({ ...b, scope: 'weak', order: 'oldest' }) },
  { id: 'shuffle', label: 'Shuffle 20', hint: 'A random 20 from the whole domain',
    spec: b => ({ ...b, scope: 'all',  order: 'shuffle', limit: 20 }) },
  { id: 'oldest', label: 'First added', hint: 'Walk the domain from the start',
    spec: b => ({ ...b, scope: 'all',  order: 'oldest' }) },
  { id: 'resume', label: 'Resume', hint: 'Continue from your first unattempted question',
    spec: b => ({ ...b, scope: 'unattempted', order: 'oldest' }) },
  { id: 'newest', label: 'Last added',  hint: 'Your most recent questions first',
    spec: b => ({ ...b, scope: 'all',  order: 'newest' }) },
];

function PracticeLauncherInner({ domainId, domainName, slug }: {
  domainId: string; domainName: string; slug: string;
}) {
  const sp = useSearchParams();
  const { data } = useStore();
  const today = clientToday();

  // Held in state, never generated during render: a Math.random() in the render
  // body would hand every re-render a different href, and React 19 StrictMode
  // double-invokes renders. "Reshuffle" is the only thing that re-rolls it.
  const [seed, setSeed] = useState(randomSeed);

  const initial = useMemo(() => parsePracticeSpec(new URLSearchParams(sp.toString())), [sp]);
  const [draft, setDraft] = useState<PracticeSpec>(() => ({ ...initial, domain: domainId }));

  const spec: PracticeSpec = { ...draft, domain: domainId, seed };

  // Each field's options reflect the REST of the spec — scope, proficiency and
  // the other field — so choosing a bucket narrows Topic to that bucket's
  // topics, and the builder can't offer a combination that matches nothing.
  // Same rule as the domain page (components/DomainPageClient.tsx).
  //
  // Note a spec holds ONE field/value pair, so picking a topic replaces the
  // bucket rather than adding to it. That stays correct because a topic sits
  // inside exactly one bucket, so the topic filter alone selects the same cards.
  const fields = useMemo(
    () => fieldsForDomain(data.domain_fields, domainId)
      .filter(f => f.filterable)
      .map(f => {
        // Everything the current spec admits, minus this field's own filter —
        // a field never narrows itself, or the chosen value would be the only
        // one left. Order and limit are irrelevant to which values exist.
        const otherField = draft.field === f.key ? '' : draft.field;
        const pool = buildPracticeSet(data, {
          domain: domainId,
          scope: draft.scope,
          order: 'oldest',
          limit: null,
          proficiency: draft.proficiency,
          field: otherField,
          value: otherField ? draft.value : '',
          seed: 0,
        }, today);

        const present = new Set<string>();
        for (const p of pool) {
          const v = p.metadata?.[f.key];
          if (v != null && String(v) !== '') present.add(String(v));
        }
        // Keep the current selection listed even once the rest of the spec has
        // narrowed past it, so the <select> can still render what it's set to.
        if (draft.field === f.key && draft.value) present.add(draft.value);

        return {
          field: f,
          values: orderFieldValues(
            [...present],
            optionsForField(data.domain_field_options, f.id).map(o => o.value),
          ),
        };
      })
      .filter(({ values }) => values.length > 0),
    [data, domainId, today, draft.scope, draft.proficiency, draft.field, draft.value],
  );

  const preview = buildPracticeSet(data, spec, today);

  function update(patch: Partial<PracticeSpec>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    const qs = practiceHref({ ...next, domain: domainId, seed }).split('?')[1] ?? '';
    window.history.replaceState(null, '', qs ? `/${slug}/review?${qs}` : `/${slug}/review`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> {domainName}
        </Link>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">{domainName} · Practice</h1>
        <p className="text-sm text-muted mt-1">
          Revise on demand — off-schedule. Every answer still counts as a real attempt.
        </p>
      </div>

      {/* ── Presets ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map(preset => {
          const presetSpec = preset.spec({ ...spec, proficiency: '', field: '', value: '', limit: null });
          const count = buildPracticeSet(data, presetSpec, today).length;
          const shared = 'flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors';

          // A <Link> cannot be disabled, so an empty preset renders as inert
          // markup rather than a dead link that navigates to an empty session.
          if (count === 0) {
            return (
              <div
                key={preset.id}
                aria-disabled="true"
                data-testid={`practice-preset-${preset.id}`}
                className={`${shared} border-border bg-surface opacity-40`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold text-fg">
                  {preset.label}
                  <span data-testid={`practice-count-${preset.id}`} className="text-xs font-medium text-muted tabular">0</span>
                </span>
                <span className="text-xs text-muted">Nothing to practise here yet</span>
              </div>
            );
          }

          return (
            <Link
              key={preset.id}
              href={practiceHref(presetSpec)}
              data-testid={`practice-preset-${preset.id}`}
              aria-label={`${preset.label}, ${count} card${count === 1 ? '' : 's'}`}
              className={`${shared} border-border bg-surface hover:border-border-strong hover:-translate-y-0.5 hover:shadow-lg cursor-pointer`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-fg">
                {preset.label}
                <span
                  data-testid={`practice-count-${preset.id}`}
                  className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent tabular"
                >
                  {count}
                </span>
              </span>
              <span className="text-xs text-muted">{preset.hint}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setSeed(randomSeed())}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-fg cursor-pointer"
        >
          <Shuffle size={14} /> Reshuffle
        </button>
      </div>

      {/* ── Custom builder ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Build your own</h2>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Scope"
            value={draft.scope}
            onChange={e => update({ scope: e.target.value as PracticeSpec['scope'] })}
            className={selectCls}
          >
            {PRACTICE_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select
            aria-label="Order"
            value={draft.order}
            onChange={e => update({ order: e.target.value as PracticeSpec['order'] })}
            className={selectCls}
          >
            {PRACTICE_ORDERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            aria-label="Limit"
            value={draft.limit === null ? '' : String(draft.limit)}
            onChange={e => update({ limit: e.target.value === '' ? null : Number(e.target.value) })}
            className={selectCls}
          >
            {PRACTICE_LIMITS.map(l => (
              <option key={l.label} value={l.value === null ? '' : String(l.value)}>{l.label}</option>
            ))}
          </select>

          <select
            aria-label="Proficiency"
            value={draft.proficiency}
            onChange={e => update({ proficiency: e.target.value })}
            className={selectCls}
          >
            <option value="">All levels</option>
            {QUEUE_PROFICIENCY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {fields.map(({ field, values }) => (
            <select
              key={field.key}
              aria-label={field.label}
              value={draft.field === field.key ? draft.value : ''}
              onChange={e => update(
                e.target.value ? { field: field.key, value: e.target.value } : { field: '', value: '' },
              )}
              className={selectCls}
            >
              <option value="">{field.placeholder || `All ${field.label.toLowerCase()}s`}</option>
              {values.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}
        </div>

        {preview.length > 0 ? (
          <Link
            href={practiceHref(spec)}
            data-testid="practice-start"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover cursor-pointer"
          >
            <Play size={14} /> Start practice
            <span className="font-normal opacity-70">({preview.length})</span>
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted opacity-50">
            No cards match
          </span>
        )}
      </div>

      {/* ── Preview ────────────────────────────────────────────────────────── */}
      {preview.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-muted">
            First {Math.min(PREVIEW_ROWS, preview.length)} of {preview.length}
          </p>
          {/* ProblemListRow, not ReviewQueueItem: the latter renders any
              days_overdue <= 0 as the literal "due today", which would be a
              lie for the not-yet-due and never-scheduled cards a practice set
              can contain. */}
          {preview.slice(0, PREVIEW_ROWS).map(item => (
            <ProblemListRow key={item.id} problem={item} basePath={`/${slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DomainPracticePage() {
  const { domainSlug } = useParams<{ domainSlug: string }>();
  const { data, ready } = useStore();
  const domain = domainBySlugWithFallback(data.domains, data.problems, domainSlug);

  if (!ready) return null;
  if (!domain) return <p className="text-sm text-muted py-12 text-center">Domain not found.</p>;

  return (
    <Suspense fallback={null}>
      <PracticeLauncherInner domainId={domain.id} domainName={domain.name} slug={domain.slug} />
    </Suspense>
  );
}
