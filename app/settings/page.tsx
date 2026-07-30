'use client';

import { useMemo, useState } from 'react';
import {
  Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronDown, ChevronRight,
  LogOut, Plus, X,
} from 'lucide-react';
import type {
  DomainField,
  DomainFieldOption,
  DomainFieldTagRole,
  StudyDomain,
  StudyMode,
} from '@/lib/types';
import {
  DOMAIN_COLORS,
  DOMAIN_ICONS,
  STUDY_MODES,
  allDomains,
  fieldsForDomain,
  normalizeDomainSlug,
  optionsForField,
} from '@/lib/domains';
import { mutate, useStore } from '@/lib/store/store';
import { domainIcon, domainPalette } from '@/components/domainVisuals';

const inputCls = 'bg-background border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition';
const buttonCls = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border hover:border-border-strong transition-colors disabled:opacity-40';

async function jsonRequest<T>(url: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Request failed');
  return value as T;
}

function CreateDomain({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [shortName, setShortName] = useState('');
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [icon, setIcon] = useState('book');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const domain = await jsonRequest<StudyDomain>('/api/domains', 'POST', {
        name,
        slug: slug || normalizeDomainSlug(name),
        short_name: shortName || name.slice(0, 12),
        study_mode: studyMode,
        icon,
        color,
      });
      mutate(data => ({ ...data, domains: [...data.domains, domain] }));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create domain');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Name</span>
        <input
          value={name}
          onChange={event => { setName(event.target.value); if (!slug) setSlug(normalizeDomainSlug(event.target.value)); }}
          className={inputCls}
          placeholder="Databases"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">URL slug</span>
        <input value={slug} onChange={event => setSlug(normalizeDomainSlug(event.target.value))} className={inputCls} placeholder="databases" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Short name</span>
        <input value={shortName} onChange={event => setShortName(event.target.value)} className={inputCls} placeholder="DB" maxLength={12} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Study mode</span>
        <select value={studyMode} onChange={event => setStudyMode(event.target.value as StudyMode)} className={inputCls}>
          <option value="flashcard">Flashcard</option>
          <option value="timed_problem">Timed problem</option>
          <option value="flashcard_practice">Flashcard · Solo/Mock</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Icon</span>
        <select value={icon} onChange={event => setIcon(event.target.value)} className={inputCls}>
          {DOMAIN_ICONS.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Color</span>
        <select value={color} onChange={event => setColor(event.target.value)} className={inputCls}>
          {DOMAIN_COLORS.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={buttonCls}><X size={13} /> Cancel</button>
        <button disabled={saving || !name || !slug} className={`${buttonCls} bg-accent text-accent-fg border-accent`}>
          <Plus size={13} /> {saving ? 'Creating…' : 'Create domain'}
        </button>
      </div>
    </form>
  );
}

function FieldEditor({
  domain,
  field,
  onMove,
}: {
  domain: StudyDomain;
  field: DomainField;
  onMove: (direction: -1 | 1) => void;
}) {
  const { data } = useStore();
  const options = optionsForField(data.domain_field_options, field.id);
  const archivedOptions = data.domain_field_options
    .filter(option => option.field_id === field.id && !!option.archived_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const [optionValue, setOptionValue] = useState('');
  const [error, setError] = useState('');

  async function update(patch: Record<string, unknown>) {
    setError('');
    try {
      const updated = await jsonRequest<DomainField>(`/api/domain-fields/${field.id}`, 'PATCH', patch);
      mutate(current => ({
        ...current,
        domain_fields: current.domain_fields.map(item => item.id === updated.id ? updated : item),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update field');
    }
  }

  async function addOption() {
    if (!optionValue.trim()) return;
    try {
      const option = await jsonRequest<DomainFieldOption>(`/api/domain-fields/${field.id}/options`, 'POST', { value: optionValue });
      mutate(current => ({ ...current, domain_field_options: [...current.domain_field_options, option] }));
      setOptionValue('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add option');
    }
  }

  async function updateOption(option: DomainFieldOption, patch: Record<string, unknown>) {
    setError('');
    try {
      const updated = await jsonRequest<DomainFieldOption>(`/api/domain-field-options/${option.id}`, 'PATCH', patch);
      mutate(current => ({
        ...current,
        domain_field_options: current.domain_field_options.map(item => item.id === updated.id ? updated : item),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update option');
    }
  }

  async function moveOption(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    const first = options[index];
    const second = options[target];
    const [updatedFirst, updatedSecond] = await Promise.all([
      jsonRequest<DomainFieldOption>(`/api/domain-field-options/${first.id}`, 'PATCH', { sort_order: second.sort_order }),
      jsonRequest<DomainFieldOption>(`/api/domain-field-options/${second.id}`, 'PATCH', { sort_order: first.sort_order }),
    ]);
    mutate(current => ({
      ...current,
      domain_field_options: current.domain_field_options.map(option =>
        option.id === updatedFirst.id ? updatedFirst : option.id === updatedSecond.id ? updatedSecond : option,
      ),
    }));
  }

  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-3 ${field.archived_at ? 'border-border bg-surface-2 opacity-70' : 'border-border bg-background'}`}>
      <div className="flex items-center gap-2">
        <input
          defaultValue={field.label}
          onBlur={event => { if (event.target.value.trim() !== field.label) void update({ label: event.target.value }); }}
          className={`${inputCls} flex-1`}
          aria-label={`Field label for ${domain.name}`}
        />
        <span className="text-[11px] text-muted px-2 py-1 bg-surface-2 rounded">{field.kind}</span>
        <button type="button" onClick={() => onMove(-1)} className="p-2 text-muted hover:text-fg" aria-label={`Move ${field.label} up`}><ArrowUp size={13} /></button>
        <button type="button" onClick={() => onMove(1)} className="p-2 text-muted hover:text-fg" aria-label={`Move ${field.label} down`}><ArrowDown size={13} /></button>
        <button
          type="button"
          onClick={() => void update({ archived: !field.archived_at })}
          className="p-2 text-muted hover:text-fg"
          aria-label={`${field.archived_at ? 'Restore' : 'Archive'} ${field.label}`}
        >
          {field.archived_at ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </button>
      </div>
      {!field.archived_at && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={!!field.filterable} onChange={event => void update({ filterable: event.target.checked })} />
              Show as filter
            </label>
            <label className="sm:col-span-2 flex items-center gap-2">
              <span className="text-xs text-muted">Card tag</span>
              <select value={field.tag_role} onChange={event => void update({ tag_role: event.target.value as DomainFieldTagRole })} className={`${inputCls} flex-1`}>
                <option value="none">None</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </label>
          </div>
          <input
            defaultValue={field.placeholder}
            onBlur={event => { if (event.target.value !== field.placeholder) void update({ placeholder: event.target.value }); }}
            className={inputCls}
            placeholder="Filter/input placeholder"
          />
          {field.kind === 'select' && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">Options</span>
              <div className="flex flex-wrap gap-1.5">
                {options.map((option, index) => (
                  <span key={option.id} className="inline-flex items-center gap-1 px-2 py-1 bg-surface-2 rounded-md text-xs">
                    <input
                      defaultValue={option.value}
                      onBlur={event => {
                        if (event.target.value.trim() !== option.value) {
                          void updateOption(option, { value: event.target.value });
                        }
                      }}
                      className="w-24 bg-transparent text-fg focus:outline-none focus:ring-1 focus:ring-accent rounded px-0.5"
                      aria-label={`Option value ${option.value}`}
                    />
                    <button type="button" onClick={() => void moveOption(index, -1)} className="text-muted hover:text-fg" aria-label={`Move ${option.value} earlier`}><ArrowUp size={10} /></button>
                    <button type="button" onClick={() => void moveOption(index, 1)} className="text-muted hover:text-fg" aria-label={`Move ${option.value} later`}><ArrowDown size={10} /></button>
                    <button type="button" onClick={() => void updateOption(option, { archived: true })} className="text-muted hover:text-danger" aria-label={`Archive ${option.value}`}><X size={11} /></button>
                  </span>
                ))}
              </div>
              {archivedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {archivedOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => void updateOption(option, { archived: false })}
                      className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-border rounded-md text-xs text-muted hover:text-fg"
                      title="Restore option"
                    >
                      <ArchiveRestore size={10} /> {option.value}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={optionValue}
                  onChange={event => setOptionValue(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void addOption(); } }}
                  className={`${inputCls} flex-1`}
                  placeholder="New option…"
                />
                <button type="button" onClick={() => void addOption()} className={buttonCls}><Plus size={13} /> Add</button>
              </div>
            </div>
          )}
        </>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function DomainEditor({ domain, onMove }: { domain: StudyDomain; onMove: (direction: -1 | 1) => void }) {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKind, setNewFieldKind] = useState<'text' | 'select'>('select');
  const [error, setError] = useState('');
  const fields = fieldsForDomain(data.domain_fields, domain.id, true);
  const Icon = domainIcon(domain.icon);
  const palette = domainPalette(domain.color);

  async function update(patch: Record<string, unknown>) {
    setError('');
    try {
      const updated = await jsonRequest<StudyDomain>(`/api/domains/${domain.id}`, 'PATCH', patch);
      mutate(current => ({ ...current, domains: current.domains.map(item => item.id === updated.id ? updated : item) }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update domain');
    }
  }

  async function addField() {
    if (!newFieldLabel.trim()) return;
    try {
      const field = await jsonRequest<DomainField>(`/api/domains/${domain.id}/fields`, 'POST', {
        label: newFieldLabel,
        kind: newFieldKind,
      });
      mutate(current => ({ ...current, domain_fields: [...current.domain_fields, field] }));
      setNewFieldLabel('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add field');
    }
  }

  async function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const first = fields[index];
    const second = fields[target];
    const [updatedFirst, updatedSecond] = await Promise.all([
      jsonRequest<DomainField>(`/api/domain-fields/${first.id}`, 'PATCH', { sort_order: second.sort_order }),
      jsonRequest<DomainField>(`/api/domain-fields/${second.id}`, 'PATCH', { sort_order: first.sort_order }),
    ]);
    mutate(current => ({
      ...current,
      domain_fields: current.domain_fields.map(field =>
        field.id === updatedFirst.id ? updatedFirst : field.id === updatedSecond.id ? updatedSecond : field,
      ),
    }));
  }

  return (
    <section className={`border rounded-xl overflow-hidden ${domain.archived_at ? 'border-border bg-surface-2/50' : 'border-border bg-surface'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen(value => !value)} className="text-muted" aria-label={`Configure ${domain.name}`}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ring-1 ring-inset ${palette.badge}`}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg truncate">{domain.name}</p>
          <p className="text-xs text-muted">/{domain.slug} · {domain.study_mode.replaceAll('_', ' ')}</p>
        </div>
        {domain.archived_at && <span className="text-xs text-muted">Archived</span>}
        <button type="button" onClick={() => onMove(-1)} className="p-1.5 text-muted hover:text-fg" aria-label={`Move ${domain.name} up`}><ArrowUp size={14} /></button>
        <button type="button" onClick={() => onMove(1)} className="p-1.5 text-muted hover:text-fg" aria-label={`Move ${domain.name} down`}><ArrowDown size={14} /></button>
        <button type="button" onClick={() => void update({ archived: !domain.archived_at })} className="p-1.5 text-muted hover:text-fg" aria-label={`${domain.archived_at ? 'Restore' : 'Archive'} ${domain.name}`}>
          {domain.archived_at ? <ArchiveRestore size={15} /> : <Archive size={15} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border p-4 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Display name</span>
              <input defaultValue={domain.name} onBlur={event => { if (event.target.value.trim() !== domain.name) void update({ name: event.target.value }); }} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Short name</span>
              <input defaultValue={domain.short_name} onBlur={event => { if (event.target.value.trim() !== domain.short_name) void update({ short_name: event.target.value }); }} className={inputCls} maxLength={12} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Study mode</span>
              <select value={domain.study_mode} onChange={event => void update({ study_mode: event.target.value })} className={inputCls}>
                {STUDY_MODES.map(mode => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Icon / color</span>
              <div className="flex gap-2">
                <select value={domain.icon} onChange={event => void update({ icon: event.target.value })} className={`${inputCls} flex-1`}>
                  {DOMAIN_ICONS.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={domain.color} onChange={event => void update({ color: event.target.value })} className={`${inputCls} flex-1`}>
                  {DOMAIN_COLORS.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-muted">Default resource link</span>
              <input defaultValue={domain.default_link} onBlur={event => { if (event.target.value.trim() !== domain.default_link) void update({ default_link: event.target.value }); }} className={inputCls} placeholder="https://…" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Log button label</span>
              <input defaultValue={domain.log_label} onBlur={event => { if (event.target.value.trim() !== domain.log_label) void update({ log_label: event.target.value }); }} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Log page title</span>
              <input defaultValue={domain.log_title} onBlur={event => { if (event.target.value.trim() !== domain.log_title) void update({ log_title: event.target.value }); }} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Item label</span>
              <input defaultValue={domain.item_label} onBlur={event => { if (event.target.value.trim() !== domain.item_label) void update({ item_label: event.target.value }); }} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Empty-state message</span>
              <input defaultValue={domain.empty_message} onBlur={event => { if (event.target.value.trim() !== domain.empty_message) void update({ empty_message: event.target.value }); }} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-muted">Answer placeholder</span>
              <input defaultValue={domain.answer_placeholder} onBlur={event => { if (event.target.value !== domain.answer_placeholder) void update({ answer_placeholder: event.target.value }); }} className={inputCls} />
            </label>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Custom fields</h3>
            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <FieldEditor key={field.id} domain={domain} field={field} onMove={direction => void moveField(index, direction)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <input value={newFieldLabel} onChange={event => setNewFieldLabel(event.target.value)} className={`${inputCls} flex-1 min-w-40`} placeholder="New field label…" />
              <select value={newFieldKind} onChange={event => setNewFieldKind(event.target.value as 'text' | 'select')} className={inputCls}>
                <option value="select">Managed select</option>
                <option value="text">Free text</option>
              </select>
              <button type="button" onClick={() => void addField()} disabled={!newFieldLabel.trim()} className={buttonCls}><Plus size={13} /> Add field</button>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { data, ready } = useStore();
  const [creating, setCreating] = useState(false);
  const domains = useMemo(() => allDomains(data.domains), [data.domains]);

  async function moveDomain(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= domains.length) return;
    const first = domains[index];
    const second = domains[target];
    const [updatedFirst, updatedSecond] = await Promise.all([
      jsonRequest<StudyDomain>(`/api/domains/${first.id}`, 'PATCH', { sort_order: second.sort_order }),
      jsonRequest<StudyDomain>(`/api/domains/${second.id}`, 'PATCH', { sort_order: first.sort_order }),
    ]);
    mutate(current => ({
      ...current,
      domains: current.domains.map(domain =>
        domain.id === updatedFirst.id ? updatedFirst : domain.id === updatedSecond.id ? updatedSecond : domain,
      ),
    }));
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-10 md:pb-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Settings</h1>
          <p className="text-sm text-muted mt-1">Create domains, choose their study workflow, and configure their fields.</p>
        </div>
        <button
          onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.assign('/login'); }}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger border border-border rounded-lg px-3 py-1.5 transition-colors"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-fg">Study domains</h2>
        <button onClick={() => setCreating(true)} className={`${buttonCls} bg-accent text-accent-fg border-accent`}><Plus size={13} /> New domain</button>
      </div>
      {creating && <div className="mb-4"><CreateDomain onClose={() => setCreating(false)} /></div>}
      {!ready ? (
        <p className="text-sm text-muted py-12 text-center">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {domains.map((domain, index) => (
            <DomainEditor key={domain.id} domain={domain} onMove={direction => void moveDomain(index, direction)} />
          ))}
        </div>
      )}
    </div>
  );
}
