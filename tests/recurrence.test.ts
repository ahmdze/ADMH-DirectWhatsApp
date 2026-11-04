import { describe, expect, it } from 'vitest';
import { nextOccurrence } from '../src/lib/recurrence';
import type { ReminderRecurrence } from '../src/types';

function at(year: number, month: number, day: number, hour = 9, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function daily(interval: number, until?: number): ReminderRecurrence {
  return { kind: 'daily', interval, until };
}

describe('nextOccurrence', () => {
  it('returns a future one-off due date and null once passed', () => {
    expect(nextOccurrence({ dueAt: at(2026, 5, 2) }, at(2026, 5, 1))).toBe(at(2026, 5, 2));
    expect(nextOccurrence({ dueAt: at(2026, 5, 2) }, at(2026, 5, 3))).toBeNull();
  });

  it('handles daily intervals and protects interval=0', () => {
    expect(nextOccurrence({ dueAt: at(2026, 1, 1), recurrence: daily(3) }, at(2026, 1, 1, 10))).toBe(at(2026, 1, 4));
    expect(nextOccurrence({ dueAt: at(2026, 1, 1), recurrence: daily(0) }, at(2026, 1, 1, 10))).toBe(at(2026, 1, 2));
  });

  it('moves to the next selected weekday', () => {
    // 2026-01-05 is a Monday. From Monday 10:00, Tuesday is next.
    const recurrence: ReminderRecurrence = { kind: 'weekly', weekdays: [2] };
    expect(nextOccurrence({ dueAt: at(2026, 1, 4), recurrence }, at(2026, 1, 5, 10))).toBe(at(2026, 1, 6));
  });

  it('clamps monthly day 31 to the end of short months', () => {
    expect(nextOccurrence({ dueAt: at(2026, 1, 31), recurrence: { kind: 'monthly', day: 31 } }, at(2026, 1, 31, 10))).toBe(at(2026, 2, 28));
    expect(nextOccurrence({ dueAt: at(2024, 1, 31), recurrence: { kind: 'monthly', day: 31 } }, at(2024, 1, 31, 10))).toBe(at(2024, 2, 29));
  });

  it('handles day 29 in non-leap February', () => {
    expect(nextOccurrence({ dueAt: at(2026, 1, 29), recurrence: { kind: 'monthly', day: 29 } }, at(2026, 1, 29, 10))).toBe(at(2026, 2, 28));
    expect(nextOccurrence({ dueAt: at(2024, 1, 29), recurrence: { kind: 'monthly', day: 29 } }, at(2024, 1, 29, 10))).toBe(at(2024, 2, 29));
  });

  it('stops at an inclusive until timestamp', () => {
    const recurrence = daily(1, at(2026, 1, 3));
    expect(nextOccurrence({ dueAt: at(2026, 1, 1), recurrence }, at(2026, 1, 2, 10))).toBe(at(2026, 1, 3));
    expect(nextOccurrence({ dueAt: at(2026, 1, 1), recurrence }, at(2026, 1, 3, 10))).toBeNull();
  });

  it('does not return the due date when called exactly at it', () => {
    expect(nextOccurrence({ dueAt: at(2026, 1, 1), recurrence: daily(1) }, at(2026, 1, 1))).toBe(at(2026, 1, 2));
  });
});
