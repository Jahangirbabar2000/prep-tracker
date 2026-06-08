'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Attempt, Domain, Link as LinkType, Note, Problem } from '@/lib/types';
import ProblemMetaForm from './ProblemMetaForm';
import AttemptHistory from './AttemptHistory';
import NoteCard from './NoteCard';
import AddNoteForm from './AddNoteForm';
import QuickLogForm from './QuickLogForm';
import LinksManager from './LinksManager';
import DeleteButton from './DeleteButton';

interface ProblemDetail extends Problem {
  attempts: Attempt[];
  notes: Note[];
  links: LinkType[];
  avg_time: number | null;
  prev_id: number | null;
  next_id: number | null;
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
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft'  && data.prev_id) router.push(`${basePath}/${data.prev_id}`);
      if (e.key === 'ArrowRight' && data.next_id) router.push(`${basePath}/${data.next_id}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, basePath, router]);

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
            <Link href={basePath} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors">
              <ArrowLeft size={13} /> {backLabel}
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href={data.prev_id ? `${basePath}/${data.prev_id}` : '#'}
                aria-disabled={!data.prev_id}
                className={`p-1 rounded transition-colors ${data.prev_id ? 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer' : 'text-muted/25 pointer-events-none'}`}
                title="Previous (←)"
              >
                <ChevronLeft size={15} />
              </Link>
              <Link
                href={data.next_id ? `${basePath}/${data.next_id}` : '#'}
                aria-disabled={!data.next_id}
                className={`p-1 rounded transition-colors ${data.next_id ? 'text-muted hover:text-fg hover:bg-surface-2 cursor-pointer' : 'text-muted/25 pointer-events-none'}`}
                title="Next (→)"
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
          {data.next_due_date && (
            <p className="text-xs text-muted mt-1.5 tabular">
              Next due {data.next_due_date} · Interval level {data.interval_level}
            </p>
          )}
        </div>
        <DeleteButton onConfirm={deleteProblem} disabled={deleting} />
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
          <button
            onClick={() => setShowLog(l => !l)}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            {showLog ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Log Attempt</>}
          </button>
        </div>
        {showLog && (
          <div className="mb-4 p-4 border border-border rounded-xl bg-surface">
            <QuickLogForm
              defaultDomain={domain}
              problemId={data.id}
              inline
              onLogged={() => { setShowLog(false); reload(); }}
            />
          </div>
        )}
        <AttemptHistory
          attempts={data.attempts}
          showTime={domain === 'dsa' || domain === 'frontend'}
          showPracticeType={domain === 'system_design'}
          onUpdated={a => setData(d => d ? { ...d, attempts: d.attempts.map(x => x.id === a.id ? a : x) } : d)}
          onDeleted={aid => setData(d => d ? { ...d, attempts: d.attempts.filter(x => x.id !== aid) } : d)}
        />
      </section>

      {/* Notes — not shown for Python (the question+answer field IS the recall mechanism) */}
      {domain !== 'python' && (
        <section>
          <h2 className={`${sectionTitle} mb-3`}>Active Recall Notes</h2>
          <div className="flex flex-col gap-3">
            <AddNoteForm problemId={data.id} onAdded={n => setData(d => d ? { ...d, notes: [...d.notes, n] } : d)} />
            {data.notes.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onDelete={nid => setData(d => d ? { ...d, notes: d.notes.filter(x => x.id !== nid) } : d)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
