'use client';

import { useSyncExternalStore } from 'react';
import { Problem, Attempt, Note, Link, StudyDomain, DomainField, DomainFieldOption } from '@/lib/types';
import { idbGet, idbSet } from './idb';
import {
  LEGACY_DOMAIN_FALLBACKS,
  LEGACY_FIELD_FALLBACKS,
  legacyOptionsFromConfig,
  normalizeDomain,
  normalizeProblem,
} from '@/lib/domains';

export interface ConfigOption {
  id: number;
  domain: string;
  field: string;
  value: string;
  sort_order: number;
}

export interface StoreData {
  problems: Problem[];
  attempts: Attempt[];
  notes: Note[];
  links: Link[];
  config_options: ConfigOption[];
  domains: StudyDomain[];
  domain_fields: DomainField[];
  domain_field_options: DomainFieldOption[];
}

export interface StoreState {
  data: StoreData;
  ready: boolean;
}

const EMPTY_DATA: StoreData = {
  problems: [],
  attempts: [],
  notes: [],
  links: [],
  config_options: [],
  domains: LEGACY_DOMAIN_FALLBACKS,
  domain_fields: LEGACY_FIELD_FALLBACKS,
  domain_field_options: legacyOptionsFromConfig([]),
};
const SERVER_STATE: StoreState = { data: EMPTY_DATA, ready: false };
const IDB_KEY = 'store';

let state: StoreState = SERVER_STATE;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return state; }
function getServerSnapshot() { return SERVER_STATE; }

export function normalize(raw: Partial<StoreData> | null | undefined): StoreData {
  const configOptions = raw?.config_options ?? [];
  const hasRuntimeFields = !!raw?.domain_fields?.length;
  return {
    problems: (raw?.problems ?? []).map(normalizeProblem),
    attempts: raw?.attempts ?? [],
    notes: raw?.notes ?? [],
    links: raw?.links ?? [],
    config_options: configOptions,
    domains: (raw?.domains?.length ? raw.domains : LEGACY_DOMAIN_FALLBACKS).map(normalizeDomain),
    domain_fields: hasRuntimeFields ? raw!.domain_fields! : LEGACY_FIELD_FALLBACKS,
    domain_field_options: hasRuntimeFields
      ? raw?.domain_field_options ?? []
      : legacyOptionsFromConfig(configOptions),
  };
}

/** Set in-memory data without persisting (used when hydrating FROM IndexedDB). */
export function hydrate(data: StoreData) {
  state = { data, ready: true };
  emit();
}

/** Replace the whole dataset (used after a server sync) and persist to IndexedDB. */
export function replaceAll(data: StoreData) {
  state = { data, ready: true };
  emit();
  void idbSet(IDB_KEY, data);
}

/** Apply an in-memory mutation and persist (used by optimistic writes). */
export function mutate(fn: (d: StoreData) => StoreData) {
  state = { data: fn(state.data), ready: state.ready };
  emit();
  void idbSet(IDB_KEY, state.data);
}

export function getData(): StoreData { return state.data; }

export async function loadFromIDB(): Promise<boolean> {
  const cached = await idbGet<StoreData>(IDB_KEY);
  if (cached) { hydrate(normalize(cached)); return true; }
  return false;
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
