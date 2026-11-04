import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AppLogo, Icon } from '../../components/icons';
import { Button, HintCard, Sheet } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { verifyPin } from '../../lib/lock';
import { verifyBiometric } from '../../lib/webauthn';
import { hapticError, hapticSuccess, hapticTap } from '../../lib/haptics';

interface LockScreenProps {
  /** Called once the correct PIN / biometric has been verified. */
  onUnlocked: () => void;
}

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;

const KEY_STYLE: CSSProperties = {
  height: 58,
  borderRadius: 16,
  background: 'var(--glass-2)',
  border: '1px solid var(--line)',
  color: 'var(--text)',
  fontSize: 23,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  display: 'grid',
  placeItems: 'center',
  transition: 'transform 0.12s ease, background 0.18s ease',
  userSelect: 'none'
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

interface PinKeyProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
}

function PinKey({ label, onClick, disabled, ariaLabel, children }: PinKeyProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel || label}
      disabled={disabled}
      onClick={onClick}
      style={{ ...KEY_STYLE, opacity: disabled ? 0.4 : 1 }}
    >
      {children ?? label}
    </button>
  );
}

interface PinKeypadProps {
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

function PinKeypad({ disabled, onDigit, onBackspace }: PinKeypadProps) {
  const { t } = useI18n();
  return (
    <div dir="ltr" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%' }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <PinKey key={digit} label={digit} disabled={disabled} onClick={() => onDigit(digit)} />
      ))}
      <span aria-hidden="true" />
      <PinKey label="0" disabled={disabled} onClick={() => onDigit('0')} />
      <PinKey label={t('حذف', 'Delete')} ariaLabel={t('حذف رقم', 'Delete digit')} disabled={disabled} onClick={onBackspace}>
        <Icon name="backspace" size={22} />
      </PinKey>
    </div>
  );
}

/**
 * Full-screen lock gate. Reads the lock configuration from `useSettings()` and
 * calls `onUnlocked` only after a successful PIN or biometric check.
 * Forgetting the PIN never disables the lock — the user is guided to wipe the
 * app data manually instead.
 */
