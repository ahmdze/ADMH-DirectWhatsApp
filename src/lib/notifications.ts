import type { Reminder } from '../types';
import { getSettings, subscribeSettings } from './settings';
import { initNative, isNative } from './native';
import { buildReminderSchedule, type ScheduledReminder } from './reminderSchedule';
import { nextOccurrence } from './recurrence';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

/**
 * Capacitor's permission states are a superset of the web Notification ones
 * (`prompt`/`prompt-with-rationale` vs. `default`). We cache the result so the
 * synchronous `notificationPermission()` API keeps working on native too.
 */
type NativePermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

const REMINDER_CHANNEL_ID = 'admh-reminders';
const REMINDER_SOURCE = 'admh-reminder';
const MAX_SCHEDULED_REMINDERS = 100;
let nativePermission: NativePermissionState = 'prompt';
let channelReady = false;
let watcherStarted = false;

function mapNativePermission(value: NativePermissionState): NotificationPermissionState {
  if (value === 'granted') return 'granted';
  if (value === 'denied') return 'denied';
  return 'default';
}

/** Stable positive 32-bit notification id for a string reminder id (Android needs an int). */
function notificationId(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 1) || 1;
}

async function loadNotifications() {
  return import('@capacitor/local-notifications');
}

async function ensureNativeChannel(): Promise<void> {
  if (channelReady) return;
  try {
    const { LocalNotifications } = await loadNotifications();
    const english = getSettings().locale === 'en';
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: english ? 'Follow-up reminders' : 'تذكيرات المتابعة',
      description: english ? 'Reminders you schedule inside the app.' : 'التذكيرات التي تُجدولها داخل التطبيق.',
      importance: 4,
      visibility: 1,
      vibration: true
    });
  } catch {
    /* The channel may already exist, or the native plugin is unavailable. */
  }
  channelReady = true;
}

async function loadReminders(): Promise<Reminder[]> {
  try {
    const { db } = await import('./db');
    return await db.reminders.toArray();
  } catch {
    return [];
  }
}

async function cancelNativeReminders(): Promise<void> {
  try {
    const { LocalNotifications } = await loadNotifications();
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications
      .filter((item) => (item.extra as { source?: string } | undefined)?.source === REMINDER_SOURCE)
      .map((item) => ({ id: item.id }));
    if (ids.length) await LocalNotifications.cancel({ notifications: ids });
  } catch {
    /* Notifications are best-effort. */
  }
}

/**
 * Mirror the upcoming reminders into Android local notifications.
 *
 * Native-only: on the web this resolves immediately, so callers can invoke it
 * unconditionally. Called automatically on native when reminders or the
 * notification setting change (see the watcher at the bottom of this file).
 */
export async function syncNativeReminders(reminders?: Reminder[]): Promise<void> {
  if (!isNative()) return;
  if (nativePermission !== 'granted' || !getSettings().notifications) {
    await cancelNativeReminders();
    return;
  }
  try {
    const { LocalNotifications } = await loadNotifications();
    await ensureNativeChannel();

    const rows = reminders ?? (await loadReminders());
    const now = Date.now();
    const planned = buildReminderSchedule(rows, now, MAX_SCHEDULED_REMINDERS);
    const desired = new Map<number, ScheduledReminder>();
    for (const entry of planned) desired.set(notificationId(entry.key), entry);

    const pending = await LocalNotifications.getPending();
    const pendingReminders = pending.notifications.filter(
      (item) => (item.extra as { source?: string } | undefined)?.source === REMINDER_SOURCE
    );
    const pendingById = new Map(pendingReminders.map((item) => [item.id, item]));

    const notifications = [];
    for (const [id, entry] of desired) {
      const pendingItem = pendingById.get(id);
      const pendingAt = (pendingItem?.extra as { dueAt?: number } | undefined)?.dueAt;
      const unchanged =
        pendingItem &&
        typeof pendingAt === 'number' &&
        Math.abs(pendingAt - entry.at) < 1000 &&
        pendingItem.title === entry.title &&
        pendingItem.body === entry.body;
      if (unchanged) continue;
      notifications.push({
        id,
        title: entry.title,
        body: entry.body,
        channelId: REMINDER_CHANNEL_ID,
        extra: {
          source: REMINDER_SOURCE,
          reminderId: entry.reminderId,
          dueAt: entry.at,
          occurrenceAt: entry.at
        },
        schedule: { at: new Date(entry.at), allowWhileIdle: true }
      });
    }

    const cancelIds = pendingReminders.filter((item) => !desired.has(item.id)).map((item) => ({ id: item.id }));

    if (cancelIds.length) await LocalNotifications.cancel({ notifications: cancelIds });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch {
    /* Reminder scheduling must never break the app. */
  }
}

async function showNativeReminder(reminder: Reminder, title: string, body?: string): Promise<boolean> {
  if (nativePermission !== 'granted') return false;
  try {
    const { LocalNotifications } = await loadNotifications();
    await ensureNativeChannel();
    // Omitting `schedule` makes Android/iOS deliver the notification immediately.
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId(`due:${reminder.id}:${Date.now()}`),
          title,
          body: body || reminder.note || reminder.display,
          channelId: REMINDER_CHANNEL_ID,
          extra: { source: 'admh-due', reminderId: reminder.id }
        }
      ]
    });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------- web API */

