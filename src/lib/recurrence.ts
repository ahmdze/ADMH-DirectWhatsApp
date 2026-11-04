/**
 * Small recurrence engine for reminders.
 *
 * Deliberately dependency-free: v2.4 supports daily/weekly/monthly schedules
 * only. All calculations use local wall-clock time so a 09:00 reminder stays at
 * 09:00 across DST changes; `until` is an inclusive absolute timestamp.
 */
import type { ReminderRecurrence } from '../types';

export interface RecurrenceInput {
  dueAt: number;
  recurrence?: ReminderRecurrence | null;
}

const DAY_MS = 86_400_000;

function atLocal(base: Date, year: number, month: number, day: number): number {
  const date = new Date(year, month, day, base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
  return date.getTime();
}

function validUntil(recurrence: ReminderRecurrence): number | null {
  return typeof recurrence.until === 'number' && Number.isFinite(recurrence.until) ? recurrence.until : null;
}

function allowedByUntil(candidate: number, recurrence: ReminderRecurrence): number | null {
  const until = validUntil(recurrence);
  return until !== null && candidate > until ? null : candidate;
}

function nextDaily(dueAt: number, from: number, recurrence: Extract<ReminderRecurrence, { kind: 'daily' }>): number | null {
  const interval = Math.max(1, Math.floor(recurrence.interval || 1));
  const start = new Date(dueAt);
  const fromDate = new Date(from);
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const fromDay = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const days = Math.max(0, Math.floor((fromDay - startDay) / DAY_MS));
  let jumps = Math.max(1, Math.ceil((days + 1) / interval));
  let candidate = atLocal(start, start.getFullYear(), start.getMonth(), start.getDate() + jumps * interval);
  while (candidate <= from) {
    jumps += 1;
    candidate = atLocal(start, start.getFullYear(), start.getMonth(), start.getDate() + jumps * interval);
  }
  return allowedByUntil(candidate, recurrence);
}

function nextWeekly(dueAt: number, from: number, recurrence: Extract<ReminderRecurrence, { kind: 'weekly' }>): number | null {
  const days = new Set(
    recurrence.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
  if (!days.size) return null;
  const start = new Date(dueAt);
  const fromDate = new Date(from);
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidateDate = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      fromDate.getDate() + offset,
      start.getHours(),
      start.getMinutes(),
      start.getSeconds(),
      start.getMilliseconds()
    );
    if (candidateDate.getTime() <= from || candidateDate.getTime() < dueAt) continue;
    if (days.has(candidateDate.getDay())) return allowedByUntil(candidateDate.getTime(), recurrence);
  }
  return null;
}

function nextMonthly(dueAt: number, from: number, recurrence: Extract<ReminderRecurrence, { kind: 'monthly' }>): number | null {
  const day = Math.min(31, Math.max(1, Math.floor(recurrence.day || 1)));
  const start = new Date(dueAt);
  const fromDate = new Date(from);
  for (let offset = 0; offset < 24; offset += 1) {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth() + offset;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const candidate = atLocal(start, year, month, Math.min(day, daysInMonth));
    if (candidate <= from || candidate < dueAt) continue;
    return allowedByUntil(candidate, recurrence);
  }
  return null;
}

/** Next occurrence strictly after `from`, or null when the schedule has ended. */
export function nextOccurrence(input: RecurrenceInput, from = Date.now()): number | null {
  const { dueAt, recurrence } = input;
  if (!Number.isFinite(dueAt)) return null;
  if (!recurrence) return dueAt > from ? dueAt : null;
  const until = validUntil(recurrence);
  if (until !== null && dueAt > until) return null;
  if (dueAt > from) return dueAt;
  if (recurrence.kind === 'daily') return nextDaily(dueAt, from, recurrence);
  if (recurrence.kind === 'weekly') return nextWeekly(dueAt, from, recurrence);
  return nextMonthly(dueAt, from, recurrence);
}
