'use client';

import { useState } from 'react';
import { Note } from '@/lib/types';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

interface Props {
  note: Note;
  onDelete: (id: number) => void;
}

export default function NoteCard({ note, onDelete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <div className="px-4 py-3 flex items-start gap-2">
        <span className="mt-0.5 text-accent font-semibold text-xs shrink-0">Q</span>
        <p className="text-sm font-medium text-fg">{note.question}</p>
      </div>

      {revealed && (
        <div className="px-4 py-3 border-t border-border bg-surface-2 flex items-start gap-2">
          <span className="mt-0.5 text-muted font-semibold text-xs shrink-0">A</span>
          <p className="text-sm text-fg/90 whitespace-pre-wrap">{note.answer}</p>
        </div>
      )}

      <div className="px-4 py-2 border-t border-border flex items-center gap-3">
        <button
          onClick={() => setRevealed(r => !r)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
        >
          {revealed ? <><EyeOff size={13} /> Hide Answer</> : <><Eye size={13} /> Reveal Answer</>}
        </button>
        <div className="ml-auto">
          {confirming ? (
            <span className="text-xs flex items-center gap-2">
              <span className="text-muted">Delete?</span>
              <button onClick={() => onDelete(note.id)} className="text-danger font-medium hover:underline cursor-pointer">Yes</button>
              <button onClick={() => setConfirming(false)} className="text-muted hover:text-fg cursor-pointer">No</button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
