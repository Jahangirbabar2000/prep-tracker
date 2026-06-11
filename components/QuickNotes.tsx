'use client';

import { useState, useRef } from 'react';
import { Note } from '@/lib/types';
import { Plus, Trash2, StickyNote } from 'lucide-react';

interface Props {
  problemId: number;
  notes: Note[];
  onChange: (notes: Note[]) => void;
}

export default function QuickNotes({ problemId, notes, onChange }: Props) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function add() {
    const text = input.trim();
    if (!text) return;
    setSaving(true);
    const res = await fetch(`/api/problems/${problemId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text }),
    });
    const note: Note = await res.json();
    onChange([...notes, note]);
    setInput('');
    setSaving(false);
    inputRef.current?.focus();
  }

  async function remove(id: number) {
    setDeletingId(id);
    await fetch(`/api/problems/${problemId}/notes/${id}`, { method: 'DELETE' });
    onChange(notes.filter(n => n.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Existing notes */}
      {notes.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {notes.map(n => (
            <li
              key={n.id}
              className="group flex items-start gap-2 px-3 py-2 bg-surface border border-border rounded-lg"
            >
              <StickyNote size={13} className="text-muted/50 mt-0.5 shrink-0" />
              <span className="text-sm text-fg flex-1 leading-snug">{n.question}</span>
              <button
                onClick={() => remove(n.id)}
                disabled={deletingId === n.id}
                className="shrink-0 text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all cursor-pointer disabled:opacity-40"
                title="Delete note"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Inline add input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a note… (Enter to save)"
          className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 text-fg placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
          disabled={saving}
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !input.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/10 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}
