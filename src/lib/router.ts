import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/compose';
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', emit);
}

export function navigate(to: string): void {
  const target = to.startsWith('/') ? to : '/' + to;
  if (currentPath() === target) return;
  window.location.hash = target;
}

export function replace(to: string): void {
  const target = to.startsWith('/') ? to : '/' + to;
  window.location.replace('#' + target);
}

export function useRoute(): string[] {
  const path = useSyncExternalStore(subscribe, currentPath, currentPath);
  return path.split('/').filter(Boolean);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, currentPath, currentPath);
}

export function goBack(fallback = '/compose'): void {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}

export function tabOf(path: string[]): 'compose' | 'targets' | 'templates' | 'tools' | 'settings' | 'sub' {
  const first = path[0];
  if (first === 'compose' || first === 'targets' || first === 'templates' || first === 'tools' || first === 'settings') return first;
  if (first === 'tools') return 'tools';
  return 'sub';
}