export function notificationsSupported(): boolean {
  if (isNative()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermissionState {
  if (isNative()) {
    if (nativePermission === 'granted' || nativePermission === 'denied') return mapNativePermission(nativePermission);
    // Before the async native probe finishes, trust the stored preference so the
    // switch does not appear "off" on every cold start.
    return getSettings().notifications ? 'granted' : 'default';
  }
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await loadNotifications();
      await ensureNativeChannel();
      const status = await LocalNotifications.requestPermissions();
      nativePermission = status.display;
      if (nativePermission === 'granted') void syncNativeReminders();
      return mapNativePermission(nativePermission);
    } catch {
      return 'unsupported';
    }
  }
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    return registration ?? null;
  } catch {
    return null;
  }
}

/** Show a local reminder notification (works while the app is open). */
export async function showReminderNotification(reminder: Reminder, title: string, body?: string): Promise<boolean> {
  if (isNative()) return showNativeReminder(reminder, title, body);
  if (notificationPermission() !== 'granted') return false;
  const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`;
  const options: NotificationOptions = {
    body: body || reminder.note || reminder.display,
    icon,
    badge: icon,
    tag: `admh-reminder-${reminder.id}`,
    data: { url: `${import.meta.env.BASE_URL}#/tools/reminders` },
    dir: 'rtl',
    lang: 'ar'
  };
  try {
    const registration = await getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }
  } catch {
    /* fall through to the page-level constructor */
  }
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export async function notifyDueReminders(reminders: Reminder[], title: string): Promise<number> {
  let shown = 0;
  const advanced: Reminder[] = [];
  for (const reminder of reminders) {
    const ok = await showReminderNotification(reminder, title, reminder.note || reminder.display);
    if (ok) {
      shown += 1;
      if (reminder.recurrence) advanced.push(reminder);
    }
  }
  // Keep the scheduled set in sync (past reminders are dropped, future ones kept).
  if (isNative()) void syncNativeReminders();
  if (advanced.length) {
    // Web fallback: move recurring reminders to their next occurrence after
    // the notification/sheet was shown, otherwise they stay "due" forever.
    const { updateReminder } = await import('./db');
    const now = Date.now();
    for (const reminder of advanced) {
      const next = nextOccurrence(reminder, now);
      await updateReminder(reminder.id, {
        lastNotifiedAt: now,
        missedAt: reminder.dueAt,
        missedCount: (reminder.missedCount ?? 0) + 1,
        ...(next === null ? { done: true } : { dueAt: next })
      });
    }
  }
  return shown;
}

/* ------------------------------------------------------- native initialisation */

async function startReminderWatcher(): Promise<void> {
  if (watcherStarted) return;
  watcherStarted = true;
  try {
    const [{ liveQuery }, { db }] = await Promise.all([import('dexie'), import('./db')]);
    liveQuery(() => db.reminders.toArray()).subscribe({
      next: (rows) => {
        void syncNativeReminders(rows as Reminder[]);
      }
    });
  } catch {
    /* IndexedDB unavailable — fall back to the manual sync calls. */
  }
  // React to the notifications toggle (cancel everything when it is turned off).
  subscribeSettings(() => {
    if (!getSettings().notifications) {
      void cancelNativeReminders();
      return;
    }
    void syncNativeReminders();
  });
}

async function probeNativeNotifications(): Promise<void> {
  try {
    await initNative();
    const { LocalNotifications } = await loadNotifications();
    const status = await LocalNotifications.checkPermissions();
    nativePermission = status.display;
    await ensureNativeChannel();
    await syncNativeReminders();
    await startReminderWatcher();
  } catch {
    /* Native plugins are unavailable: the web fallback above still works. */
  }
}

// `main.tsx` is owned by the app shell, so the native layer bootstraps itself
// when this module (imported by App) is evaluated. On the web this is a no-op.
if (isNative()) void probeNativeNotifications();
