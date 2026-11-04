import type { Reminder } from '../types';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
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
  for (const reminder of reminders) {
    const ok = await showReminderNotification(reminder, title, reminder.note || reminder.display);
    if (ok) shown += 1;
  }
  return shown;
}
