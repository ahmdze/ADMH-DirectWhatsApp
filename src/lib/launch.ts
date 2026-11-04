import type { Draft } from '../types';
import { extractCandidateFromText } from './phone';

let pendingDraft: Draft | null = null;

export function setDraft(draft: Draft | null): void {
  pendingDraft = draft;
}

export function takeDraft(): Draft | null {
  const draft = pendingDraft;
  pendingDraft = null;
  return draft;
}

export function peekDraft(): Draft | null {
  return pendingDraft;
}

export interface LaunchInfo {
  action: 'compose' | 'scan' | null;
  draft: Draft | null;
}

/** Read PWA shortcuts / share_target query params once and clean the URL. */
export function consumeLaunchParams(): LaunchInfo {
  const params = new URLSearchParams(window.location.search);
  const actionParam = params.get('action');
  const action = actionParam === 'scan' ? 'scan' : actionParam === 'compose' ? 'compose' : null;
  const title = params.get('title') || '';
  const text = params.get('text') || '';
  const url = params.get('url') || '';
  const shared = params.get('share') ? [title, text, url].filter(Boolean).join('\n') : '';
  const sharedText = shared || [text, url].filter(Boolean).join('\n');

  let draft: Draft | null = null;
  if (sharedText.trim() || shared) {
    const candidate = extractCandidateFromText(sharedText);
    draft = candidate ? { raw: candidate, message: text && !candidate.includes(text) ? text : undefined, origin: 'share' } : { raw: '', message: text || undefined, origin: 'share' };
  }

  if (window.location.search) {
    const clean = window.location.pathname + window.location.hash;
    try {
      window.history.replaceState(null, '', clean);
    } catch {
      /* ignore */
    }
  }

  return { action, draft };
}

export function installShortcut(action: 'compose' | 'scan'): void {
  const base = window.location.pathname;
  const suffix = action === 'compose' ? '?action=compose' : '?action=scan';
  window.location.href = base + suffix + (window.location.hash || '');
}
