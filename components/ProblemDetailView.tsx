'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, X } from 'lucide-react';
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
}

interface Props {
  id: string;
  domain: Domain;
  basePath: string;
  backLabel: string;
}

const sectionTitle = 'text-xs font-semibold text-muted uppercase tracking-wide';

export default function ProblemDetailView({ id, domain, basePath, backLabel }: Props) {
  const [data, setData] = useState<ProblemDetail | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    fetch(`/api/problems/${id}`).then(r => r.json()).then(setData);
  }

  useEffect(() => { reload(); }, [id]);

  if (!data) return <div className="text-sm text-muted">Loading…</div>;

  async function deleteProblem() {
    setDeleting(true);
    await fetch(`/api/problems/${id}`, { method: 'DELETE' });
    window.location.href = basePath;
  }

  return (
    <div className="max-w-2xl flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={basePath} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg mb-2 transition-colors">
            <ArrowLeft size={13} /> {backLabel}
          </Link>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">{data.name}</h1>
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
          showPracticeType={domain === 'system_design'}
          onUpdated={a => setData(d => d ? { ...d, attempts: d.attempts.map(x => x.id === a.id ? a : x) } : d)}
          onDeleted={aid => setData(d => d ? { ...d, attempts: d.attempts.filter(x => x.id !== aid) } : d)}
        />
      </section>

      {/* Notes */}
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
    </div>
  );
}
