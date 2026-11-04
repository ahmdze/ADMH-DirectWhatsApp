import { useEffect, useState } from 'react';
import { Button, ConfirmSheet, EmptyState, Field, HintCard, IconButton, ScreenHeader, Segmented, Sheet } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack } from '../../lib/router';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useActiveWorkspace, useDestinations, useReminders } from '../../hooks/useData';
import { addReminder, deleteReminder, updateReminder } from '../../lib/db';
import { formatPhone, parseTarget } from '../../lib/phone';
import { initials } from '../../lib/format';
import { useSettings, updateSettings } from '../../lib/settings';
import {
  notificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState
} from '../../lib/notifications';
import type { Destination, Reminder, TargetType } from '../../types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function defaultDueValue(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function destinationDisplay(destination: Destination): string {
  return destination.type === 'phone' ? formatPhone(destination.phone || '') : '@' + (destination.username || '');
}

function ReminderRow({
  reminder,
  now,
  onToggle,
  onDelete
}: {
  reminder: Reminder;
  now: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t, date, time, rel } = useI18n();
  const overdue = !reminder.done && reminder.dueAt <= now;
  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <span className="avatar">{initials(reminder.label)}</span>
      <div className="list-main" style={{ gap: 3 }}>
        <span className="list-title">{reminder.label}</span>
        <span className="list-sub sensitive" dir="ltr">
          {reminder.display}
        </span>
        {reminder.note ? (
          <span className="list-sub" style={{ whiteSpace: 'normal' }}>
            {reminder.note}
          </span>
        ) : null}
        <span className="list-sub" style={{ color: overdue ? 'var(--danger)' : undefined }}>
          {date(reminder.dueAt)} · {time(reminder.dueAt)} · {rel(reminder.dueAt)}
        </span>
      </div>
      <div className="list-actions">
        <IconButton
          name={reminder.done ? 'refresh' : 'check'}
          label={reminder.done ? t('إرجاع التذكير', 'Reopen reminder') : t('إنجاز التذكير', 'Complete reminder')}
          variant="plain"
          onClick={onToggle}
        />
        <IconButton name="trash" label={t('حذف التذكير', 'Delete reminder')} variant="plain" onClick={onDelete} />
      </div>
    </div>
  );
}

