'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  disabled?: boolean;
}

export default function DeleteButton({ onConfirm, disabled }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-muted">Delete?</span>
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="text-danger font-medium hover:underline disabled:opacity-40 cursor-pointer"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-muted hover:text-fg cursor-pointer"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors shrink-0 cursor-pointer"
    >
      <Trash2 size={14} /> Delete
    </button>
  );
}
