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
  /** Why the last server sync failed, in words for the person; null once one succeeds. */
  syncError: string | null;
}

// Before the store hydrates there are no decks. (It used to show the seven
// built-in ones, which flashed decks a new, deck-less account doesn't have.)
const EMPTY_DATA: StoreData = {
  problems: [],
  attempts: [],
  notes: [],
  links: [],
  config_options: [],
  domains: [],
  domain_fields: [],
  domain_field_options: [],
};
const SERVER_STATE: StoreState = { data: EMPTY_DATA, ready: false, syncError: null };
const IDB_KEY = 'store';

let state: StoreState = SERVER_STATE;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return state; }
function getServerSnapshot() { return SERVER_STATE; }

/**
 * The built-in decks stand in only for an IndexedDB snapshot from before decks
 * were stored at all — one with no `domains` key. An account with zero decks
 * (every new account) has `domains: []`, and that means zero decks.
 */
export function normalize(raw: Partial<StoreData> | null | undefined): StoreData {
  const configOptions = raw?.config_options ?? [];
  const legacySnapshot = !!raw && raw.domains === undefined;
  return {
    problems: (raw?.problems ?? []).map(normalizeProblem),
    attempts: raw?.attempts ?? [],
    notes: raw?.notes ?? [],
    links: raw?.links ?? [],
    config_options: configOptions,
    domains: (legacySnapshot ? LEGACY_DOMAIN_FALLBACKS : raw?.domains ?? []).map(normalizeDomain),
    domain_fields: legacySnapshot ? LEGACY_FIELD_FALLBACKS : raw?.domain_fields ?? [],
    domain_field_options: legacySnapshot ? legacyOptionsFromConfig(configOptions) : raw?.domain_field_options ?? [],
  };
}

/** Set in-memory data without persisting (used when hydrating FROM IndexedDB). */
export function hydrate(data: StoreData) {
  state = { ...state, data, ready: true };
  emit();
}

/** Replace the whole dataset (used after a server sync) and persist to IndexedDB. */
export function replaceAll(data: StoreData) {
  state = { ...state, data, ready: true };
  emit();
  void idbSet(IDB_KEY, data);
}

/** Apply an in-memory mutation and persist (used by optimistic writes). */
export function mutate(fn: (d: StoreData) => StoreData) {
  state = { ...state, data: fn(state.data) };
  emit();
  void idbSet(IDB_KEY, state.data);
}

export function getData(): StoreData { return state.data; }

/** Record (or clear, with null) why syncing with the server failed. */
export function setSyncError(syncError: string | null) {
  if (state.syncError === syncError) return;
  state = { ...state, syncError };
  emit();
}

export async function loadFromIDB(): Promise<boolean> {
  const cached = await idbGet<StoreData>(IDB_KEY);
  if (cached) { hydrate(normalize(cached)); return true; }
  return false;
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
