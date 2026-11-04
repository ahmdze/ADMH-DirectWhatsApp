import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Field, HintCard, Segmented, Sheet } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useDestinations, useTemplates, useWorkspaces } from '../../hooks/useData';
import { addReminder, updateReminder } from '../../lib/db';
import { applyTemplate, localizedTemplate } from '../../lib/template';
import { formatPhone, parseTarget } from '../../lib/phone';
import { formatDate } from '../../lib/format';
import { nextOccurrence } from '../../lib/recurrence';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { useSettings } from '../../lib/settings';
import type { Destination, Reminder, ReminderRecurrence } from '../../types';

type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly';
type SourceKind = 'saved' | 'manual';

interface ReminderEditorSheetProps {
  open: boolean;
  reminder?: Reminder | null;
  defaultWorkspaceId: string;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const MAX_MESSAGE = 2000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateInput(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeInput(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultsDue(): number {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return date.getTime();
}

function displayOf(destination: Destination): string {
  return destination.type === 'phone' ? formatPhone(destination.phone || '') : `@${destination.username || ''}`;
}

function fingerprintOf(destination: Destination): string {
  return `${destination.type}:${destination.type === 'phone' ? destination.phone || '' : destination.username || ''}`;
}

export function ReminderEditorSheet({
  open,
  reminder,
  defaultWorkspaceId,
  onClose,
  onSaved,
  onDelete
}: ReminderEditorSheetProps) {
  const { t, n, locale, date, time, phoneError } = useI18n();
  const settings = useSettings();
  const workspaces = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId);
  const [source, setSource] = useState<SourceKind>('saved');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [label, setLabel] = useState('');
  const [dueDate, setDueDate] = useState(dateInput(defaultsDue()));
  const [dueTime, setDueTime] = useState(timeInput(defaultsDue()));
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [kind, setKind] = useState<RecurrenceKind>('none');
  const [dailyInterval, setDailyInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [untilDate, setUntilDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const destinations = useDestinations(workspaceId);
  const templates = useTemplates(workspaceId);
  const selectedDestination = destinations.find((item) => item.id === selectedId) ?? null;

  // Initialise on open / when switching the reminder being edited.
  useEffect(() => {
    if (!open) return;
    const nextWorkspace = reminder?.workspaceId || defaultWorkspaceId;
    const initialDue = reminder?.dueAt || defaultsDue();
    setWorkspaceId(nextWorkspace);
    setLabel(reminder?.label || '');
    setDueDate(dateInput(initialDue));
    setDueTime(timeInput(initialDue));
    setMessage(reminder?.message || '');
    setTemplateId(reminder?.templateId || '');
    setKind(reminder?.recurrence?.kind || 'none');
    setUntilDate('');
    setError('');
    setSource('saved');
    setSelectedId(null);
    setManualInput('');
    if (reminder?.recurrence?.kind === 'daily') setDailyInterval(Math.max(1, reminder.recurrence.interval || 1));
    else setDailyInterval(1);
    if (reminder?.recurrence?.kind === 'weekly') setWeekdays(reminder.recurrence.weekdays);
    else setWeekdays([]);
    if (reminder?.recurrence?.kind === 'monthly') setMonthlyDay(reminder.recurrence.day);
    else setMonthlyDay(1);
    if (reminder?.recurrence?.until) setUntilDate(dateInput(reminder.recurrence.until));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reminder?.id, defaultWorkspaceId]);

  // Resolve the saved destination once the workspace rows are available.
  useEffect(() => {
    if (!open) return;
    if (reminder) {
      const matched = destinations.find((item) => fingerprintOf(item) === reminder.fingerprint);
      if (matched) {
        setSource('saved');
        setSelectedId(matched.id);
        if (!label) setLabel(matched.label);
      } else {
        setSource('manual');
        setManualInput(reminder.display);
      }
      return;
    }
    if (destinations.length) {
      setSource('saved');
      setSelectedId((current) => (current && destinations.some((item) => item.id === current) ? current : destinations[0].id));
    } else {
      setSource('manual');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reminder?.id, destinations.length, workspaceId]);

  const targetLabel = source === 'saved' ? selectedDestination?.label || '' : label;
  const targetDisplay =
    source === 'saved' && selectedDestination ? displayOf(selectedDestination) : manualInput.trim();

  const recurrence = useMemo<ReminderRecurrence | undefined>(() => {
    const until = untilDate ? new Date(`${untilDate}T23:59:59`).getTime() : undefined;
    if (until !== undefined && !Number.isFinite(until)) return undefined;
    if (kind === 'daily') {
      return { kind: 'daily', interval: Math.max(1, Math.min(365, Math.floor(dailyInterval || 1))), until };
    }
    if (kind === 'weekly') {
      return { kind: 'weekly', weekdays: [...new Set(weekdays)].sort(), until };
    }
    if (kind === 'monthly') {
      return { kind: 'monthly', day: Math.max(1, Math.min(31, Math.floor(monthlyDay || 1))), until };
    }
    return undefined;
  }, [kind, dailyInterval, weekdays, monthlyDay, untilDate]);

  const dueAt = new Date(`${dueDate}T${dueTime || '09:00'}`).getTime();
  const preview = useMemo(() => {
    if (!Number.isFinite(dueAt)) return [] as number[];
    const result: number[] = [];
    let cursor: number | null = dueAt;
    for (let index = 0; index < 3 && cursor; index += 1) {
      result.push(cursor);
      cursor = recurrence ? nextOccurrence({ dueAt: cursor, recurrence }, cursor) : null;
    }
    return result;
  }, [dueAt, recurrence]);

  const changeTemplate = (nextId: string) => {
    setTemplateId(nextId);
    if (!nextId) return;
    const template = templates.find((item) => item.id === nextId);
    if (!template) return;
    const body = localizedTemplate(template, t).body;
    const resolved = applyTemplate(body, {
      name: targetLabel || undefined,
      company: targetDisplay || undefined,
      date: formatDate(Date.now(), locale)
    });
    setMessage(resolved.slice(0, MAX_MESSAGE));
  };

  const save = async () => {
    setError('');
    let type: 'phone' | 'username';
    let value: string;
    let display: string;
    let finalLabel: string;

    if (source === 'saved') {
      if (!selectedDestination) {
        setError(t('اختر وجهة محفوظة أولاً.', 'Pick a saved destination first.'));
        hapticError();
        return;
      }
      type = selectedDestination.type;
      value = selectedDestination.type === 'phone' ? selectedDestination.phone || '' : selectedDestination.username || '';
      display = displayOf(selectedDestination);
      finalLabel = label.trim() || selectedDestination.label;
    } else {
      const parsed = parseTarget(manualInput, { country: settings.defaultCountry });
      if (!parsed.ok) {
        setError(phoneError(parsed.code));
        hapticError();
        return;
      }
      type = parsed.target.type;
      value = parsed.target.value;
      display = parsed.target.display;
      finalLabel = label.trim() || parsed.target.display;
    }

    if (!value || !finalLabel) {
      setError(t('أدخل اسماً ووجهة صالحة.', 'Enter a valid name and destination.'));
      hapticError();
      return;
    }
    if (!Number.isFinite(dueAt)) {
      setError(t('اختر تاريخاً ووقتاً صالحين.', 'Pick a valid date and time.'));
      hapticError();
      return;
    }
    if (recurrence?.kind === 'weekly' && recurrence.weekdays.length === 0) {
      setError(t('اختر يوماً واحداً على الأقل للتكرار الأسبوعي.', 'Pick at least one weekday.'));
      hapticError();
      return;
    }
    if (recurrence?.until && recurrence.until < dueAt) {
      setError(t('تاريخ التوقف يجب أن يكون بعد الموعد.', 'The end date must be after the reminder time.'));
      hapticError();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        workspaceId,
        fingerprint: `${type}:${value}`,
        label: finalLabel,
        display,
        note: reminder?.note,
        dueAt,
        message: message.trim() ? message.trim().slice(0, MAX_MESSAGE) : undefined,
        templateId: templateId || undefined,
        recurrence
      };
      if (reminder) await updateReminder(reminder.id, payload);
      else await addReminder(payload);
      if (settings.haptics) hapticSuccess();
      toast(reminder ? t('تم تحديث التذكير.', 'Reminder updated.') : t('تمت إضافة التذكير.', 'Reminder added.'), 'success');
      onSaved();
      onClose();
    } catch {
      if (settings.haptics) hapticError();
      setError(t('تعذّر حفظ التذكير. حاول مرة أخرى.', 'Could not save the reminder. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const workspaceOptions = workspaces.length
    ? workspaces
    : [{ id: workspaceId, name: t('شخصي', 'Personal'), nameEn: 'Personal' }];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reminder ? t('تعديل التذكير', 'Edit reminder') : t('تذكير جديد', 'New reminder')}
      subtitle={t('يُحفظ محلياً ويظهر في وقته.', 'Stored locally and shown when due.')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            {t('حفظ', 'Save')}
          </Button>
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <Field label={t('مساحة العمل', 'Workspace')}>
          <select
            className="control"
            value={workspaceId}
            onChange={(event) => {
              setWorkspaceId(event.target.value);
              setSelectedId(null);
              setTemplateId('');
            }}
          >
            {workspaceOptions.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.id === 'personal' ? t('شخصي', 'Personal') : workspace.id === 'work' ? t('عمل', 'Work') : workspace.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('الوجهة', 'Destination')}>
          <Segmented
            value={source}
            options={[
              { value: 'saved', label: t('محفوظة', 'Saved') },
              { value: 'manual', label: t('يدوية', 'Manual') }
            ]}
            onChange={(value) => setSource(value)}
          />
          {source === 'saved' ? (
            destinations.length ? (
              <select
                className="control"
                value={selectedId ?? ''}
                onChange={(event) => {
                  setSelectedId(event.target.value || null);
                  const next = destinations.find((item) => item.id === event.target.value);
                  if (next) setLabel(next.label);
                }}
              >
                <option value="">{t('اختر وجهة…', 'Choose a destination…')}</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.label} · {displayOf(destination)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="field-hint">{t('لا توجد وجهات محفوظة في هذه المساحة.', 'No saved destinations in this workspace.')}</p>
            )
          ) : (
            <input
              className="control"
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder={t('رقم أو @اسم مستخدم', 'Phone or @username')}
              dir="ltr"
            />
          )}
        </Field>

        <Field label={t('العنوان', 'Title')} counter={`${label.length}/80`}>
          <input
            className="control"
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 80))}
            placeholder={t('مثال: متابعة طلب', 'e.g. Follow up order')}
          />
        </Field>

        <div className="grid-2">
          <Field label={t('التاريخ', 'Date')}>
            <input className="control" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
          <Field label={t('الوقت', 'Time')}>
            <input className="control" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
          </Field>
        </div>

        <Field label={t('الرسالة (اختياري)', 'Message (optional)')} counter={`${n(message.length)}/${n(MAX_MESSAGE)}`}>
          <textarea
            className="control"
            value={message}
            maxLength={MAX_MESSAGE}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('نص جاهز يُفتح في واتساب', 'Text prepared for WhatsApp')}
            rows={4}
          />
        </Field>

        <Field label={t('قالب رسالة (اختياري)', 'Message template (optional)')}>
          <select className="control" value={templateId} onChange={(event) => changeTemplate(event.target.value)}>
            <option value="">{t('بدون قالب', 'No template')}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {localizedTemplate(template, t).title}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('التكرار', 'Repeat')}>
          <Segmented
            value={kind}
            options={[
              { value: 'none', label: t('مرة واحدة', 'Once') },
              { value: 'daily', label: t('يومي', 'Daily') },
              { value: 'weekly', label: t('أسبوعي', 'Weekly') },
              { value: 'monthly', label: t('شهري', 'Monthly') }
            ]}
            onChange={(value) => setKind(value)}
          />
          {kind === 'daily' ? (
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span>{t('كل', 'Every')}</span>
              <input
                className="control"
                type="number"
                min={1}
                max={365}
                value={dailyInterval}
                style={{ width: 90 }}
                onChange={(event) => setDailyInterval(Number(event.target.value))}
              />
              <span>{t('أيام', 'days')}</span>
            </div>
          ) : null}
          {kind === 'weekly' ? (
            <div className="chip-row">
              {WEEKDAYS.map((day) => (
                <Chip
                  key={day}
                  active={weekdays.includes(day)}
                  onClick={() =>
                    setWeekdays((current) =>
                      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
                    )
                  }
                >
                  {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale === 'fa' ? 'fa' : 'ar', { weekday: 'short' }).format(
                    new Date(2024, 0, 7 + day)
                  )}
                </Chip>
              ))}
            </div>
          ) : null}
          {kind === 'monthly' ? (
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span>{t('في يوم', 'On day')}</span>
              <input
                className="control"
                type="number"
                min={1}
                max={31}
                value={monthlyDay}
                style={{ width: 90 }}
                onChange={(event) => setMonthlyDay(Number(event.target.value))}
              />
              <span>{t('من كل شهر', 'of each month')}</span>
            </div>
          ) : null}
          {kind !== 'none' ? (
            <Field label={t('يتوقف في (اختياري)', 'Ends on (optional)')}>
              <input className="control" type="date" value={untilDate} onChange={(event) => setUntilDate(event.target.value)} />
            </Field>
          ) : null}
        </Field>

        {preview.length ? (
          <HintCard icon="calendar">
            <b style={{ display: 'block', marginBottom: 4 }}>{t('المواعيد القادمة', 'Next occurrences')}</b>
            {preview.map((timestamp) => (
              <span key={timestamp} style={{ display: 'block', fontSize: 11.5 }}>
                • {date(timestamp)} · {time(timestamp)}
              </span>
            ))}
          </HintCard>
        ) : null}

        {error ? <p className="field-error">{error}</p> : null}

        {reminder && onDelete ? (
          <Button variant="danger" block onClick={onDelete}>
            {t('حذف التذكير', 'Delete reminder')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
