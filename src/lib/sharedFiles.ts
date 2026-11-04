let pendingFiles: File[] = [];
const listeners = new Set<() => void>();

/** Files received through the native Android share sheet, waiting for Compose. */
export function setSharedFiles(files: File[]): void {
  if (!files.length) return;
  pendingFiles = files;
  listeners.forEach((listener) => listener());
}

export function takeSharedFiles(): File[] {
  const files = pendingFiles;
  pendingFiles = [];
  return files;
}

export function subscribeSharedFiles(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