export function LockScreen({ onUnlocked }: LockScreenProps) {
  const { t } = useI18n();
  const settings = useSettings();
  const hapticsOn = settings.haptics;
  const { lock } = settings;

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const dotsRef = useRef<HTMLDivElement>(null);
  const unlockedRef = useRef(false);

  const hasPin = Boolean(lock.hash && lock.salt);

  const unlock = () => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    if (hapticsOn) hapticSuccess();
    onUnlocked();
  };

  const shake = () => {
    const element = dotsRef.current;
    if (!element || typeof element.animate !== 'function' || prefersReducedMotion()) return;
    element.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-9px)' },
        { transform: 'translateX(9px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' }
      ],
      { duration: 420, easing: 'ease-in-out' }
    );
  };

  const fail = (message: string) => {
    if (hapticsOn) hapticError();
    setError(message);
    setPin('');
    shake();
  };

  const submit = async () => {
    if (checking || unlockedRef.current) return;
    const hash = lock.hash;
    const salt = lock.salt;
    if (!hash || !salt) {
      setError(t('لا يوجد رمز محفوظ على هذا الجهاز. راجع «نسيت الرقم؟».', 'No PIN is stored on this device. See “Forgot PIN?”.'));
      return;
    }
    if (pin.length < MIN_PIN_LENGTH) return;

    setChecking(true);
    const valid = await verifyPin(pin, hash, salt);
    setChecking(false);
    if (valid) {
      setError(null);
      unlock();
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    fail(
      nextAttempts >= 5
        ? t(
            'رمز غير صحيح. إذا نسيت الرمز فاضغط «نسيت الرقم؟» لمعرفة طريقة البدء من جديد.',
            'Incorrect PIN. If you forgot it, tap “Forgot PIN?” to learn how to start over.'
          )
        : t('رمز غير صحيح. حاول مجدداً.', 'Incorrect PIN. Try again.')
    );
  };

  const biometricUnlock = async () => {
    const credentialId = lock.credentialId;
    if (!credentialId || bioBusy || unlockedRef.current) return;
    setBioBusy(true);
    const valid = await verifyBiometric(credentialId);
    setBioBusy(false);
    if (valid) {
      setError(null);
      unlock();
      return;
    }
    if (hapticsOn) hapticError();
    setError(t('تعذّر التحقق بالبصمة. استخدم رمز PIN.', 'Biometric verification failed. Use your PIN.'));
    shake();
  };

  const handleDigit = (digit: string) => {
    if (checking || !hasPin) return;
    setError(null);
    if (pin.length >= MAX_PIN_LENGTH) return;
    if (hapticsOn) hapticTap();
    setPin((previous) => (previous.length >= MAX_PIN_LENGTH ? previous : previous + digit));
  };

  const handleBackspace = () => {
    if (checking) return;
    setError(null);
    if (hapticsOn) hapticTap();
    setPin((previous) => previous.slice(0, -1));
  };

  const slots = Math.min(MAX_PIN_LENGTH, Math.max(MIN_PIN_LENGTH, pin.length));

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(26px + env(safe-area-inset-top)) 18px calc(26px + env(safe-area-inset-bottom))'
      }}
    >
      <div
        className="glass card"
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 15,
          padding: '26px 20px 20px'
        }}
      >
        <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 22 }}>
          <AppLogo size={64} />
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <h1 className="page-title" style={{ fontSize: 21 }}>
            {t('التطبيق مقفل', 'App locked')}
          </h1>
          <p className="page-sub" style={{ margin: 0 }}>
            {t('أدخل رمز PIN للمتابعة', 'Enter your PIN to continue')}
          </p>
        </div>

        <div
          ref={dotsRef}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 16, paddingBlock: 2 }}
          aria-hidden="true"
        >
          {Array.from({ length: slots }, (_, index) => {
            const filled = index < pin.length;
            const color = error ? 'var(--danger)' : 'var(--accent)';
            return (
              <span
                key={index}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  border: `1.5px solid ${filled ? color : error ? 'var(--danger)' : 'var(--line-strong)'}`,
                  background: filled ? color : 'transparent',
                  transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
              />
            );
          })}
        </div>

        <p
          className={error ? 'field-error' : 'page-sub'}
          role={error ? 'alert' : undefined}
          aria-live="polite"
          style={{ margin: 0, textAlign: 'center', minHeight: 30, fontSize: 11 }}
        >
          {error ?? t('الرمز من 4 إلى 6 أرقام.', 'The PIN is 4 to 6 digits.')}
        </p>

        <PinKeypad disabled={checking || !hasPin} onDigit={handleDigit} onBackspace={handleBackspace} />

        <Button
          variant="primary"
          size="lg"
          block
          loading={checking}
          disabled={pin.length < MIN_PIN_LENGTH || checking || !hasPin}
          onClick={() => void submit()}
        >
          {t('فتح', 'Unlock')}
        </Button>

        {lock.credentialId ? (
          <Button variant="soft" block loading={bioBusy} disabled={bioBusy} onClick={() => void biometricUnlock()}>
            {!bioBusy ? <Icon name="user" size={18} /> : null}
            {t('فتح بالبصمة', 'Unlock with biometrics')}
          </Button>
        ) : null}

        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          style={{
            minHeight: 44,
            padding: '8px 12px',
            color: 'var(--muted)',
            fontSize: 11.5,
            fontWeight: 800
          }}
        >
          {t('نسيت الرقم؟', 'Forgot PIN?')}
        </button>
      </div>

      <div className="row" style={{ justifyContent: 'center', marginTop: 18, color: 'var(--muted)', fontSize: 11, gap: 7 }}>
        <Icon name="shield" size={15} />
        <span>{t('كل بياناتك محفوظة على جهازك فقط.', 'All your data stays on this device.')}</span>
      </div>

      <Sheet
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={t('نسيت الرقم؟', 'Forgot your PIN?')}
        footer={
          <Button block variant="primary" onClick={() => setForgotOpen(false)}>
            {t('فهمت', 'Got it')}
          </Button>
        }
      >
        <p className="page-sub" style={{ margin: 0 }}>
          {t(
            'لأمانك، لا يمكن استعادة رمز PIN أو قراءته: يُخزَّن كبصمة مشفّرة (PBKDF2) على جهازك فقط، ولا يوجد خادم يمكنه إعادة تعيينه.',
            'For your security the PIN cannot be recovered or read: it is stored as a PBKDF2 hash on your device only, and there is no server that can reset it.'
          )}
        </p>

        <HintCard icon="alert">
          {t(
            'لا يعطّل التطبيق القفل تلقائياً عند نسيان الرمز. الحل الوحيد هو مسح بيانات التطبيق يدوياً من إعدادات المتصفح أو النظام — وهذا يمسح كل الوجهات والقوالب والسجل والإعدادات نهائياً.',
            'The app never disables the lock automatically when the PIN is forgotten. The only way out is clearing the app’s site data manually from your browser or system settings — which permanently erases all destinations, templates, history and settings.'
          )}
        </HintCard>

        <div className="col" style={{ gap: 8 }}>
          <span className="section-title">{t('لبدء من جديد يدوياً', 'To start over manually')}</span>
          <ol style={{ margin: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, lineHeight: 1.7, color: 'var(--muted)' }}>
            <li>{t('افتح إعدادات المتصفح (أو إعدادات النظام) وابحث عن بيانات موقع هذا التطبيق.', 'Open your browser settings (or system settings) and find this app’s site data.')}</li>
            <li>{t('اختر «مسح البيانات» أو «حذف بيانات الموقع» (Clear site data).', 'Choose “Clear site data” or “Delete website data”.')}</li>
            <li>{t('أعد فتح التطبيق؛ سيبدأ فارغاً وبدون قفل.', 'Reopen the app; it will start empty and without a lock.')}</li>
            <li>{t('إن كانت لديك نسخة احتياطية سابقة، استوردها من «الأدوات ← نسخة احتياطية».', 'If you have a previous backup, import it from Tools → Backup.')}</li>
          </ol>
        </div>
      </Sheet>
    </div>
  );
}
