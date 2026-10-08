'use client';

import { useEffect, useRef, useState } from 'react';
import { Attempt } from '@/lib/types';
import { fmtDate } from '@/lib/fmt';
import { Clock, Check, X, Pencil, Trash2 } from 'lucide-react';
import { deleteAttemptRemote, editAttemptRemote, flushQueue, restoreAttempt } from '@/lib/store/writeQueue';

interface Props {
  attempts: Attempt[];
  showTime?: boolean;
  onUpdated: (attempt: Attempt) => void;
  onDeleted: (id: number) => void;
  /** After an Undo has sent the attempt back — for a parent holding its own copy rather than reading the store. */
  onRestored?: () => void;
}

/** How long a deleted attempt can be put back. */
const UNDO_MS = 6000;

const cellInput = 'bg-background border border-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function AttemptHistory({ attempts, showTime = true, onUpdated, onDeleted, onRestored }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const [fields, setFields] = useState<Partial<Attempt>>({});
  const [deleted, setDeleted] = useState<Attempt | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  function startEdit(a: Attempt) {
    setEditing(a.id);
    setFields({
      time_taken_mins: a.time_taken_mins,
      struggled: a.struggled,
      attempted_at: a.attempted_at.slice(0, 10),
    });
  }

  function saveEdit(id: number) {
    // Close the editor immediately; the store updates optimistically and the
    // network sync happens in the background.
    setEditing(null);
    editAttemptRemote(id, fields).then(onUpdated).catch(() => {});
  }

  // One tap deletes, so one tap must also bring it back: the delete goes
  // through at once (no lost deletes if the page closes), and Undo re-logs the
  // same attempt at its original moment.
  function deleteAttempt(attempt: Attempt) {
    onDeleted(attempt.id);
    // A failed delete is rolled back in the store already — nothing to undo.
    deleteAttemptRemote(attempt.id).catch(() => setDeleted(null));
    setDeleted(attempt);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setDeleted(null), UNDO_MS);
  }

  async function undoDelete() {
    if (!deleted) return;
    const attempt = deleted;
    setDeleted(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    await restoreAttempt(attempt);
    if (navigator.onLine) await flushQueue();
    onRestored?.();
  }

  const undoToast = deleted && (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-border bg-surface py-2 pl-4 pr-2 shadow-lg"
    >
      <span className="text-sm text-fg">Attempt from {fmtDate(deleted.attempted_at)} deleted</span>
      <button onClick={undoDelete} className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-2 cursor-pointer">
        Undo
      </button>
    </div>
  );

  if (!attempts.length) {
    return <><p className="text-sm text-muted">No attempts yet.</p>{undoToast}</>;
  }

  const avg = Math.round(attempts.reduce((s, a) => s + a.time_taken_mins, 0) / attempts.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex items-center gap-1.5 text-xs text-muted">
        {showTime && <><Clock size={13} />Avg solve time: <strong className="text-fg tabular">{avg} min</strong><span className="text-border-strong">·</span></>}
        <span className="tabular">{attempts.length} attempt{attempts.length > 1 ? 's' : ''}</span>
      </div>
      <div className="overflow-x-auto border border-border rounded-xl bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-surface-2/50">
              <th className="px-4 py-2.5 font-medium">Date</th>
              {showTime && <th className="px-4 py-2.5 font-medium">Time</th>}
              <th className="px-4 py-2.5 font-medium">Struggled</th>
              <th className="px-4 py-2.5 font-medium text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map(a => (
              <tr key={a.id} className="border-b border-border last:border-0">
                {editing === a.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={String(fields.attempted_at ?? '').slice(0, 10)}
                        onChange={e => setFields(f => ({ ...f, attempted_at: e.target.value }))}
                        className={`${cellInput} w-32`}
                      />
                    </td>
                    {showTime && (
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={fields.time_taken_mins ?? ''}
                          onChange={e => setFields(f => ({ ...f, time_taken_mins: +e.target.value }))}
                          className={`${cellInput} w-16`}
                          min={1}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setFields(f => ({ ...f, struggled: f.struggled ? 0 : 1 }))}
                        className={`text-xs px-2 py-1 rounded-md font-medium cursor-pointer ${
                          fields.struggled ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'
                        }`}
                      >
                        {fields.struggled ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => saveEdit(a.id)} className="text-xs font-medium text-accent hover:underline cursor-pointer">Save</button>
                        <button onClick={() => setEditing(null)} className="text-xs text-muted hover:text-fg cursor-pointer">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 text-fg/80 tabular">{fmtDate(a.attempted_at)}</td>
                    {showTime && <td className="px-4 py-2.5 text-fg/80 tabular">{a.time_taken_mins} min</td>}
                    <td className="px-4 py-2.5">
                      {a.struggled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-danger font-medium"><X size={13} /> Yes</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-accent font-medium"><Check size={13} /> No</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-3 justify-end text-muted">
                        <button onClick={() => startEdit(a)} aria-label="Edit attempt" title="Edit attempt" className="hover:text-fg cursor-pointer"><Pencil size={14} /></button>
                        <button onClick={() => deleteAttempt(a)} aria-label="Delete attempt" title="Delete attempt" className="hover:text-danger cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {undoToast}
    </div>
  );
}
