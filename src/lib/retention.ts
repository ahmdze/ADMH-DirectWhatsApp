/**
 * Local-only history retention and a 30-day trash.
 *
 * `applyRetention` is pure with respect to settings (the caller passes the
 * policy), which keeps it unit-testable without localStorage. `runRetention`
 * is the app wrapper that reads the user's settings and rate-limits itself.
 */
import type { HistoryEntry, RetentionSettings, TrashEntry } from '../types';
import { db } from './db';
import { getSettings, updateSettings } from './settings';
import { uid } from './format';

const DAY_MS = 86_400_000;
const RUN_INTERVAL_MS = 12 * 60 * 60 * 1000;

export interface RetentionResult {
  moved: number;
  purged: number;
  kept: number;
}

export async function purgeExpiredTrash(now = Date.now()): Promise<number> {
  const expired = await db.trash.where('restoreUntil').below(now).toArray();
  if (!expired.length) return 0;
  await db.trash.bulkDelete(expired.map((entry) => entry.id));
  return expired.length;
}

export async function applyRetention(policy: RetentionSettings, now = Date.now()): Promise<RetentionResult> {
  const purged = await purgeExpiredTrash(now);
  if (!policy.historyEnabled) {
    return { moved: 0, purged, kept: await db.history.count() };
  }

  const [rows, destinations] = await Promise.all([db.history.toArray(), db.destinations.toArray()]);
  const favoriteKeys = new Set(
    destinations
      .filter((item) => item.favorite)
      .map((item) => `${item.type}:${item.type === 'phone' ? item.phone || '' : item.username || ''}`)
  );
  const sorted = rows.sort((left, right) => right.usedAt - left.usedAt);
  const cutoff = policy.retentionDays > 0 ? now - policy.retentionDays * DAY_MS : null;
  const keepLatest = policy.keepLatest ?? null;
  const trashDays = Math.max(1, Math.floor(policy.trashDays || 30));
  const toMove: HistoryEntry[] = [];

  sorted.forEach((entry, index) => {
    if (policy.excludeFavoriteTargets && favoriteKeys.has(`${entry.targetType}:${entry.value}`)) return;
    const beyondKeepLatest = keepLatest !== null && index >= keepLatest;
    const beyondAge = cutoff !== null && entry.usedAt < cutoff;
    if (beyondKeepLatest || beyondAge) toMove.push(entry);
  });

  if (toMove.length) {
    const trash: TrashEntry[] = toMove.map((entry) => ({
      id: uid(),
      kind: 'history',
      payload: entry,
      deletedAt: now,
      restoreUntil: now + trashDays * DAY_MS
    }));
    await db.transaction('rw', db.history, db.trash, async () => {
      await db.trash.bulkPut(trash);
      await db.history.bulkDelete(toMove.map((entry) => entry.id));
    });
  }

  return { moved: toMove.length, purged, kept: rows.length - toMove.length };
}

/** App wrapper: runs at most every 12h unless forced. */
export async function runRetention(now = Date.now(), force = false): Promise<RetentionResult> {
  const settings = getSettings();
  const lastRun = settings.retention.lastRunAt || 0;
  if (!force && lastRun && now - lastRun < RUN_INTERVAL_MS) {
    return { moved: 0, purged: 0, kept: 0 };
  }
  const result = await applyRetention(settings.retention, now);
  updateSettings({ retention: { ...settings.retention, lastRunAt: now } });
  return result;
}

export async function restoreTrash(id: string): Promise<boolean> {
  const entry = await db.trash.get(id);
  if (!entry || entry.restoreUntil < Date.now()) return false;
  if (!(await db.history.get(entry.payload.id))) await db.history.put(entry.payload);
  await db.trash.delete(id);
  return true;
}

export async function deleteTrash(id: string): Promise<void> {
  await db.trash.delete(id);
}

export async function clearTrash(): Promise<number> {
  const count = await db.trash.count();
  await db.trash.clear();
  return count;
}
