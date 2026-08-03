'use client';

import { useState } from 'react';
import { Attempt } from '@/lib/types';
import { fmtDate } from '@/lib/fmt';
import { Clock, Check, X, Pencil, Trash2 } from 'lucide-react';
import { deleteAttemptRemote, editAttemptRemote } from '@/lib/store/writeQueue';

interface Props {
  attempts: Attempt[];
  showTime?: boolean;
  onUpdated: (attempt: Attempt) => void;
  onDeleted: (id: number) => void;
}

const cellInput = 'bg-background border border-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function AttemptHistory({ attempts, showTime = true, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const [fields, setFields] = useState<Partial<Attempt>>({});

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

  function deleteAttempt(id: number) {
    onDeleted(id);
    deleteAttemptRemote(id).catch(() => {});
  }

  if (!attempts.length) {
    return <p className="text-sm text-muted">No attempts yet.</p>;
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
                        <button onClick={() => startEdit(a)} className="hover:text-fg cursor-pointer"><Pencil size={14} /></button>
                        <button onClick={() => deleteAttempt(a.id)} className="hover:text-danger cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
