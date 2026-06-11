'use client';

import { useEffect, useState, useRef } from 'react';

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
    domain: 'python', label: 'Python',
    fields: [
      { field: 'question_list', label: 'Question List' },
      { field: 'py_category',   label: 'Category' },
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
}: {
  domain: string;
  field: string;
  label: string;
  rows: ConfigRow[];
  onAdd: (domain: string, field: string, value: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [inputVal, setInputVal] = useState('');
  const [adding, setAdding] = useState(false);
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

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-widest">{label}</h3>

      {rows.length === 0 ? (
        <p className="text-xs text-muted italic">No options yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map(row => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-lg"
            >
              <span className="text-sm text-fg">{row.value}</span>
              <button
                type="button"
                onClick={() => onDelete(row.id)}
                aria-label={`Delete ${row.value}`}
                className="text-muted hover:text-danger transition-colors cursor-pointer text-xs leading-none"
              >
                ✕
              </button>
            </li>
          ))}
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
  // keyed by "domain/field" → ConfigRow[]
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
      setOptMap(prev => ({
        ...prev,
        [key]: [...(prev[key] ?? []), newRow],
      }));
    }
  }

  async function handleDelete(domain: string, field: string, id: number) {
    await fetch(`/api/config/options/${id}`, { method: 'DELETE' });
    const key = `${domain}/${field}`;
    setOptMap(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).filter(r => r.id !== id),
    }));
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-28 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage dropdown options across the app.</p>
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
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
