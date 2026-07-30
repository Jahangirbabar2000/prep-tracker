'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Problem } from '@/lib/types';
import { fieldsForDomain, optionsForField, resolveDomain } from '@/lib/domains';
import { useStore } from '@/lib/store/store';
import MarkdownRenderer from './MarkdownRenderer';
import { pasteAsMarkdown } from '@/lib/htmlToMarkdown';

interface Props {
  problem: Problem;
  onUpdated: (problem: Problem) => void;
}

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

export default function ProblemMetaForm({ problem, onUpdated }: Props) {
  const store = useStore();
  const domain = resolveDomain(store.data.domains, problem.domain);
  const fields = useMemo(
    () => fieldsForDomain(store.data.domain_fields, problem.domain),
    [store.data.domain_fields, problem.domain],
  );
  const [data, setData] = useState(problem);
  const [notesPreview, setNotesPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setData(problem), [problem]);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || notesPreview) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [data.notes_text, notesPreview]);

  async function saveCore(field: 'notes_text', value: string) {
    const response = await fetch(`/api/problems/${problem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (!response.ok) return;
    const updated: Problem = await response.json();
    setData(updated);
    onUpdated(updated);
  }

  async function saveMetadata(key: string, value: string) {
    const next = { ...data.metadata, [key]: value };
    if (!value) delete next[key];
    setData(current => ({ ...current, metadata: next }));
    const response = await fetch(`/api/problems/${problem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { [key]: value } }),
    });
    if (!response.ok) return;
    const updated: Problem = await response.json();
    setData(updated);
    onUpdated(updated);
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(field => {
            const options = optionsForField(store.data.domain_field_options, field.id);
            const value = data.metadata[field.key] ?? '';
            return (
              <label key={field.id} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">{field.label}</span>
                {field.kind === 'select' ? (
                  <select
                    value={value}
                    onChange={event => void saveMetadata(field.key, event.target.value)}
                    className={inputCls}
                  >
                    <option value="">— none —</option>
                    {value && !options.some(option => option.value === value) && <option value={value}>{value} (archived)</option>}
                    {options.map(option => <option key={option.id} value={option.value}>{option.value}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={event => setData(current => ({
                      ...current,
                      metadata: { ...current.metadata, [field.key]: event.target.value },
                    }))}
                    onBlur={event => void saveMetadata(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                )}
              </label>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">
            {domain.study_mode === 'timed_problem' ? 'Reference Notes' : 'Answer'}
          </label>
          <div className="flex gap-0.5 bg-surface-2 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setNotesPreview(false)}
              className={`text-xs px-2.5 py-0.5 rounded transition-colors cursor-pointer ${!notesPreview ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => { void saveCore('notes_text', data.notes_text ?? ''); setNotesPreview(true); }}
              className={`text-xs px-2.5 py-0.5 rounded transition-colors cursor-pointer ${notesPreview ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
            >
              Preview
            </button>
          </div>
        </div>
        {notesPreview ? (
          <div className="min-h-28 px-3 py-2.5 border border-border rounded-lg bg-background">
            {data.notes_text
              ? <MarkdownRenderer content={data.notes_text} />
              : <span className="text-sm text-muted italic">Nothing to preview.</span>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={data.notes_text ?? ''}
            onChange={event => setData(current => ({ ...current, notes_text: event.target.value }))}
            onBlur={event => void saveCore('notes_text', event.target.value)}
            onPaste={event => {
              const markdown = pasteAsMarkdown(event, data.notes_text ?? '');
              if (markdown !== null) setData(current => ({ ...current, notes_text: markdown }));
            }}
            placeholder={domain.answer_placeholder}
            className={`${inputCls} resize-none min-h-28 overflow-hidden`}
          />
        )}
      </div>
    </div>
  );
}
