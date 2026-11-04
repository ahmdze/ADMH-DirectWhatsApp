import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useSettings } from '../lib/settings';
import type { Campaign, Destination, HistoryEntry, Reminder, Template, Workspace } from '../types';

const EMPTY: never[] = [];

export function useWorkspaces(): Workspace[] {
  return useLiveQuery(() => db.workspaces.orderBy('createdAt').toArray(), [], EMPTY as Workspace[]);
}

export function useActiveWorkspace(): Workspace | null {
  const settings = useSettings();
  const workspaces = useWorkspaces();
  return workspaces.find((w) => w.id === settings.activeWorkspaceId) || workspaces[0] || null;
}

export function useDestinations(workspaceId: string | undefined): Destination[] {
  return useLiveQuery(async () => {
    if (!workspaceId) return [];
    const rows = await db.destinations.where('workspaceId').equals(workspaceId).toArray();
    return rows.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt);
    });
  }, [workspaceId], EMPTY as Destination[]);
}

export function useHistory(workspaceId: string | undefined, limit = 50): HistoryEntry[] {
  return useLiveQuery(async () => {
    if (!workspaceId) return [];
    return db.history.where('workspaceId').equals(workspaceId).reverse().sortBy('usedAt').then((rows) => rows.slice(0, limit));
  }, [workspaceId, limit], EMPTY as HistoryEntry[]);
}

export function useTemplates(workspaceId: string | undefined): Template[] {
  return useLiveQuery(async () => {
    if (!workspaceId) return [];
    const rows = await db.templates.where('workspaceId').equals(workspaceId).toArray();
    return rows.sort((a, b) => (b.lastUsedAt || b.createdAt) - (a.lastUsedAt || a.createdAt));
  }, [workspaceId], EMPTY as Template[]);
}

export function useCampaigns(workspaceId: string | undefined): Campaign[] {
  return useLiveQuery(async () => {
    if (!workspaceId) return [];
    return db.campaigns.where('workspaceId').equals(workspaceId).reverse().sortBy('createdAt');
  }, [workspaceId], EMPTY as Campaign[]);
}

export function useReminders(workspaceId: string | undefined): Reminder[] {
  return useLiveQuery(async () => {
    if (!workspaceId) return [];
    return db.reminders.where('workspaceId').equals(workspaceId).sortBy('dueAt');
  }, [workspaceId], EMPTY as Reminder[]);
}

/** All reminders across workspaces (used by the reminders filter/pagination). */
export function useAllReminders(): Reminder[] | undefined {
  return useLiveQuery(() => db.reminders.orderBy('dueAt').toArray(), [], undefined);
}

export function useDueReminders(workspaceId: string | undefined): Reminder[] {
  return useLiveQuery(async () => {
    if (!workspaceId) return [];
    const now = Date.now();
    return db.reminders
      .where('workspaceId')
      .equals(workspaceId)
      .filter((reminder) => !reminder.done && reminder.dueAt <= now)
      .toArray();
  }, [workspaceId], EMPTY as Reminder[]);
}

export function useDestinationById(id: string | undefined): Destination | undefined {
  return useLiveQuery(() => (id ? db.destinations.get(id) : undefined), [id], undefined);
}
