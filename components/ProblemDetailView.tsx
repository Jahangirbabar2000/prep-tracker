'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { fmtDate } from '@/lib/fmt';
import ProficiencyBadge from './ProficiencyBadge';
import { Attempt, Domain, Link as LinkType, Note, Problem } from '@/lib/types';
import ProblemMetaForm from './ProblemMetaForm';
import AttemptHistory from './AttemptHistory';
import NoteCard from './NoteCard';
import AddNoteForm from './AddNoteForm';
import SchemaLogForm from './SchemaLogForm';
import QuickNotes from './QuickNotes';
import LinksManager from './LinksManager';
import DeleteButton from './DeleteButton';
import { useStore } from '@/lib/store/store';
import { domainById, isTimedMode, resolveDomain } from '@/lib/domains';

interface ProblemDetail extends Problem {
  attempts: Attempt[];
  notes: Note[];
  links: LinkType[];
  avg_time: number | null;
  prev_id: number | null;  // older (lower id)
  next_id: number | null;  // newer (higher id)
  position: number;        // 1 = newest
  total: number;
}

interface Props {
  id: string;
  domain: Domain;
  basePath: string;
  backLabel: string;
}

const sectionTitle = 'text-xs font-semibold text-muted uppercase tracking-wide';

export default function ProblemDetailView({ id, domain, basePath, backLabel }: Props) {
  const router = useRouter();
  const store = useStore();
  const domainDefinition = resolveDomain(store.data.domains, domain);
  const canLog = !!domainById(store.data.domains, domain) && !domainDefinition.archived_at;
  const isTimed = isTimedMode(domainDefinition.study_mode);
  const [data, setData] = useState<ProblemDetail | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');

  function reload() {
    fetch(`/api/problems/${id}`).then(r => r.json()).then(setData);
  }

  useEffect(() => { reload(); }, [id]);

  // Keyboard navigation — only when not editing name or typing in a field
  useEffect(() => {
    if (!data) return;
    const { prev_id, next_id } = data;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') router.push(`${basePath}/${id}`);
      if (canLog && (e.key === 'l' || e.key === 'L')) router.push(`${basePath}/log`);
      if (e.key === 'ArrowLeft'  && next_id) router.push(`${basePath}/${next_id}/edit`);
      if (e.key === 'ArrowRight' && prev_id) router.push(`${basePath}/${prev_id}/edit`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, basePath, router, canLog]);

  if (!data) return <div className="text-sm text-muted">Loading…</div>;

  async function saveName() {
    const trimmed = nameVal.trim();
    setEditingName(false);
    if (!trimmed || trimmed === data?.name) return;
    await fetch(`/api/problems/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    setData(d => d ? { ...d, name: trimmed } : d);
  }

  async function deleteProblem() {
    setDeleting(true);
    await fetch(`/api/problems/${id}`, { method: 'DELETE' });
    window.location.href = basePath;
  }

  return (
    <div className="max-w-2xl flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push(`${basePath}/${id}`)}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} /> {backLabel} <span className="opacity-40 font-normal text-[10px] ml-0.5">Esc</span>
            </button>
            <div className="flex items-center gap-0.5">
              <Link
                href={data.next_id ? `${basePath}/${data.next_id}/edit` : '#'}
                aria-disabled={!data.next_id}
                className={`p-1 rounded transition-colors ${data.next_id ? 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer' : 'text-muted/25 pointer-events-none'}`}
                title="Newer (←)"
              >
                <ChevronLeft size={15} />
              </Link>
              <span className="text-xs text-muted/50 tabular-nums px-1 min-w-[3rem] text-center">
                {data.position} / {data.total}
              </span>
              <Link
                href={data.prev_id ? `${basePath}/${data.prev_id}/edit` : '#'}
                aria-disabled={!data.prev_id}
                className={`p-1 rounded transition-colors ${data.prev_id ? 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer' : 'text-muted/25 pointer-events-none'}`}
                title="Older (→)"
              >
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
          {editingName ? (
            <input
              type="text"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              className="text-2xl font-semibold text-fg tracking-tight bg-transparent border-b-2 border-accent focus:outline-none w-full"
              autoFocus
            />
          ) : (
            <h1
              className="text-2xl font-semibold text-fg tracking-tight cursor-text hover:underline decoration-dashed underline-offset-4 decoration-muted/40"
              onClick={() => { setNameVal(data.name); setEditingName(true); }}
              title="Click to edit"
            >
              {data.name}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <ProficiencyBadge
              level={data.interval_level}
              nextDueDate={data.next_due_date ? fmtDate(data.next_due_date) : null}
              attemptCount={data.attempts.length}
            />
            {data.next_due_date && (
              <span className="text-xs text-muted tabular">· due {fmtDate(data.next_due_date)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DeleteButton onConfirm={deleteProblem} disabled={deleting} />
        </div>
      </div>

      {/* Metadata */}
      <section>
        <h2 className={`${sectionTitle} mb-3`}>Metadata</h2>
        <ProblemMetaForm problem={data} onUpdated={p => setData(d => d ? { ...d, ...p } : d)} />
      </section>

      {/* Links */}
      <section>
        <h2 className={`${sectionTitle} mb-3`}>Links</h2>
        <LinksManager
          problemId={data.id}
          links={data.links}
          onChange={links => setData(d => d ? { ...d, links } : d)}
        />
      </section>

      {/* Attempt History */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className={sectionTitle}>Attempt History</h2>
          {canLog && <button
            onClick={() => setShowLog(l => !l)}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            {showLog ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Log Attempt</>}
          </button>}
        </div>
        {canLog && showLog && (
          <div className="mb-4 p-4 border border-border rounded-xl bg-surface">
            <SchemaLogForm
              domain={domainDefinition}
              problemId={data.id}
              inline
              onLogged={() => { setShowLog(false); reload(); }}
            />
          </div>
        )}
        <AttemptHistory
          attempts={data.attempts}
          showTime={isTimed}
          onUpdated={a => setData(d => d ? { ...d, attempts: d.attempts.map(x => x.id === a.id ? a : x) } : d)}
          onDeleted={aid => setData(d => d ? { ...d, attempts: d.attempts.filter(x => x.id !== aid) } : d)}
        />
      </section>

      {/* Quick one-liner notes — Python, Frontend & System Design */}
      {!isTimed && (
        <section>
          <h2 className={`${sectionTitle} mb-3`}>Notes</h2>
          <QuickNotes
            problemId={data.id}
            notes={data.notes}
            onChange={notes => setData(d => d ? { ...d, notes } : d)}
          />
        </section>
      )}

      {/* Full Q&A recall notes — DSA only */}
      {isTimed && (
        <section>
          <h2 className={`${sectionTitle} mb-3`}>Active Recall Notes</h2>
          <div className="flex flex-col gap-3">
            <AddNoteForm problemId={data.id} onAdded={n => setData(d => d ? { ...d, notes: [...d.notes, n] } : d)} />
            {data.notes.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onDelete={async nid => {
                  await fetch(`/api/problems/${data.id}/notes/${nid}`, { method: 'DELETE' });
                  setData(d => d ? { ...d, notes: d.notes.filter(x => x.id !== nid) } : d);
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
