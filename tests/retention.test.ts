import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db';
import { applyRetention, purgeExpiredTrash, restoreTrash } from '../src/lib/retention';
import type { HistoryEntry, RetentionSettings } from '../src/types';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 5, 12);
const policy: RetentionSettings = {
  historyEnabled: true,
  retentionDays: 30,
  keepLatest: null,
  excludeFavoriteTargets: true,
  trashDays: 30
};

function history(id: string, value: string, usedAt: number): HistoryEntry {
  return { id, workspaceId: 'personal', targetType: 'phone', value, display: `+${value}`, usedAt };
}

describe('history retention and trash', () => {
  afterAll(async () => {
    db.close();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('admh-direct-whatsapp-v2');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('moves old non-favorite history to trash and keeps favorites', async () => {
    await db.destinations.put({
      id: 'fav', workspaceId: 'personal', type: 'phone', phone: '9647700000001', label: 'مفضل',
      tags: [], favorite: true, createdAt: 1, useCount: 1
    });
    await db.history.bulkPut([
      history('old', '9647700000009', now - 60 * DAY),
      history('favorite-old', '9647700000001', now - 90 * DAY),
      history('new', '9647700000002', now - 2 * DAY)
    ]);

    const result = await applyRetention(policy, now);
    expect(result.moved).toBe(1);
    expect(await db.history.get('old')).toBeUndefined();
    expect(await db.history.get('favorite-old')).toBeDefined();
    expect(await db.history.get('new')).toBeDefined();
    const trashed = await db.trash.toArray();
    expect(trashed).toHaveLength(1);
    expect(trashed[0].payload.id).toBe('old');

    expect(await restoreTrash(trashed[0].id)).toBe(true);
    expect(await db.history.get('old')).toBeDefined();
  });

  it('purges expired trash and does nothing while retention is disabled', async () => {
    await db.trash.put({
      id: 'expired', kind: 'history', payload: history('expired-history', '1', now - 100 * DAY),
      deletedAt: now - 40 * DAY, restoreUntil: now - DAY
    });
    const disabled = await applyRetention({ ...policy, historyEnabled: false }, now);
    expect(disabled.moved).toBe(0);
    expect(disabled.purged).toBe(1);
    expect(await db.trash.count()).toBe(0);
    expect(await purgeExpiredTrash(now)).toBe(0);
  });
});
