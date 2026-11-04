import type { Reminder } from '../types';
import { db, updateReminder } from './db';
import { setDraft } from './launch';
import { navigate } from './router';
import { getSettings, updateSettings } from './settings';
import { applyTemplate } from './template';
import { nextOccurrence } from './recurrence';

/** Resolve the message stored on a reminder, falling back to its template. */
export async function resolveReminderMessage(reminder: Reminder): Promise<string> {
  if (reminder.message) return reminder.message;
  if (reminder.templateId) {
    const template = await db.templates.get(reminder.templateId);
    if (template) {
      return applyTemplate(template.body, {
        name: reminder.templateVars?.name,
        company: reminder.templateVars?.company,
        date: reminder.templateVars?.date
      });
    }
  }
  return reminder.note || '';
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

  const message = await resolveReminderMessage(reminder);
  setDraft({
    raw: reminder.display,
    message: message || undefined,
    origin: 'shortcut'
  });

  const now = Date.now();
  const patch: Partial<Reminder> = {
    lastNotifiedAt: now,
    lastOpenedAt: now
  };
  if (reminder.recurrence) {
    const next = nextOccurrence(reminder, now);
    if (next === null) patch.done = true;
    else patch.dueAt = next;
  }
  await updateReminder(reminder.id, patch);
  navigate('/compose');
}
