import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db';
import { reminderAfterOpen, resolveReminderMessage } from '../src/lib/reminderActions';
import { setDraft, takeDraft } from '../src/lib/launch';
import type { Reminder } from '../src/types';

function at(year: number, month: number, day: number, hour = 9): number {
  return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
}

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-a4',
    workspaceId: 'personal',
    fingerprint: 'phone:9647701234567',
    label: 'أحمد',
    display: '+964 770 123 4567',
    dueAt: at(2026, 1, 1),
    done: false,
    createdAt: 1,
    ...overrides
  };
}

describe('reminder actions (A4)', () => {
  afterAll(async () => {
    db.close();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('admh-direct-whatsapp-v2');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('resolves template variables from the saved destination and locale date', async () => {
    await db.destinations.put({
      id: 'destination-a4',
      workspaceId: 'personal',
      type: 'phone',
      phone: '9647701234567',
      label: 'أحمد زياد',
      tags: [],
      favorite: true,
      createdAt: 1,
      useCount: 1
    });
    await db.templates.put({
      id: 'template-a4',
      workspaceId: 'personal',
      title: 'متابعة',
      body: 'مرحباً {الاسم}، بخصوص {الجهة} في {التاريخ}.',
      tags: [],
      createdAt: 1
    });

    const message = await resolveReminderMessage(
      reminder({ templateId: 'template-a4' })
    );

    expect(message).toContain('أحمد زياد');
    expect(message).not.toContain('{');
  });

  it('marks a one-off reminder done and records the miss', () => {
    const patch = reminderAfterOpen(reminder(), at(2026, 1, 2));
    expect(patch.done).toBe(true);
    expect(patch.missedCount).toBe(1);
    expect(patch.lastOpenedAt).toBe(at(2026, 1, 2));
  });

  it('moves a recurring reminder to its next occurrence without deleting it', () => {
    const patch = reminderAfterOpen(
      reminder({ dueAt: at(2026, 1, 1), recurrence: { kind: 'daily', interval: 1 } }),
      at(2026, 1, 1, 10)
    );
    expect(patch.done).toBeUndefined();
    expect(patch.dueAt).toBe(at(2026, 1, 2));
    expect(patch.missedCount).toBe(1);
  });

  it('hands a workspace-aware draft to Compose', () => {
    setDraft({
      raw: '+964 770 123 4567',
      phone: '+964 770 123 4567',
      workspaceId: 'work',
      targetId: 'destination-a4',
      message: 'مرحباً',
      origin: 'shortcut'
    });
    expect(takeDraft()).toMatchObject({
      workspaceId: 'work',
      targetId: 'destination-a4',
      phone: '+964 770 123 4567',
      origin: 'shortcut'
    });
    expect(takeDraft()).toBeNull();
  });
});
