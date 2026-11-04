import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db';
import { buildBackup, importBackup } from '../src/lib/backup';

const previous = Date.now();

describe('backup roundtrip', () => {
  afterAll(async () => {
    db.close();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('admh-direct-whatsapp-v2');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('exports, clears and restores all v2 data tables', async () => {
    await db.workspaces.put({ id: 'personal', name: 'شخصي', nameEn: 'Personal', icon: 'user', color: '#6EE7B7', createdAt: 1 });
    await db.destinations.put({ id: 'd1', workspaceId: 'personal', type: 'phone', phone: '9647701234567', label: 'أحمد', tags: [], favorite: true, createdAt: 1, useCount: 2 });
    await db.templates.put({ id: 't1', workspaceId: 'personal', title: 'قالب', body: 'مرحباً {الاسم}', tags: [], createdAt: 1 });
    await db.history.put({ id: 'h1', workspaceId: 'personal', targetType: 'phone', value: '9647701234567', display: '+964 770 123 4567', usedAt: previous });
    await db.campaigns.put({ id: 'c1', workspaceId: 'personal', name: 'حملة', message: 'نص', items: [], createdAt: 1, updatedAt: 1 });
    await db.reminders.put({
      id: 'r1',
      workspaceId: 'personal',
      fingerprint: 'phone:9647701234567',
      label: 'متابعة',
      display: '+964 770 123 4567',
      dueAt: previous + 60_000,
      done: false,
      createdAt: 1,
      recurrence: { kind: 'daily', interval: 1 }
    });
    await db.trash.put({ id: 'trash1', kind: 'history', payload: { id: 'h2', workspaceId: 'personal', targetType: 'phone', value: '1', display: '+1', usedAt: 2 }, deletedAt: 3, restoreUntil: 4 });

    const backup = await buildBackup(false);
    expect(backup.destinations).toHaveLength(1);
    expect(backup.trash).toHaveLength(1);

    await Promise.all([
      db.workspaces.clear(),
      db.destinations.clear(),
      db.templates.clear(),
      db.history.clear(),
      db.campaigns.clear(),
      db.reminders.clear(),
      db.trash.clear()
    ]);

    const result = await importBackup(backup, 'replace', false);
    expect(result).toMatchObject({ workspaces: 1, destinations: 1, templates: 1, history: 1, campaigns: 1, reminders: 1, trash: 1 });
    expect(await db.destinations.get('d1')).toMatchObject({ label: 'أحمد' });
    expect(await db.reminders.get('r1')).toMatchObject({ recurrence: { kind: 'daily', interval: 1 } });
    expect(await db.trash.get('trash1')).toMatchObject({ kind: 'history' });
  });
});
