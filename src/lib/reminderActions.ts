import type { Reminder } from '../types';
import { db, updateReminder } from './db';
import { setDraft } from './launch';
import { navigate } from './router';
import { getSettings, updateSettings } from './settings';
import { applyTemplate } from './template';
import { formatDate } from './format';
import { nextOccurrence } from './recurrence';

/** Resolve a reminder message, preferring the saved snapshot over a live template. */
export async function resolveReminderMessage(reminder: Reminder): Promise<string> {
  if (reminder.message) return reminder.message;
  if (!reminder.templateId) return reminder.note || '';

  const template = await db.templates.get(reminder.templateId);
  if (!template) return reminder.note || '';

  const destinations = await db.destinations
    .where('workspaceId')
    .equals(reminder.workspaceId)
    .toArray();
  const target = destinations.find(
    (item) => `${item.type}:${item.type === 'phone' ? item.phone || '' : item.username || ''}` === reminder.fingerprint
  );
  const locale = getSettings().locale;

  return applyTemplate(template.body, {
    name: reminder.templateVars?.name ?? target?.label,
    company: reminder.templateVars?.company ?? target?.label ?? reminder.display,
    date: reminder.templateVars?.date ?? formatDate(Date.now(), locale)
  });
}

/** State transition after a reminder notification is opened. */
export function reminderAfterOpen(reminder: Reminder, now = Date.now()): Partial<Reminder> {
  const patch: Partial<Reminder> = {
    lastNotifiedAt: now,
    lastOpenedAt: now
  };

  if (reminder.dueAt <= now) {
    patch.missedAt = reminder.dueAt;
    patch.missedCount = (reminder.missedCount ?? 0) + 1;
  }

  if (!reminder.recurrence) {
    patch.done = true;
    return patch;
  }

  const next = nextOccurrence(reminder, now);
  if (next === null) patch.done = true;
  else patch.dueAt = next;
  return patch;
}

/**
 * Notification action: open Compose with the target, message and workspace of
 * a reminder. Never sends anything; the user still taps Send in WhatsApp.
 */
export async function openReminderInCompose(reminderId: string): Promise<void> {
  const reminder = await db.reminders.get(reminderId);
  if (!reminder) {
    navigate('/tools/reminders');
    return;
  }

  const settings = getSettings();
  if (settings.activeWorkspaceId !== reminder.workspaceId) {
    updateSettings({ activeWorkspaceId: reminder.workspaceId });
  }

  const destinations = await db.destinations
    .where('workspaceId')
    .equals(reminder.workspaceId)
    .toArray();
  const target = destinations.find(
    (item) => `${item.type}:${item.type === 'phone' ? item.phone || '' : item.username || ''}` === reminder.fingerprint
  );
  const message = await resolveReminderMessage(reminder);

  setDraft({
    raw: reminder.display,
    phone: reminder.display,
    targetId: target?.id,
    workspaceId: reminder.workspaceId,
    message: message || undefined,
    origin: 'shortcut'
  });

  await updateReminder(reminder.id, reminderAfterOpen(reminder));
  navigate('/compose');
}
