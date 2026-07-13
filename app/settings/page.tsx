'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

function DefaultLinkCard({ domain }: { domain: string }) {
  const [value, setValue]     = useState('');
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saved, setSaved]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetch(`/api/config/options?domain=${domain}&field=default_link`)
      .then(r => r.json())
      .then((rows: ConfigRow[]) => {
        if (rows.length > 0) { setValue(rows[0].value); setSaved(rows[0].value); setSavedId(rows[0].id); }
      })
      .catch(() => {});
  }, [domain]);

  async function save() {
    setSaving(true);
    if (savedId) await fetch(`/api/config/options/${savedId}`, { method: 'DELETE' });
    if (value.trim()) {
      const res = await fetch('/api/config/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, field: 'default_link', value: value.trim() }),
      });
      const row: ConfigRow = await res.json();
      setSavedId(row.id); setSaved(value.trim());
    } else {
      setSavedId(null); setSaved('');
    }
    setSaving(false);
  }

  async function clear() {
    if (savedId) await fetch(`/api/config/options/${savedId}`, { method: 'DELETE' });
    setSavedId(null); setSaved(''); setValue('');
  }

  const dirty = value.trim() !== saved;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 sm:col-span-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-widest">Default Link</h3>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
          placeholder="https://…"
          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer shrink-0"
        >
          {saving ? '…' : 'Save'}
        </button>
        {saved && (
          <button
            type="button"
            onClick={clear}
            className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-danger border border-border rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Clear
          </button>
        )}
      </div>
      {saved && <p className="text-xs text-muted/60 truncate">{saved}</p>}
    </div>
  );
}

type ConfigRow = { id: number; domain: string; field: string; value: string; sort_order: number };

const SECTIONS = [
  {
    domain: 'dsa', label: 'DSA',
    fields: [
      { field: 'platform',      label: 'Platform' },
      { field: 'question_list', label: 'Question List' },
    ],
  },
  {
    domain: 'system_design', label: 'System Design',
    fields: [
      { field: 'sd_category', label: 'Bucket' },
      { field: 'sd_topic',    label: 'Topic' },
    ],
  },
  {
    domain: 'frontend', label: 'Frontend',
    fields: [
      { field: 'fe_bucket',       label: 'Bucket' },
      { field: 'fe_question_set', label: 'Question Set' },
    ],
  },
  {
    domain: 'python', label: 'Backend',
    fields: [
      { field: 'question_list', label: 'Question List' },
      { field: 'py_category',   label: 'Category' },
    ],
  },
  {
    domain: 'ai', label: 'AI',
    fields: [
      { field: 'question_list', label: 'Question List' },
      { field: 'ai_category',   label: 'Category' },
    ],
  },
  {
    domain: 'lld', label: 'LLD',
    fields: [
      { field: 'lld_category', label: 'Category' },
      { field: 'lld_topic',    label: 'Topic' },
    ],
  },
];

