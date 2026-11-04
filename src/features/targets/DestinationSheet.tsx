import { useEffect, useState } from 'react';
import { Button, Field, Segmented, Sheet, Switch } from '../../components/ui';
import { addDestination, updateDestination } from '../../lib/db';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { COUNTRIES, countryByIso, parseTarget } from '../../lib/phone';
import { useSettings } from '../../lib/settings';
import { toast } from '../../lib/toast';
import type { Destination, TargetType } from '../../types';

export interface DestinationSheetProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  destination: Destination | null;
}

function parseTags(value: string): string[] {
  return value
    .split(/[,،]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Create or edit a saved destination. */
export function DestinationSheet({ open, onClose, workspaceId, destination }: DestinationSheetProps) {
  const { t, n, rel, locale, phoneError } = useI18n();
  const settings = useSettings();
  const country = countryByIso(settings.defaultCountry) ?? COUNTRIES[0];

  const [type, setType] = useState<TargetType>('phone');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(destination?.type ?? 'phone');
    setValue(destination ? (destination.type === 'phone' ? destination.phone || '' : destination.username || '') : '');
    setLabel(destination?.label ?? '');
    setNote(destination?.note ?? '');
    setTags((destination?.tags ?? []).join('، '));
    setFavorite(destination?.favorite ?? false);
    setError(null);
    setSaving(false);
    // Reset only when the sheet (re)opens or the edited row changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, destination?.id]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(phoneError('empty'));
      hapticError();
      return;
    }
    const candidate = type === 'username' ? (trimmed.startsWith('@') ? trimmed : '@' + trimmed) : trimmed;
    const parsed = parseTarget(candidate, { country: settings.defaultCountry });
    if (!parsed.ok) {
      setError(phoneError(parsed.code));
      hapticError();
      return;
    }
    if (parsed.target.type !== type) {
      setError(t('المدخل لا يطابق النوع المختار.', 'The input does not match the selected type.'));
      hapticError();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        workspaceId,
        type: parsed.target.type,
        phone: parsed.target.type === 'phone' ? parsed.target.value : undefined,
        username: parsed.target.type === 'username' ? parsed.target.value : undefined,
        label: (label.trim() || parsed.target.display).slice(0, 80),
        note: note.trim() || undefined,
        tags: parseTags(tags),
        favorite
      };
      if (destination) {
        await updateDestination(destination.id, payload);
        toast(t('تم تحديث الوجهة', 'Destination updated'), 'success');
      } else {
        await addDestination(payload);
        toast(t('تمت إضافة الوجهة', 'Destination added'), 'success');
      }
      hapticSuccess();
      onClose();
    } catch {
      toast(t('تعذّر حفظ الوجهة', 'Could not save the destination'), 'error');
      hapticError();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={destination ? t('تعديل الوجهة', 'Edit destination') : t('وجهة جديدة', 'New destination')}
      subtitle={t('تُحفظ على جهازك فقط.', 'Stored on your device only.')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => {
              void save();
            }}
          >
            {t('حفظ', 'Save')}
          </Button>
        </>
      }
    >
      <Field label={t('النوع', 'Type')}>
        <Segmented<TargetType>
          value={type}
          onChange={(next) => {
            setType(next);
            setValue('');
            setError(null);
          }}
          options={[
            { value: 'phone', label: t('رقم هاتف', 'Phone number') },
            { value: 'username', label: t('اسم مستخدم', 'Username') }
          ]}
        />
      </Field>

      <Field
        label={type === 'phone' ? t('رقم الهاتف', 'Phone number') : t('اسم المستخدم', 'Username')}
        hint={
          type === 'phone'
            ? `${t('الدولة الافتراضية', 'Default country')}: ${locale === 'en' ? country.en : country.ar} +${country.dial}`
            : t('٣–٦٤ حرفاً: حروف، أرقام، . _ -', '3–64 chars: letters, digits, . _ -')
        }
        error={error ?? undefined}
      >
        <input
          className={`control ${error ? 'error' : ''}`}
          dir="ltr"
          inputMode={type === 'phone' ? 'tel' : 'text'}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder={type === 'phone' ? country.example ?? '0770 000 0000' : '@username'}
        />
      </Field>

      <Field label={t('الاسم', 'Name')} hint={t('اسم مقروء يظهر في القائمة.', 'A readable name shown in the list.')}>
        <input
          className="control"
          value={label}
          maxLength={80}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t('مثال: أحمد — المطعم', 'e.g. Ahmed — the restaurant')}
        />
      </Field>

      <Field label={t('ملاحظة', 'Note')}>
        <textarea
          className="control"
          value={note}
          maxLength={280}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('ملاحظة اختيارية', 'Optional note')}
          style={{ minHeight: 70 }}
        />
      </Field>

      <Field label={t('وسوم', 'Tags')} hint={t('افصل بين الوسوم بفاصلة.', 'Separate tags with commas.')}>
        <input
          className="control"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder={t('عميل، عمل، توصيل', 'client, work, delivery')}
        />
      </Field>

      <Switch
        checked={favorite}
        onChange={setFavorite}
        label={t('تثبيت في المفضلة', 'Pin to favorites')}
        description={t('تظهر أولاً في القائمة.', 'Shown first in the list.')}
      />

      {destination ? (
        <p className="page-sub" style={{ margin: 0 }}>
          {t('الاستخدامات', 'Uses')}: {n(destination.useCount)}
          {destination.lastUsedAt ? ` · ${t('آخر استخدام', 'Last used')}: ${rel(destination.lastUsedAt)}` : ''}
        </p>
      ) : null}
    </Sheet>
  );
}
