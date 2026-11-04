import { useSyncExternalStore } from 'react';

type Dictionary = Record<string, string>;

let dictionary: Dictionary = {};
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Dictionary {
  return dictionary;
}

/** Load the Persian dictionary lazily, only when fa is selected. */
export function loadPersian(): void {
  if (Object.keys(dictionary).length || loading) return;
  loading = import('./fa')
    .then((module) => {
      dictionary = module.FA;
      emit();
    })
    .catch(() => {
      loading = null;
    });
}

export function usePersian(): Dictionary {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