function FieldCard({
  domain,
  field,
  label,
  rows,
  onAdd,
  onDelete,
  onReorder,
}: {
  domain: string;
  field: string;
  label: string;
  rows: ConfigRow[];
  onAdd: (domain: string, field: string, value: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (domain: string, field: string, newRows: ConfigRow[]) => Promise<void>;
}) {
  const [inputVal, setInputVal] = useState('');
  const [adding, setAdding] = useState(false);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'above' | 'below'>('below');
  const dragIdRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const val = inputVal.trim();
    if (!val) return;
    setAdding(true);
    await onAdd(domain, field, val);
    setInputVal('');
    setAdding(false);
    inputRef.current?.focus();
  }

  function onDragStart(id: number) {
    dragIdRef.current = id;
  }

  function onDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDragOverId(id);
    setDragOverPos(e.clientY < mid ? 'above' : 'below');
  }

  function onDrop(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (fromId === null || fromId === targetId) {
      setDragOverId(null);
      return;
    }
    const next = [...rows];
    const fromIdx = next.findIndex(r => r.id === fromId);
    const toIdx   = next.findIndex(r => r.id === targetId);
    const [moved] = next.splice(fromIdx, 1);
    const insertAt = dragOverPos === 'above' ? toIdx : toIdx + (fromIdx < toIdx ? 0 : 1);
    next.splice(Math.min(insertAt, next.length), 0, moved);
    setDragOverId(null);
    dragIdRef.current = null;
    onReorder(domain, field, next);
  }

  function onDragEnd() {
    setDragOverId(null);
    dragIdRef.current = null;
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-widest">{label}</h3>

      {rows.length === 0 ? (
        <p className="text-xs text-muted italic">No options yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map(row => {
            const isOver = dragOverId === row.id;
            return (
              <li
                key={row.id}
                draggable
                onDragStart={() => onDragStart(row.id)}
                onDragOver={e => onDragOver(e, row.id)}
                onDrop={e => onDrop(e, row.id)}
                onDragEnd={onDragEnd}
                className={[
                  'flex items-center gap-2 px-2 py-1.5 bg-surface-2 border rounded-lg transition-all select-none',
                  dragIdRef.current === row.id ? 'opacity-40' : 'opacity-100',
                  isOver && dragOverPos === 'above' ? 'border-t-2 border-t-accent border-border' : '',
                  isOver && dragOverPos === 'below' ? 'border-b-2 border-b-accent border-border' : '',
                  !isOver ? 'border-border' : '',
                ].join(' ')}
              >
                {/* Drag handle */}
                <span className="cursor-grab active:cursor-grabbing text-muted/40 hover:text-muted transition-colors shrink-0">
                  <GripVertical size={14} />
                </span>
                <span className="text-sm text-fg flex-1">{row.value}</span>
                <button
                  type="button"
                  onClick={() => onDelete(row.id)}
                  aria-label={`Delete ${row.value}`}
                  className="text-muted/50 hover:text-danger transition-colors cursor-pointer text-xs leading-none shrink-0"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="New option…"
          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !inputVal.trim()}
          className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-fg rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors cursor-pointer shrink-0"
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [optMap, setOptMap] = useState<Record<string, ConfigRow[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config/options')
      .then(r => r.json())
      .then((rows: ConfigRow[]) => {
        const map: Record<string, ConfigRow[]> = {};
        for (const row of rows) {
          const key = `${row.domain}/${row.field}`;
          if (!map[key]) map[key] = [];
          map[key].push(row);
        }
        setOptMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleAdd(domain: string, field: string, value: string) {
    const res = await fetch('/api/config/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, field, value }),
    });
    if (res.ok) {
      const newRow: ConfigRow = await res.json();
      const key = `${domain}/${field}`;
      setOptMap(prev => ({ ...prev, [key]: [...(prev[key] ?? []), newRow] }));
    }
  }

  async function handleDelete(domain: string, field: string, id: number) {
    await fetch(`/api/config/options/${id}`, { method: 'DELETE' });
    const key = `${domain}/${field}`;
    setOptMap(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(r => r.id !== id) }));
  }

  async function handleReorder(domain: string, field: string, newRows: ConfigRow[]) {
    const key = `${domain}/${field}`;
    // Update local state immediately for snappy feel
    setOptMap(prev => ({ ...prev, [key]: newRows }));
    // Persist all new sort_orders in parallel
    await Promise.all(
      newRows.map((row, i) =>
        fetch(`/api/config/options/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: i }),
        })
      )
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-28 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage dropdown options across the app. Drag to reorder.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-12 text-center">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {SECTIONS.map(section => (
            <section key={section.domain}>
              <h2 className="text-base font-semibold text-fg mb-3">{section.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map(({ field, label }) => (
                  <FieldCard
                    key={`${section.domain}/${field}`}
                    domain={section.domain}
                    field={field}
                    label={label}
                    rows={optMap[`${section.domain}/${field}`] ?? []}
                    onAdd={handleAdd}
                    onDelete={(id) => handleDelete(section.domain, field, id)}
                    onReorder={handleReorder}
                  />
                ))}
                <DefaultLinkCard domain={section.domain} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
