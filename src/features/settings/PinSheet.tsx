import { useEffect, useState } from 'react';
import { Button, Field, HintCard, Sheet } from '../../components/ui';
import { createPinHash, verifyPin } from '../../lib/lock';
import { updateSettings, useSettings } from '../../lib/settings';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';

export type PinSheetMode = 'set' | 'change' | 'disable';

const PIN_PATTERN = /^\d{4,6}$/;

/** Keep only ASCII digits, max 6 (PIN length 4–6). */
function sanitizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

interface PinSheetProps {
  open: boolean;
  mode: PinSheetMode;
  onClose: () => void;
}

/**
 * Create / change / disable the app PIN.
 * The PIN is hashed with PBKDF2 (`createPinHash`) and stored in `settings.lock`;
 * the plain text value never leaves this component.
 */
export function PinSheet({ open, mode, onClose }: PinSheetProps) {
  const { t } = useI18n();
  const settings = useSettings();
  const hapticsOn = settings.haptics;
  const lock = settings.lock;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent('');
    setNext('');
    setConfirmation('');
    setError(null);
    setBusy(false);
  }, [open, mode]);

  const needsCurrent = mode !== 'set';

  const title =
    mode === 'set'
      ? t('تفعيل قفل التطبيق', 'Enable app lock')
      : mode === 'change'
        ? t('تغيير رمز القفل', 'Change app PIN')
        : t('تعطيل قفل التطبيق', 'Disable app lock');

  const subtitle =
    mode === 'set'
      ? t('اختر رمزاً من 4 إلى 6 أرقام لحماية بياناتك.', 'Choose a 4–6 digit PIN to protect your data.')
      : mode === 'change'
        ? t('أدخل رمزك الحالي ثم اختر رمزاً جديداً.', 'Enter your current PIN, then choose a new one.')
        : t('أدخل رمزك الحالي لتأكيد تعطيل القفل.', 'Enter your current PIN to confirm disabling the lock.');

  const submit = async () => {
    if (busy) return;

    if (needsCurrent && !PIN_PATTERN.test(current)) {
      setError(t('أدخل رمزك الحالي (4–6 أرقام).', 'Enter your current PIN (4–6 digits).'));
      return;
    }
    if (needsCurrent && (!lock.hash || !lock.salt)) {
      setError(t('لا يوجد رمز محفوظ على هذا الجهاز.', 'No PIN is stored on this device.'));
      return;
    }
    if (mode !== 'disable') {
      if (!PIN_PATTERN.test(next)) {
        setError(t('الرمز الجديد يجب أن يكون من 4 إلى 6 أرقام.', 'The new PIN must be 4–6 digits.'));
        return;
      }
      if (next !== confirmation) {
        setError(t('الرمزان غير متطابقين. أعد المحاولة.', 'The PINs do not match. Try again.'));
        return;
      }
    }

    setBusy(true);
    try {
      if (needsCurrent && lock.hash && lock.salt) {
        const valid = await verifyPin(current, lock.hash, lock.salt);
        if (!valid) {
          if (hapticsOn) hapticError();
          setError(t('الرمز الحالي غير صحيح.', 'The current PIN is incorrect.'));
          return;
        }
      }

      if (mode === 'disable') {
        updateSettings({ lock: { enabled: false, method: 'pin', hash: undefined, salt: undefined, credentialId: null } });
        if (hapticsOn) hapticSuccess();
        toast(t('تم تعطيل قفل التطبيق.', 'App lock disabled.'), 'success');
        onClose();
        return;
      }

      const { hash, salt } = await createPinHash(next);
      updateSettings({
        lock:
          mode === 'change'
            ? { ...lock, enabled: true, hash, salt }
            : { enabled: true, method: 'pin', hash, salt, credentialId: null }
      });
      if (hapticsOn) hapticSuccess();
      toast(
        mode === 'change' ? t('تم تغيير رمز القفل.', 'App PIN updated.') : t('تم تفعيل قفل التطبيق.', 'App lock enabled.'),
        'success'
      );
      onClose();
    } catch {
      setError(t('تعذّر حفظ الرمز. حاول مجدداً.', 'Could not save the PIN. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('إلغاء', 'Cancel')}
          </Button>
          <Button variant={mode === 'disable' ? 'danger' : 'primary'} loading={busy} onClick={() => void submit()}>
            {mode === 'disable' ? t('تعطيل', 'Disable') : mode === 'change' ? t('تغيير', 'Change') : t('تفعيل', 'Enable')}
          </Button>
        </>
      }
    >
      {needsCurrent ? (
        <Field label={t('الرمز الحالي', 'Current PIN')} counter={current ? `${current.length}/6` : undefined}>
          <input
            className="control"
            dir="ltr"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            value={current}
            placeholder="••••••"
            onChange={(event) => {
              setError(null);
              setCurrent(sanitizePin(event.target.value));
            }}
          />
        </Field>
      ) : null}

      {mode !== 'disable' ? (
        <>
          <Field label={t('الرمز الجديد', 'New PIN')} hint={t('من 4 إلى 6 أرقام.', '4 to 6 digits.')}>
            <input
              className="control"
              dir="ltr"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={6}
              value={next}
              placeholder="••••••"
              onChange={(event) => {
                setError(null);
                setNext(sanitizePin(event.target.value));
              }}
            />
          </Field>
          <Field label={t('تأكيد الرمز', 'Confirm PIN')}>
            <input
              className="control"
              dir="ltr"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={6}
              value={confirmation}
              placeholder="••••••"
              onChange={(event) => {
                setError(null);
                setConfirmation(sanitizePin(event.target.value));
              }}
            />
          </Field>
        </>
      ) : (
        <HintCard icon="alert">
          {t(
            'بدون القفل سيفتح التطبيق مباشرة. سيبقى الرمز محفوظاً على جهازك فقط، ولن يُرسل إلى أي خادم.',
            'Without the lock the app will open directly. The PIN is stored only on this device and never sent to a server.'
          )}
        </HintCard>
      )}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