export function RemindersScreen() {
  const { t, n, phoneError } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const reminders = useReminders(workspace?.id);

  const [now, setNow] = useState(() => Date.now());
  const [composerOpen, setComposerOpen] = useState(false);
  const [source, setSource] = useState<'saved' | 'manual'>('saved');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [dueInput, setDueInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>(() => notificationPermission());
  const [notifBusy, setNotifBusy] = useState(false);

  const showNotificationsInvite = !settings.notifications || permission !== 'granted';

  const enableNotifications = async () => {
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
        ? t(
            'رفض المتصفح إذن الإشعارات. يمكنك السماح به من إعدادات الموقع في المتصفح.',
            'The browser denied notification permission. You can allow it from the browser site settings.'
          )
        : result === 'unsupported'
          ? t('هذا المتصفح لا يدعم الإشعارات.', 'This browser does not support notifications.')
          : t('لم يُمنح إذن الإشعارات.', 'Notification permission was not granted.'),
      'error'
    );
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const due = reminders.filter((reminder) => !reminder.done && reminder.dueAt <= now);
  const upcoming = reminders.filter((reminder) => !reminder.done && reminder.dueAt > now);
  const completed = reminders.filter((reminder) => reminder.done);
  const deleteTarget = reminders.find((reminder) => reminder.id === deleteId) ?? null;

  const openComposer = () => {
    setSource(destinations.length ? 'saved' : 'manual');
    setSelectedId(destinations[0]?.id ?? null);
    setManualInput('');
    setManualError('');
    setDueInput(defaultDueValue());
    setNote('');
    setComposerOpen(true);
  };

  const saveReminder = async () => {
    if (!workspace) {
      toast(t('لا توجد مساحة عمل نشطة.', 'No active workspace.'), 'error');
      return;
    }
    let type: TargetType;
    let value: string;
    let label: string;
    let display: string;
    if (source === 'saved') {
      const destination = destinations.find((item) => item.id === selectedId);
      if (!destination) {
        toast(t('اختر وجهة محفوظة أولاً.', 'Pick a saved destination first.'), 'error');
        return;
      }
      type = destination.type;
      value = destination.type === 'phone' ? destination.phone || '' : destination.username || '';
      label = destination.label;
      display = destinationDisplay(destination);
    } else {
      const parsed = parseTarget(manualInput, { country: settings.defaultCountry });
      if (!parsed.ok) {
        setManualError(phoneError(parsed.code));
        hapticError();
        return;
      }
      type = parsed.target.type;
      value = parsed.target.value;
      label = parsed.target.display;
      display = parsed.target.display;
    }
    if (!value) {
      toast(t('تعذّر تحديد وجهة صالحة للتذكير.', 'Could not resolve a valid target for the reminder.'), 'error');
      return;
    }
    const dueAt = new Date(dueInput).getTime();
    if (!dueInput || Number.isNaN(dueAt)) {
      toast(t('اختر موعداً صالحاً للتذكير.', 'Pick a valid reminder time.'), 'error');
      return;
    }
    setSaving(true);
    try {
      await addReminder({
        workspaceId: workspace.id,
        fingerprint: `${type}:${value}`,
        label,
        display,
        note: note.trim() || undefined,
        dueAt
      });
      setComposerOpen(false);
      hapticSuccess();
      toast(t('تمت إضافة التذكير', 'Reminder added'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر إضافة التذكير', 'Could not add the reminder'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (reminder: Reminder) => {
    try {
      await updateReminder(reminder.id, { done: !reminder.done });
      hapticSuccess();
      toast(
        reminder.done ? t('أُعيد فتح التذكير', 'Reminder reopened') : t('تم إنجاز التذكير', 'Reminder completed'),
        'success'
      );
    } catch {
      hapticError();
      toast(t('تعذّر تحديث التذكير', 'Could not update the reminder'), 'error');
    }
  };

  const removeReminder = async () => {
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

  return (
    <div className="screen">
      <ScreenHeader
        title={t('التذكيرات', 'Reminders')}
        subtitle={t('تذكيرات متابعة تُعرض داخل التطبيق عند فتحه.', 'Follow-up reminders shown inside the app when you open it.')}
        onBack={() => goBack()}
        action={<IconButton name="plus" label={t('تذكير جديد', 'New reminder')} onClick={openComposer} variant="accent" />}
      />

      <HintCard icon="bell">
        {t(
          'تظهر التذكيرات عند فتح التطبيق فقط — لا نعتمد على إشعارات خلفية موثوقة في PWA. افتح التطبيق عند الموعد لمتابعة تذكيراتك.',
          'Reminders appear only when you open the app — background notifications are not reliable in a PWA. Open the app at the due time to see your reminders.'
        )}
      </HintCard>

      {showNotificationsInvite ? (
        <section className="glass card col" style={{ gap: 9 }}>
          <div className="section-head">
            <h2 className="section-title">{t('إشعارات التذكير', 'Reminder notifications')}</h2>
            <span className={`badge ${permission === 'granted' ? 'accent' : ''}`}>
              <Icon name={permission === 'granted' ? 'check' : 'bell'} size={11} />
              {permission === 'granted'
                ? t('الإذن ممنوح', 'Permission granted')
                : permission === 'denied'
                  ? t('الإذن مرفوض', 'Permission denied')
                  : permission === 'unsupported'
                    ? t('غير مدعوم', 'Unsupported')
                    : t('الإذن غير مطلوب', 'Not requested')}
            </span>
          </div>
          <p className="page-sub" style={{ margin: 0 }}>
            {t(
              'فعّل الإشعارات لتصلك تنبيهات التذكيرات المستحقة أثناء استخدام التطبيق.',
              'Enable notifications to get alerted about due reminders while you use the app.'
            )}
          </p>
          <Button
            variant="soft"
            block
            loading={notifBusy}
            disabled={notifBusy || permission === 'unsupported'}
            onClick={() => void enableNotifications()}
          >
            <Icon name="bell" size={16} />
            {t('تفعيل إشعارات التذكير', 'Enable reminder notifications')}
          </Button>
          <p className="text-muted" style={{ margin: 0, fontSize: 11, lineHeight: 1.6 }}>
            {permission === 'unsupported'
              ? t(
                  'هذا المتصفح لا يدعم الإشعارات؛ ستبقى التذكيرات ظاهرة داخل التطبيق فقط.',
                  'This browser does not support notifications; reminders stay visible inside the app only.'
                )
              : t(
                  'تظهر الإشعارات عند فتح التطبيق أو استخدامه فقط؛ لا توجد إشعارات خلفية.',
                  'Notifications appear only when the app is open or in use; there are no background notifications.'
                )}
          </p>
          {permission === 'denied' ? (
            <p className="field-error" style={{ margin: 0 }} role="status">
              {t(
                'الإذن مرفوض. اسمح بالإشعارات من إعدادات الموقع في المتصفح ثم أعد المحاولة.',
                'Permission is denied. Allow notifications from the browser site settings, then try again.'
              )}
            </p>
          ) : null}
        </section>
      ) : null}

      {reminders.length > 0 ? (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="badge accent">
            <Icon name="bell" size={11} /> {t('مستحقة', 'Due')}: {n(due.length)}
          </span>
          <span className="badge">
            {t('قادمة', 'Upcoming')}: {n(upcoming.length)}
          </span>
          <span className="badge">
            {t('منتهية', 'Done')}: {n(completed.length)}
          </span>
        </div>
      ) : null}

      {reminders.length === 0 ? (
        <EmptyState
          icon="bell"
          title={t('لا توجد تذكيرات بعد', 'No reminders yet')}
          description={t(
            'أضف تذكيراً لوجهة محفوظة أو لرقم يدوي، وسيظهر هنا عندما يحين موعده وتفتح التطبيق.',
            'Add a reminder for a saved destination or a manual number; it appears here when due and you open the app.'
          )}
          action={
            <Button variant="primary" onClick={openComposer}>
              <Icon name="plus" size={16} />
              {t('تذكير جديد', 'New reminder')}
            </Button>
          }
        />
      ) : (
        <>
          {due.length > 0 ? (
            <section className="glass card col" style={{ gap: 8 }}>
              <div className="section-head">
                <h2 className="section-title" style={{ color: 'var(--danger)' }}>
                  {t('مستحقة الآن', 'Due now')}
                </h2>
                <span className="badge" style={{ color: 'var(--danger)' }}>
                  {n(due.length)}
                </span>
              </div>
              <div className="list">
                {due.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    now={now}
                    onToggle={() => void toggleDone(reminder)}
                    onDelete={() => setDeleteId(reminder.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {upcoming.length > 0 ? (
            <section className="glass card col" style={{ gap: 8 }}>
              <div className="section-head">
                <h2 className="section-title">{t('قادمة', 'Upcoming')}</h2>
                <span className="badge accent">{n(upcoming.length)}</span>
              </div>
              <div className="list">
                {upcoming.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    now={now}
                    onToggle={() => void toggleDone(reminder)}
                    onDelete={() => setDeleteId(reminder.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {completed.length > 0 ? (
            <section className="glass card col" style={{ gap: 8 }}>
              <div className="section-head">
                <h2 className="section-title">{t('منتهية', 'Done')}</h2>
                <span className="badge">{n(completed.length)}</span>
              </div>
              <div className="list">
                {completed.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    now={now}
                    onToggle={() => void toggleDone(reminder)}
                    onDelete={() => setDeleteId(reminder.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Button variant="soft" block onClick={openComposer}>
        <Icon name="plus" size={17} />
        {t('إضافة تذكير', 'Add reminder')}
      </Button>

      <Sheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title={t('تذكير جديد', 'New reminder')}
        subtitle={t('اختر وجهة وموعداً، وأضف ملاحظة إن أردت.', 'Pick a destination and a time, and add a note if you like.')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void saveReminder()}>
              {t('حفظ التذكير', 'Save reminder')}
            </Button>
          </>
        }
      >
        <Segmented
          value={source}
          options={[
            { value: 'saved', label: t('وجهة محفوظة', 'Saved destination') },
            { value: 'manual', label: t('إدخال يدوي', 'Manual entry') }
          ]}
          onChange={(next) => {
            setSource(next);
            setManualError('');
          }}
        />

        {source === 'saved' ? (
          destinations.length === 0 ? (
            <p className="page-sub" style={{ margin: 0 }}>
              {t('لا توجد وجهات محفوظة بعد. استخدم الإدخال اليدوي.', 'No saved destinations yet. Use manual entry.')}
            </p>
          ) : (
            <div className="list" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {destinations.map((destination) => {
                const selected = destination.id === selectedId;
                return (
                  <button
                    key={destination.id}
                    type="button"
                    className="list-row"
                    aria-pressed={selected}
                    style={{ width: '100%', textAlign: 'start', background: selected ? 'var(--accent-soft)' : undefined }}
                    onClick={() => setSelectedId(destination.id)}
                  >
                    <span className="avatar">{initials(destination.label)}</span>
                    <span className="list-main">
                      <span className="list-title">{destination.label}</span>
                      <span className="list-sub sensitive" dir="ltr">
                        {destinationDisplay(destination)}
                      </span>
                    </span>
                    <Icon name={selected ? 'check' : 'plus'} size={17} style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }} />
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <Field
            label={t('الرقم أو اسم المستخدم', 'Number or username')}
            error={manualError || undefined}
            hint={t('رقم هاتف محلي أو دولي، أو @اسم مستخدم.', 'A local or international phone number, or @username.')}
          >
            <input
              className={`control ${manualError ? 'error' : ''}`}
              dir="ltr"
              value={manualInput}
              aria-label={t('الرقم أو اسم المستخدم', 'Number or username')}
              placeholder="+964 7XX XXX XXXX"
              onChange={(event) => {
                setManualInput(event.target.value);
                if (manualError) setManualError('');
              }}
            />
          </Field>
        )}

        <Field label={t('الموعد', 'When')} hint={t('بتوقيت جهازك المحلي.', 'In your device local time.')}>
          <input
            type="datetime-local"
            className="control"
            dir="ltr"
            value={dueInput}
            aria-label={t('الموعد', 'When')}
            onChange={(event) => setDueInput(event.target.value)}
          />
        </Field>

        <Field label={t('ملاحظة (اختياري)', 'Note (optional)')} counter={`${n(note.length)}/200`}>
          <textarea
            className="control"
            value={note}
            maxLength={200}
            aria-label={t('ملاحظة (اختياري)', 'Note (optional)')}
            placeholder={t('مثال: تذكير بموعد التسليم', 'Example: remind about the delivery appointment')}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <HintCard icon="info">
          {t(
            'التذكير يُحفظ على جهازك فقط، ويظهر في قائمة «مستحقة الآن» عند فتح التطبيق بعد الموعد.',
            'The reminder is stored only on your device and appears under “Due now” when you open the app after it is due.'
          )}
        </HintCard>
      </Sheet>

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
        onConfirm={() => void removeReminder()}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
