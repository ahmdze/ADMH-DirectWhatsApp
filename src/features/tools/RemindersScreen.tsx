import { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmSheet, EmptyState, HintCard, IconButton, ScreenHeader, Segmented, Spinner } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useAllReminders, useActiveWorkspace, useWorkspaces } from '../../hooks/useData';
import { deleteReminder, updateReminder } from '../../lib/db';
import { goBack } from '../../lib/router';
import { useI18n } from '../../lib/i18n';
import { useSettings, updateSettings } from '../../lib/settings';
import { openReminderInCompose } from '../../lib/reminderActions';
import { workspaceDisplayName } from '../../lib/workspace';
import { isNativePlatform } from '../../lib/native-biometric';
import { hapticError, hapticSuccess, hapticTap } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { initials } from '../../lib/format';
import {
  notificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState
} from '../../lib/notifications';
import type { Reminder, Workspace } from '../../types';
import { ReminderEditorSheet } from './ReminderEditorSheet';

type StatusFilter = 'all' | 'due' | 'upcoming' | 'done';
type ScopeFilter = 'all' | 'active';
const PAGE_SIZE = 30;

function recurrenceLabel(reminder: Reminder, t: (ar: string, en: string) => string): string | null {
  if (!reminder.recurrence) return null;
  if (reminder.recurrence.kind === 'daily') {
    return reminder.recurrence.interval > 1
      ? `${t('كل', 'Every')} ${reminder.recurrence.interval} ${t('أيام', 'days')}`
      : t('يومي', 'Daily');
  }
  if (reminder.recurrence.kind === 'weekly') return t('أسبوعي', 'Weekly');
  return t('شهري', 'Monthly');
}

