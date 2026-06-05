'use client';

import { useState } from 'react';
import { Note } from '@/lib/types';
import { Plus } from 'lucide-react';

interface Props {
  problemId: number;
  onAdded: (note: Note) => void;
}

const inputCls = 'text-sm bg-background border border-border rounded-lg px-3 py-2 text-fg placeholder:text-muted/60 resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function AddNoteForm({ problemId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/problems/${problemId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim(), answer: answer.trim() }),
    });
    const note: Note = await res.json();
    onAdded(note);
    setQuestion('');
    setAnswer('');
    setOpen(false);
    setSaving(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer self-start"
      >
        <Plus size={15} /> Add Note
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-surface">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">Question</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="What is the key insight for this approach?"
          className={`${inputCls} h-20`}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">Answer</label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="The answer in your own words..."
          className={`${inputCls} h-24`}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !question.trim() || !answer.trim()}
          className="min-h-[40px] px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setQuestion(''); setAnswer(''); }}
          className="px-4 py-2 text-sm text-muted hover:text-fg transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
