'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Plus, X } from 'lucide-react';
import type { Attempt, Link as LinkType, Note, Problem, StudyDomain } from '@/lib/types';
import { fieldsForDomain, isTimedMode, optionsForField, usesPracticeType } from '@/lib/domains';
import { getData, useStore } from '@/lib/store/store';
import { syncCreatedProblem } from '@/lib/store/createProblem';
import { pasteAsMarkdown } from '@/lib/htmlToMarkdown';

interface Props {
  domain: StudyDomain;
  inline?: boolean;
  problemId?: number;
  onLogged?: () => void;
}

const inputCls = 'bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';

function today() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function SchemaLogForm({ domain, inline, problemId, onLogged }: Props) {
  const router = useRouter();
  const store = useStore();
  const fields = useMemo(
    () => fieldsForDomain(store.data.domain_fields, domain.id),
    [store.data.domain_fields, domain.id],
  );
  const [query, setQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState('');
  const [attemptedAt, setAttemptedAt] = useState(today);
  const [timeTaken, setTimeTaken] = useState('');
  const [struggled, setStruggled] = useState(!isTimedMode(domain.study_mode));
  const [practiceType, setPracticeType] = useState<'solo' | 'mock'>('solo');
  const [linkUrl, setLinkUrl] = useState(domain.default_link);
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!query.trim() || selectedProblem || problemId) return [];
    const q = query.toLowerCase();
    return store.data.problems
      .filter(problem => problem.domain === domain.id && problem.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, selectedProblem, problemId, store.data.problems, domain.id]);

  function addNote() {
    const value = noteInput.trim();
    if (!value) return;
    setNotes(current => [...current, value]);
    setNoteInput('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!problemId && !selectedProblem && !query.trim()) return;
    if (isTimedMode(domain.study_mode) && !timeTaken) return;
    setSubmitting(true);
    setError('');
    try {
      let problem = selectedProblem ?? getData().problems.find(item => item.id === problemId);
      let pid = problemId ?? selectedProblem?.id;
      if (!pid) {
        const response = await fetch('/api/problems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: query.trim(), domain: domain.id, metadata }),
        });
        if (!response.ok) throw new Error((await response.json()).error ?? 'Could not create item');
        problem = await response.json();
        pid = problem!.id;
      } else if (Object.keys(metadata).length || answer.trim()) {
        const response = await fetch(`/api/problems/${pid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(Object.keys(metadata).length ? { metadata } : {}),
            ...(answer.trim() ? { notes_text: answer.trim() } : {}),
          }),
        });
        if (!response.ok) throw new Error((await response.json()).error ?? 'Could not update item');
        problem = await response.json();
      }
      if (!pid || !problem) throw new Error('Could not resolve the item');
      if (answer.trim() && !problem.notes_text) {
        const response = await fetch(`/api/problems/${pid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes_text: answer.trim() }),
        });
        if (!response.ok) throw new Error('Could not save answer');
        problem = await response.json();
      }
      if (!problem) throw new Error('Could not resolve the item');
      const finalProblem: Problem = problem;

      const attemptResponse = await fetch(`/api/problems/${pid}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_taken_mins: isTimedMode(domain.study_mode) ? Number(timeTaken) : 0,
          struggled,
          attempted_at: attemptedAt,
          practice_type: usesPracticeType(domain.study_mode) ? practiceType : null,
        }),
      });
      if (!attemptResponse.ok) throw new Error('Could not log attempt');
      const attempt: Attempt = await attemptResponse.json();

      const createdLinks: LinkType[] = [];
      if (linkUrl.trim()) {
        const response = await fetch(`/api/problems/${pid}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: linkUrl.trim(), label: finalProblem.name }),
        });
        if (response.ok) createdLinks.push(await response.json());
      }
      const createdNotes: Note[] = [];
      for (const note of notes) {
        const response = await fetch(`/api/problems/${pid}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: note, answer: '' }),
        });
        if (response.ok) createdNotes.push(await response.json());
      }
      syncCreatedProblem({ problem: finalProblem, attempt, links: createdLinks, notes: createdNotes });
      if (onLogged) onLogged();
      else router.push(`/${domain.slug}/${pid}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 bg-surface border border-border rounded-2xl p-5 sm:p-6">
      {!problemId && (
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">{domain.item_label}</label>
          <input
            ref={inputRef}
            value={selectedProblem ? selectedProblem.name : query}
            onChange={event => { setQuery(event.target.value); setSelectedProblem(null); }}
            placeholder={`Type to search or add a ${domain.item_label.toLowerCase()}…`}
            className={`${inputCls} text-base`}
            autoComplete="off"
            autoFocus={!inline}
          />
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {suggestions.map(problem => (
                <li key={problem.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedProblem(problem); setQuery(''); }}
                    className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-surface-2 cursor-pointer"
                  >
                    {problem.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isTimedMode(domain.study_mode) && !problemId && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted uppercase tracking-wide">Answer</label>
          <textarea
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            onPaste={event => {
              const markdown = pasteAsMarkdown(event, answer);
              if (markdown !== null) setAnswer(markdown);
            }}
            placeholder={domain.answer_placeholder}
            className={`${inputCls} resize-y min-h-40`}
          />
        </div>
      )}

      <div className="flex gap-4 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">Date</span>
          <input type="date" value={attemptedAt} onChange={event => setAttemptedAt(event.target.value)} className={inputCls} />
        </label>
        {isTimedMode(domain.study_mode) && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">Time (min)</span>
            <input type="number" min={1} value={timeTaken} onChange={event => setTimeTaken(event.target.value)} className={`${inputCls} w-24`} />
          </label>
        )}
        {usesPracticeType(domain.study_mode) && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">Practice</span>
            <select value={practiceType} onChange={event => setPracticeType(event.target.value as 'solo' | 'mock')} className={inputCls}>
              <option value="solo">Solo</option>
              <option value="mock">Mock</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">Struggled?</span>
          <button
            type="button"
            onClick={() => setStruggled(value => !value)}
            className={`min-h-[42px] px-4 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${struggled ? 'bg-danger/10 border-danger/40 text-danger' : 'bg-accent/10 border-accent/40 text-accent'}`}
          >
            {struggled ? 'Yes' : 'No'}
          </button>
        </label>
      </div>

      {!problemId && fields.length > 0 && (
        <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(field => {
            const options = optionsForField(store.data.domain_field_options, field.id);
            return (
              <label key={field.id} className="flex flex-col gap-1">
                <span className="text-xs text-muted">{field.label}</span>
                {field.kind === 'select' ? (
                  <select
                    value={metadata[field.key] ?? ''}
                    onChange={event => setMetadata(current => ({ ...current, [field.key]: event.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— none —</option>
                    {options.map(option => <option key={option.id} value={option.value}>{option.value}</option>)}
                  </select>
                ) : (
                  <input
                    value={metadata[field.key] ?? ''}
                    onChange={event => setMetadata(current => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                )}
              </label>
            );
          })}
        </div>
      )}

      {!problemId && !isTimedMode(domain.study_mode) && (
        <div className="pt-4 border-t border-border flex flex-col gap-2">
          <label className="text-xs text-muted">Quick notes</label>
          {notes.map((note, index) => (
            <div key={`${note}-${index}`} className="flex items-center gap-2 text-sm bg-surface-2 rounded-lg px-3 py-2">
              <span className="flex-1">{note}</span>
              <button type="button" onClick={() => setNotes(current => current.filter((_, i) => i !== index))}><X size={13} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={noteInput}
              onChange={event => setNoteInput(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addNote(); } }}
              placeholder="Add a quick note…"
              className={`${inputCls} flex-1`}
            />
            <button type="button" onClick={addNote} className="px-3 rounded-lg border border-border text-muted hover:text-fg"><Plus size={15} /></button>
          </div>
        </div>
      )}

      {!problemId && (
        <label className="flex flex-col gap-1 pt-4 border-t border-border">
          <span className="text-xs text-muted inline-flex items-center gap-1"><Link2 size={12} /> Resource link</span>
          <input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" className={inputCls} />
        </label>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Saving…' : domain.log_label}
      </button>
    </form>
  );
}
