'use client';

import { useState } from 'react';
import { Link as LinkType } from '@/lib/types';
import { ExternalLink, Plus, Trash2, Link2 } from 'lucide-react';

interface Props {
  problemId: number;
  links: LinkType[];
  onChange: (links: LinkType[]) => void;
}

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export default function LinksManager({ problemId, links, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/problems/${problemId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), label: label.trim() || null }),
    });
    const link: LinkType = await res.json();
    onChange([...links, link]);
    setUrl('');
    setLabel('');
    setOpen(false);
    setSaving(false);
  }

  async function remove(id: number) {
    await fetch(`/api/links/${id}`, { method: 'DELETE' });
    onChange(links.filter(l => l.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {links.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {links.map(l => (
            <li key={l.id} className="group flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg">
              <Link2 size={14} className="text-muted shrink-0" />
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover truncate cursor-pointer"
              >
                <span className="truncate">{l.label || hostOf(l.url)}</span>
                <ExternalLink size={12} className="shrink-0 opacity-70" />
              </a>
              {l.label && <span className="text-xs text-muted truncate hidden sm:inline">{hostOf(l.url)}</span>}
              <button
                onClick={() => remove(l.id)}
                className="ml-auto text-muted hover:text-danger transition-colors cursor-pointer shrink-0"
                aria-label="Delete link"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={add} className="flex flex-col gap-2 border border-border rounded-lg p-3 bg-surface">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
            autoFocus
          />
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional, e.g. Solution video)"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !url.trim()}
              className="px-3 py-1.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setUrl(''); setLabel(''); }}
              className="px-3 py-1.5 text-sm text-muted hover:text-fg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer self-start"
        >
          <Plus size={15} /> Add Link
        </button>
      )}
    </div>
  );
}
