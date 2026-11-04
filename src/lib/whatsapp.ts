import type { Target } from '../types';

/** Build a wa.me chat URL. Usernames are encoded as-is (no @). */
export function buildChatUrl(target: Target, message?: string): string {
  const base = target.type === 'username' ? `https://wa.me/${encodeURIComponent(target.value)}` : `https://wa.me/${target.value}`;
  const text = (message || '').trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function buildShareUrl(target: Target): string {
  return buildChatUrl(target);
}

/** Opens WhatsApp in a new tab/app. Must be called from a user gesture on iOS. */
export function openChat(target: Target, message?: string): void {
  const url = buildChatUrl(target, message);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function targetFromListHref(target: Target): string {
  return buildChatUrl(target);
}