export function RemindersScreen() {
  const { t, n, date, time, rel, locale } = useI18n();
  const settings = useSettings();
  const activeWorkspace = useActiveWorkspace();
  const workspaces = useWorkspaces();
  const reminderRows = useAllReminders();
  const loading = reminderRows === undefined;
  const reminders = reminderRows ?? [];

  const [now, setNow] = useState(() => Date.now());
  const [scope, setScope] = useState<ScopeFilter>('active');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>(() => notificationPermission());
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [scope, status, query]);

  const workspaceMap = useMemo(() => {
    const map = new Map<string, Workspace>();
    for (const workspace of workspaces) map.set(workspace.id, workspace);
    return map;
  }, [workspaces]);

  const workspaceName = (id: string): string => {
    const workspace = workspaceMap.get(id);
    return workspace ? workspaceDisplayName(workspace, t, locale) : t('مساحة محذوفة', 'Deleted workspace');
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reminders
      .filter((reminder) => (scope === 'active' ? reminder.workspaceId === activeWorkspace?.id : true))
      .filter((reminder) => {
        if (status === 'done') return reminder.done;
        if (reminder.done) return false;
        if (status === 'due') return reminder.dueAt <= now;
        if (status === 'upcoming') return reminder.dueAt > now;
        return true;
      })
      .filter((reminder) => {
        if (!term) return true;
        return [reminder.label, reminder.display, reminder.message || '', reminder.note || '']
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => left.dueAt - right.dueAt);
  }, [reminders, scope, activeWorkspace?.id, status, now, query]);

  const visible = filtered.slice(0, limit);
  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (reminder: Reminder) => {
    setEditing(reminder);
    setEditorOpen(true);
  };

  const requestNotifications = async () => {
    if (notifBusy) return;
    setNotifBusy(true);
    const result = await requestNotificationPermission();
    setNotifBusy(false);
    setPermission(result);
    if (result === 'granted') {
      updateSettings({ notifications: true });
      hapticSuccess();
      toast(t('تم تفعيل إشعارات التذكير.', 'Reminder notifications enabled.'), 'success');
      return;
    }
    hapticError();
    toast(
      result === 'denied'
        ? t('رفض المتصفح إذن الإشعارات. يمكن السماح به من إعدادات التطبيق.', 'Notification permission was denied. You can allow it from app settings.')
        : t('لم يُمنح إذن الإشعارات.', 'Notification permission was not granted.'),
      'error'
    );
  };

  const openNow = async (reminder: Reminder) => {
    hapticTap();
    await openReminderInCompose(reminder.id);
  };

  const toggleDone = async (reminder: Reminder) => {
    try {
      await updateReminder(reminder.id, { done: !reminder.done });
      hapticSuccess();
      toast(reminder.done ? t('أُعيد فتح التذكير', 'Reminder reopened') : t('تم إنجاز التذكير', 'Reminder completed'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر تحديث التذكير', 'Could not update the reminder'), 'error');
    }
  };

  const snooze = async (reminder: Reminder) => {
    try {
      await updateReminder(reminder.id, { dueAt: Date.now() + 60 * 60 * 1000 });
      hapticSuccess();
      toast(t('تم تأجيل التذكير ساعة.', 'Reminder snoozed for one hour.'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر تأجيل التذكير', 'Could not snooze the reminder'), 'error');
    }
  };

  const ignore = async (reminder: Reminder) => {
    try {
      await updateReminder(reminder.id, { done: true, missedAt: reminder.dueAt });
      hapticSuccess();
      toast(t('تم تجاهل التذكير.', 'Reminder ignored.'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر تجاهل التذكير', 'Could not ignore the reminder'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReminder(deleteId);
      hapticSuccess();
      toast(t('تم حذف التذكير', 'Reminder deleted'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر حذف التذكير', 'Could not delete the reminder'), 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const showNotificationsInvite = !settings.notifications || permission !== 'granted';
  const deleteTarget = reminders.find((reminder) => reminder.id === deleteId) ?? null;

  if (loading) {
    return (
      <div className="screen">
        <ScreenHeader title={t('التذكيرات', 'Reminders')} onBack={() => goBack()} />
        <div className="glass card" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={26} />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={t('التذكيرات', 'Reminders')}
        subtitle={t('تابع عملاءك في الوقت المناسب — بلا إرسال تلقائي.', 'Follow up at the right time — no automatic sending.')}
        onBack={() => goBack()}
        action={<IconButton name="plus" label={t('تذكير جديد', 'New reminder')} onClick={openNew} variant="accent" />}
      />

      {showNotificationsInvite ? (
        <HintCard icon="bell">
          <div className="row-between" style={{ gap: 10 }}>
            <span style={{ fontSize: 12 }}>
              {isNativePlatform()
                ? t('فعّل الإشعارات لتصلك التذكيرات في الخلفية على Android.', 'Enable notifications to receive reminders in the background on Android.')
                : t('تظهر التذكيرات عند فتح التطبيق. فعّل الإشعارات لتصلك أثناء فتح التطبيق.', 'Reminders appear when you open the app. Enable notifications to see them while it is open.')}
            </span>
            <Button size="sm" variant="soft" loading={notifBusy} onClick={() => void requestNotifications()}>
              {t('تفعيل', 'Enable')}
            </Button>
          </div>
        </HintCard>
      ) : null}

      <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <div className="grow" style={{ position: 'relative' }}>
            <Icon
              name="search"
              size={16}
              style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            />
            <input
              className="control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('ابحث في التذكيرات…', 'Search reminders…')}
              style={{ paddingInlineStart: 38 }}
            />
          </div>
        </div>
        <Segmented
          value={scope}
          options={[
            { value: 'active', label: t('المساحة الحالية', 'Current workspace') },
            { value: 'all', label: t('كل المساحات', 'All workspaces') }
          ]}
          onChange={(value) => setScope(value as ScopeFilter)}
        />
        <Segmented
          value={status}
          options={[
            { value: 'all', label: t('الكل', 'All') },
            { value: 'due', label: t('مستحق', 'Due') },
            { value: 'upcoming', label: t('قادم', 'Upcoming') },
            { value: 'done', label: t('مكتمل', 'Done') }
          ]}
          onChange={(value) => setStatus(value as StatusFilter)}
        />
      </div>

      {visible.length ? (
        <div className="col" style={{ gap: 8 }}>
          {visible.map((reminder) => {
            const overdue = !reminder.done && reminder.dueAt <= now;
            const recurrence = recurrenceLabel(reminder, t);
            return (
              <div
                className="glass card"
                key={reminder.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 13,
                  borderColor: overdue ? 'var(--danger)' : undefined,
                  opacity: reminder.done ? 0.72 : 1
                }}
              >
                <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <span
                    className="avatar"
                    style={{ background: overdue ? 'var(--danger-soft)' : undefined, color: overdue ? 'var(--danger)' : undefined }}
                  >
                    {initials(reminder.label)}
                  </span>
                  <div className="list-main" style={{ gap: 3 }}>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <span className="list-title">{reminder.label}</span>
                      {overdue ? <span className="badge danger">{t('فات', 'Missed')}</span> : null}
                      <span className="badge">{workspaceName(reminder.workspaceId)}</span>
                      {recurrence ? <span className="badge accent">{recurrence}</span> : null}
                    </div>
                    <span className="list-sub sensitive" dir="ltr">
                      {reminder.display}
                    </span>
                    {reminder.message || reminder.note ? (
                      <span className="list-sub" style={{ whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {reminder.message || reminder.note}
                      </span>
                    ) : null}
                    <span className="list-sub" style={{ color: overdue ? 'var(--danger)' : undefined, whiteSpace: 'normal' }}>
                      {date(reminder.dueAt)} · {time(reminder.dueAt)} · {rel(reminder.dueAt)}
                      {overdue && reminder.missedCount ? ` · ${t('مرات الفوات', 'Missed')}: ${n(reminder.missedCount)}` : ''}
                    </span>
                  </div>
                  <div className="list-actions">
                    <IconButton name="whatsapp" label={t('فتح المحادثة', 'Open chat')} variant="plain" onClick={() => void openNow(reminder)} />
                    <IconButton name="edit" label={t('تعديل التذكير', 'Edit reminder')} variant="plain" onClick={() => openEdit(reminder)} />
                    <IconButton
                      name={reminder.done ? 'refresh' : 'check'}
                      label={reminder.done ? t('إرجاع التذكير', 'Reopen reminder') : t('إنجاز التذكير', 'Complete reminder')}
                      variant="plain"
                      onClick={() => void toggleDone(reminder)}
                    />
                    <IconButton name="trash" label={t('حذف التذكير', 'Delete reminder')} variant="plain" onClick={() => setDeleteId(reminder.id)} />
                  </div>
                </div>
                {overdue ? (
                  <div className="row" style={{ gap: 8, paddingInlineStart: 42 }}>
                    <Button size="sm" variant="soft" onClick={() => void snooze(reminder)}>
                      {t('تأجيل ساعة', 'Snooze 1h')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void ignore(reminder)}>
                      {t('تجاهل', 'Ignore')}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {filtered.length > visible.length ? (
            <Button variant="soft" block onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              {t('عرض المزيد', 'Show more')}
            </Button>
          ) : null}
        </div>
      ) : (
        <EmptyState
          icon="bell"
          title={reminders.length ? t('لا توجد تذكيرات مطابقة', 'No matching reminders') : t('لا توجد تذكيرات بعد', 'No reminders yet')}
          description={
            reminders.length
              ? t('جرّب تغيير الفلتر أو البحث.', 'Try changing the filter or search.')
              : t('أنشئ تذكيراً لمتابعة عميل لاحقاً.', 'Create a reminder to follow up with a client later.')
          }
          action={
            <Button variant="primary" onClick={openNew}>
              <Icon name="plus" size={16} />
              {t('تذكير جديد', 'New reminder')}
            </Button>
          }
        />
      )}

      <HintCard icon="shield">
        {t(
          'التذكيرات محلية فقط، ولا تُرسل رسائل تلقائياً. فتح التذكير يجهّز شاشة الإرسال وأنت من يرسل.',
          'Reminders are local only and never send messages automatically. Opening one prepares Compose; you still send.'
        )}
      </HintCard>

      <ReminderEditorSheet
        open={editorOpen}
        reminder={editing}
        defaultWorkspaceId={activeWorkspace?.id || 'personal'}
        onClose={() => setEditorOpen(false)}
        onSaved={() => setEditorOpen(false)}
        onDelete={
          editing
            ? () => {
                setDeleteId(editing.id);
                setEditorOpen(false);
              }
            : undefined
        }
      />

      <ConfirmSheet
        open={deleteId !== null}
        danger
        title={t('حذف التذكير؟', 'Delete reminder?')}
        description={
          deleteTarget
            ? t(`سيُحذف تذكير «${deleteTarget.label}» نهائياً.`, `The reminder for “${deleteTarget.label}” will be deleted permanently.`)
            : t('سيُحذف هذا التذكير نهائياً.', 'This reminder will be deleted permanently.')
        }
        confirmLabel={t('حذف', 'Delete')}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
