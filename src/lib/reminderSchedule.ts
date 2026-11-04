import type { Reminder } from '../types';
import { nextOccurrence } from './recurrence';

export interface ScheduledReminder {
  key: string;
  reminderId: string;
  at: number;
  title: string;
  body: string;
}

export const MAX_SCHEDULED_REMINDERS = 100;
const MAX_OCCURRENCES_PER_REMINDER = 3;

function bodyOf(reminder: Reminder): string {
  return (reminder.message || reminder.note || reminder.display).slice(0, 240);
}

function scheduleEntry(reminder: Reminder, at: number): ScheduledReminder {
  return {
    key: `${reminder.id}:${at}`,
    reminderId: reminder.id,
    at,
    title: reminder.label,
    body: bodyOf(reminder)
  };
}

/**
 * Pure planner shared by the native scheduler and its unit tests.
 *
 * Phase 1 gives every reminder its next occurrence, so 100 reminders still get
 * at least one notification. Phase 2 fills the remaining budget with future
 * occurrences of recurring reminders. This prevents one busy reminder from
 * consuming the whole Android notification limit.
 */
export function buildReminderSchedule(
  reminders: Reminder[],
  now = Date.now(),
  max = MAX_SCHEDULED_REMINDERS
): ScheduledReminder[] {
  const limit = Math.max(1, Math.floor(max));
  const firsts: ScheduledReminder[] = [];
  const extras: ScheduledReminder[] = [];

  for (const reminder of reminders) {
    if (reminder.done) continue;
    const first = reminder.dueAt > now + 1000
      ? reminder.dueAt
      : reminder.recurrence
        ? nextOccurrence(reminder, now)
        : null;
    if (!first) continue;

    firsts.push(scheduleEntry(reminder, first));
    if (!reminder.recurrence) continue;

    let cursor: number | null = first;
    for (let index = 1; index < MAX_OCCURRENCES_PER_REMINDER && cursor; index += 1) {
      cursor = nextOccurrence({ ...reminder, dueAt: cursor }, cursor);
      if (cursor && cursor > now) extras.push(scheduleEntry(reminder, cursor));
    }
  }

  const sortedFirsts = firsts.sort((left, right) => left.at - right.at);
  if (sortedFirsts.length >= limit) return sortedFirsts.slice(0, limit);
  return [...sortedFirsts, ...extras.sort((left, right) => left.at - right.at)].slice(0, limit);
}
