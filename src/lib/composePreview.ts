import type { Target } from '../types';

export interface PreviewIdentity {
  name: string;
  handle: string;
}

export interface CardPreviewModel extends PreviewIdentity {
  workspaceName: string;
  message: string;
}

export function previewIdentity(target: Target | null): PreviewIdentity {
  if (!target) return { name: '', handle: '' };
  return {
    name: target.display,
    handle: target.type === 'username' ? `@${target.value}` : `+${target.value}`
  };
}

export function cardPreviewModel(target: Target | null, workspaceName: string, message: string): CardPreviewModel {
  const identity = previewIdentity(target);
  return {
    ...identity,
    workspaceName,
    message: message.trim().slice(0, 140)
  };
}

export function labelPreviewModel(target: Target | null, workspaceName: string): PreviewIdentity & { workspaceName: string } {
  return { ...previewIdentity(target), workspaceName };
}
