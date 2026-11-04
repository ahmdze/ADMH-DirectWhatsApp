import { useEffect, useState } from 'react';
import { Icon, type IconName } from './icons';
import { Button } from './ui';
import { useI18n } from '../lib/i18n';

interface Step {
  icon: IconName;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

const STEPS: Step[] = [
  {
    icon: 'whatsapp',
    titleAr: 'مرحباً بك في واتساب المباشر',
    titleEn: 'Welcome to Direct WhatsApp',
    bodyAr: 'افتح محادثة واتساب دون حفظ الرقم. كل شيء يبقى على جهازك، بلا حساب ولا خادم.',
    bodyEn: 'Open a WhatsApp chat without saving the number. Everything stays on your device — no account, no server.'
  },
  {
    icon: 'chat',
    titleAr: 'أرسل خلال ثوانٍ',
    titleEn: 'Send in seconds',
    bodyAr: 'الصق رقماً أو اسم مستخدم، أضف رسالة، واضغط «مراسلة». يمكنك أيضاً حفظ الوجهات المتكررة.',
    bodyEn: 'Paste a number or username, add a message, and tap “Message”. You can also save frequent destinations.'
  },
  {
    icon: 'qr',
    titleAr: 'أدوات جاهزة للاستخدام',
    titleEn: 'Tools built in',
    bodyAr: 'أنشئ رموز QR وبطاقات وملصقات، وامسح الرموز بالكاميرا أو من صورة — كل ذلك دون اتصال.',
    bodyEn: 'Create QR codes, cards and labels, and scan with the camera or an image — all offline.'
  },
  {
    icon: 'install',
    titleAr: 'ثبّت التطبيق',
    titleEn: 'Install the app',
    bodyAr: 'أضفه إلى الشاشة الرئيسية ليعمل بسرعة وأوفلاين، وستصلك التحديثات داخل التطبيق.',
    bodyEn: 'Add it to your home screen for fast offline access, and get updates from inside the app.'
  }
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, isRTL } = useI18n();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('جولة تعريفية', 'Introduction tour')}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
        background: 'radial-gradient(120% 80% at 80% 0%, #0f3b33 0%, #081d1a 45%, #050f0d 100%)'
      }}
    >
      <div className="glass card" style={{ width: '100%', maxWidth: 430, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="row-between">
          <span className="badge accent" dir="ltr">
            {index + 1} / {STEPS.length}
          </span>
          <Button variant="ghost" size="sm" onClick={onDone}>
            {t('تخطي', 'Skip')}
          </Button>
        </div>

        <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 22, margin: 'auto' }}>
          <Icon name={step.icon} size={30} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 className="page-title" style={{ fontSize: 23 }}>
            {t(step.titleAr, step.titleEn)}
          </h2>
          <p className="page-sub" style={{ marginTop: 8 }}>
            {t(step.bodyAr, step.bodyEn)}
          </p>
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 6 }} aria-hidden="true">
          {STEPS.map((_, dot) => (
            <span
              key={dot}
              style={{
                width: dot === index ? 20 : 7,
                height: 7,
                borderRadius: 999,
                background: dot === index ? 'var(--accent)' : 'var(--line-strong)',
                transition: 'all .2s ease'
              }}
            />
          ))}
        </div>

        <div className="row" style={{ gap: 8 }}>
          {index > 0 ? (
            <Button variant="ghost" onClick={() => setIndex((value) => value - 1)}>
              <Icon name={isRTL ? 'chevronRight' : 'chevronLeft'} size={16} />
              {t('السابق', 'Back')}
            </Button>
          ) : null}
          <Button
            variant="primary"
            block
            onClick={() => (last ? onDone() : setIndex((value) => value + 1))}
          >
            {last ? t('ابدأ الآن', 'Start now') : t('التالي', 'Next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
