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

/** Load the (large) Kurdish dictionary lazily, only when ckb is selected. */
export function loadKurdish(): void {
  if (Object.keys(dictionary).length || loading) return;
  loading = import('./ku')
    .then((module) => {
      dictionary = module.KU;
      emit();
    })
    .catch(() => {
      loading = null;
    });
}

export function getKurdish(): Dictionary {
  return dictionary;
}

export function useKurdish(): Dictionary {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
