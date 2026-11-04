export type ToastKind = 'default' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return items;
}

export function toast(message: string, kind: ToastKind = 'default', duration = 2600): string {
  const id = Math.random().toString(36).slice(2);
  items = [...items.slice(-2), { id, message, kind }];
  emit();
  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, duration);
  return id;
}
