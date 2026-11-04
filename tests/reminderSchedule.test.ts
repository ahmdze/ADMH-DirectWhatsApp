import { describe, expect, it } from 'vitest';
import { buildReminderSchedule } from '../src/lib/reminderSchedule';
import type { Reminder } from '../src/types';

function at(year: number, month: number, day: number, hour = 9): number {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    workspaceId: 'personal',
    fingerprint: '9647701234567',
    label: 'Follow up',
    display: '+964 770 123 4567',
    dueAt: at(2026, 1, 2),
    done: false,
    createdAt: 1,
    ...overrides
  };
}

describe('buildReminderSchedule', () => {
  it('schedules a future one-off reminder and skips an overdue one', () => {
    const now = at(2026, 1, 1);
    const planned = buildReminderSchedule([
      reminder({ id: 'future', dueAt: at(2026, 1, 2) }),
      reminder({ id: 'past', dueAt: at(2025, 12, 31) })
    ], now);
    expect(planned.map((item) => item.reminderId)).toEqual(['future']);
    expect(planned[0].at).toBe(at(2026, 1, 2));
  });

  it('schedules the next three occurrences of a recurring reminder', () => {
    const now = at(2026, 1, 3, 10);
    const planned = buildReminderSchedule([
      reminder({ dueAt: at(2026, 1, 1), recurrence: { kind: 'daily', interval: 1 } })
    ], now);
    expect(planned.map((item) => item.at)).toEqual([
      at(2026, 1, 4),
      at(2026, 1, 5),
      at(2026, 1, 6)
    ]);
  });

  it('respects the 100 notification cap and keeps nearest first', () => {
    const now = at(2026, 1, 1);
    const rows = Array.from({ length: 40 }, (_, index) =>
      reminder({
        id: `r-${index}`,
        dueAt: at(2026, 1, 2) + index * 60_000,
        recurrence: { kind: 'daily', interval: 1 }
      })
    );
    const planned = buildReminderSchedule(rows, now, 100);
    expect(planned).toHaveLength(100);
    expect(planned[0].at).toBeLessThanOrEqual(planned[planned.length - 1].at);
  });

  it('uses the message snapshot as the notification body and unique keys', () => {
    const planned = buildReminderSchedule([
      reminder({ message: 'رسالة مخصصة', dueAt: at(2026, 1, 2), recurrence: { kind: 'daily', interval: 1 } })
    ], at(2026, 1, 1));
    expect(planned[0].body).toBe('رسالة مخصصة');
    expect(new Set(planned.map((item) => item.key)).size).toBe(planned.length);
  });
});
