import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, Chip, Field, HintCard, IconButton } from '../../components/ui';
import { useActiveWorkspace, useHistory, useTemplates } from '../../hooks/useData';
import { readClipboardText, writeClipboardText } from '../../lib/clipboard';
import { recordTargetUse } from '../../lib/db';
import { hapticError, hapticSuccess, hapticTap } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { takeDraft } from '../../lib/launch';
import { COUNTRIES, countryByIso, extractCandidateFromText, formatPhone, parseTarget } from '../../lib/phone';
import { navigate } from '../../lib/router';
import { updateSettings, useSettings } from '../../lib/settings';
import { hasVariables, previewTemplate } from '../../lib/template';
import { toast } from '../../lib/toast';
import { buildChatUrl, openChat } from '../../lib/whatsapp';
import type { Target } from '../../types';
import { CountryPicker } from './CountryPicker';
import { QrPreviewSheet } from './QrPreviewSheet';
import { SaveTargetSheet } from './SaveTargetSheet';

const MESSAGE_LIMIT = 2000;

/** Home screen: turn a phone / @username / wa.me link into an open WhatsApp chat. */
export function ComposeScreen() {
  const { t, locale, n, phoneError, isRTL } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const templates = useTemplates(workspace?.id);
  const history = useHistory(workspace?.id, 8);

  const [country, setCountry] = useState(settings.defaultCountry);
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [actionTarget, setActionTarget] = useState<Target | null>(null);
  const [clipSuggestion, setClipSuggestion] = useState<string | null>(null);

  const countryInfo = countryByIso(country) ?? COUNTRIES[0];
  const preview = useMemo(() => (raw.trim() ? parseTarget(raw, { country }) : null), [raw, country]);
  const validTarget = preview && preview.ok ? preview.target : null;

  // Drafts handed over by templates, the share target, or a QR scan.
  // Parent effects (launch params) run after child effects, so re-check once
  // after the commit instead of trusting a single read.
  useEffect(() => {
    const applyDraft = () => {
      const draft = takeDraft();
      if (!draft) return false;
      if (draft.raw) setRaw(draft.raw);
      if (draft.message) setMessage(draft.message.slice(0, MESSAGE_LIMIT));
      if (draft.origin === 'share') toast(t('تم استلام الوجهة من المشاركة', 'Destination received from the share'), 'success');
      else if (draft.origin === 'scan') toast(t('تم استلام الوجهة من مسح QR', 'Destination received from the QR scan'), 'success');
      return true;
    };
    if (applyDraft()) return;
    const timer = window.setTimeout(() => {
      applyDraft();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [t]);

  // Offer (never auto-fill) a target found in the clipboard on first open.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const text = await readClipboardText();
        if (cancelled || !text) return;
        const candidate = extractCandidateFromText(text);
        if (!candidate) return;
        const parsed = parseTarget(candidate, { country: settings.defaultCountry });
        if (!parsed.ok) return;
        setClipSuggestion(candidate);
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Runs once per mount: settings read from the mount snapshot on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveTarget = (): Target | null => {
    const parsed = parseTarget(raw, { country });
    if (!parsed.ok) {
      const text = phoneError(parsed.code);
      setError(text);
      toast(text, 'error');
      hapticError();
      return null;
    }
    setError(null);
    return parsed.target;
  };

  const handleSend = async () => {
    const target = resolveTarget();
    if (!target) return;
    setBusy(true);
    try {
      if (workspace) await recordTargetUse(target, workspace.id, message);
    } catch {
      /* history is best-effort — the chat still opens */
    }
    openChat(target, message);
    hapticSuccess();
    toast(t('تم فتح واتساب', 'WhatsApp opened'), 'success');
    setBusy(false);
  };

  const copyLink = async () => {
    const target = resolveTarget();
    if (!target) return;
    const copied = await writeClipboardText(buildChatUrl(target, message));
    if (copied) {
      toast(t('تم نسخ الرابط', 'Link copied'), 'success');
      hapticSuccess();
    } else {
      toast(t('تعذّر نسخ الرابط', 'Could not copy the link'), 'error');
      hapticError();
    }
  };

  const shareLink = async () => {
    const target = resolveTarget();
    if (!target) return;
    const url = buildChatUrl(target, message);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('واتساب المباشر', 'Direct WhatsApp'), text: message || undefined, url });
        hapticSuccess();
        return;
      } catch (shareError) {
        if ((shareError as Error)?.name === 'AbortError') return;
      }
    }
    const copied = await writeClipboardText(url);
    toast(
      copied ? t('تم نسخ الرابط بدل المشاركة', 'Link copied instead of sharing') : t('تعذّرت المشاركة', 'Could not share'),
      copied ? 'success' : 'error'
    );
  };

  const openQr = () => {
    const target = resolveTarget();
    if (!target) return;
    setActionTarget(target);
    setQrUrl(buildChatUrl(target, message));
    setQrOpen(true);
  };

  const openSave = () => {
    const target = resolveTarget();
    if (!target) return;
    setActionTarget(target);
    setSaveOpen(true);
  };

  const pasteFromClipboard = async () => {
    const text = await readClipboardText();
    if (!text) {
      toast(t('لا يوجد نص في الحافظة', 'The clipboard is empty'), 'error');
      hapticError();
      return;
    }
    setRaw(extractCandidateFromText(text) ?? text.trim().slice(0, 120));
    setError(null);
    setClipSuggestion(null);
    hapticTap();
  };

  const applySuggestion = () => {
    if (!clipSuggestion) return;
    setRaw(clipSuggestion);
    setError(null);
    setClipSuggestion(null);
    hapticTap();
  };

  const applyRecent = (targetType: 'phone' | 'username', value: string) => {
    setRaw(targetType === 'username' ? '@' + value : value);
    setError(null);
    hapticTap();
  };

  const insertTemplate = (body: string) => {
    const text = hasVariables(body) ? previewTemplate(body, {}, locale) : body;
    setMessage(text.slice(0, MESSAGE_LIMIT));
    hapticTap();
  };

  return (
    <div className="screen">
      <header>
        <h1 className="page-title">{t('رسالة سريعة', 'Quick message')}</h1>
        <p className="page-sub">
          {t(
            'افتح محادثة واتساب فوراً — بدون حفظ الرقم، وكل شيء يبقى على جهازك.',
            'Open a WhatsApp chat instantly — no saving numbers, everything stays on your device.'
          )}
        </p>
      </header>

      <section className="glass card col" style={{ gap: 14 }}>
        <Field
          label={t('الوجهة', 'Destination')}
          error={error ?? undefined}
          hint={t(
            'رقم محلي أو دولي، أو @اسم المستخدم، أو رابط wa.me',
            'Local or international number, @username, or a wa.me link'
          )}
        >
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setCountryOpen(true)}
              aria-label={t('اختيار الدولة', 'Choose the country')}
              style={{ height: 50, paddingInline: 11, gap: 6, flexShrink: 0 }}
            >
              <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>
                {countryInfo.flag}
              </span>
              <span dir="ltr" style={{ fontSize: 12 }}>
                +{countryInfo.dial}
              </span>
              <Icon name={isRTL ? 'chevronLeft' : 'chevronRight'} size={14} />
            </button>
            <div className="input-wrap grow">
              <div className="input-suffix">
                {raw ? (
                  <IconButton
                    name="x"
                    label={t('مسح الحقل', 'Clear the field')}
                    variant="plain"
                    size={17}
                    onClick={() => {
                      setRaw('');
                      setError(null);
                    }}
                  />
                ) : (
                  <IconButton
                    name="clipboard"
                    label={t('لصق من الحافظة', 'Paste from the clipboard')}
                    variant="plain"
                    size={17}
                    onClick={() => {
                      void pasteFromClipboard();
                    }}
                  />
                )}
              </div>
              <input
                className={`control ${error ? 'error' : ''}`}
                dir="ltr"
                inputMode="text"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                value={raw}
                onChange={(event) => {
                  setRaw(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="0770 000 0000 · @name"
                aria-label={t('رقم الهاتف أو اسم المستخدم', 'Phone number or username')}
                style={{ paddingInlineEnd: 52 }}
              />
            </div>
          </div>
          {validTarget ? (
            <p className="list-sub" style={{ margin: 0 }}>
              {t('سيفتح', 'Will open')}:{' '}
              <span dir="ltr" className="sensitive">
                {validTarget.display}
              </span>
            </p>
          ) : null}
        </Field>

        <Field label={t('الرسالة (اختياري)', 'Message (optional)')} counter={`${n(message.length)}/${MESSAGE_LIMIT}`}>
          <textarea
            className="control"
            value={message}
            maxLength={MESSAGE_LIMIT}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('اكتب رسالتك — ستظهر جاهزة داخل واتساب.', 'Type your message — it will be pre-filled in WhatsApp.')}
            style={{ minHeight: 82 }}
            aria-label={t('نص الرسالة', 'Message text')}
          />
        </Field>

        {templates.length ? (
          <div className="col" style={{ gap: 8 }}>
            <div className="section-head">
              <span className="section-title">{t('قوالب سريعة', 'Quick templates')}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
                {t('الكل', 'All')}
              </Button>
            </div>
            <div className="chip-row">
              {templates.slice(0, 12).map((template) => (
                <Chip
                  key={template.id}
                  title={template.title}
                  onClick={() => insertTemplate(locale === 'en' && template.bodyEn ? template.bodyEn : template.body)}
                >
                  {locale === 'en' ? template.titleEn || template.title : template.title}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          block
          loading={busy}
          onClick={() => {
            void handleSend();
          }}
        >
          <Icon name="whatsapp" size={19} />
          {t('مراسلة عبر واتساب', 'Message on WhatsApp')}
        </Button>

        <div className="grid-3">
          <Button variant="soft" size="sm" onClick={openQr}>
            <Icon name="qr" size={16} />
            {t('QR', 'QR')}
          </Button>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              void copyLink();
            }}
          >
            <Icon name="copy" size={16} />
            {t('نسخ', 'Copy')}
          </Button>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              void shareLink();
            }}
          >
            <Icon name="share" size={16} />
            {t('مشاركة', 'Share')}
          </Button>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" size="sm" className="grow" onClick={openSave}>
            <Icon name="bookmark" size={16} />
            {t('حفظ الوجهة', 'Save destination')}
          </Button>
          <Button variant="ghost" size="sm" className="grow" onClick={() => navigate('/tools/scan')}>
            <Icon name="scan" size={16} />
            {t('مسح QR', 'Scan QR')}
          </Button>
        </div>
      </section>

      {clipSuggestion && !raw.trim() ? (
        <div className="glass-soft" style={{ padding: '12px 14px' }}>
          <div className="row-between" style={{ gap: 8 }}>
            <div className="col" style={{ gap: 2, minWidth: 0 }}>
              <b style={{ fontSize: 12.5 }}>{t('يبدو أنك نسخت وجهة', 'Looks like you copied a destination')}</b>
              <span className="list-sub" dir="ltr">
                {clipSuggestion}
              </span>
            </div>
            <div className="row" style={{ gap: 6, flexShrink: 0 }}>
              <Button variant="soft" size="sm" onClick={applySuggestion}>
                {t('استخدام', 'Use')}
              </Button>
              <IconButton name="x" label={t('تجاهل الاقتراح', 'Dismiss the suggestion')} variant="plain" size={16} onClick={() => setClipSuggestion(null)} />
            </div>
          </div>
        </div>
      ) : null}

      {history.length ? (
        <section className="col" style={{ gap: 8 }}>
          <div className="section-head">
            <h2 className="section-title">{t('آخر الوجهات', 'Recent destinations')}</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/targets')}>
              {t('السجل', 'History')}
            </Button>
          </div>
          <div className="chip-row">
            {history.map((entry) => (
              <Chip
                key={entry.id}
                title={entry.targetType === 'username' ? '@' + entry.value : formatPhone(entry.value)}
                onClick={() => applyRecent(entry.targetType, entry.value)}
              >
                <Icon name={entry.targetType === 'username' ? 'user' : 'phone'} size={13} />
                <span dir="ltr">{entry.targetType === 'username' ? '@' + entry.value : formatPhone(entry.value)}</span>
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      <HintCard icon="shield">
        {t(
          'رقمك ورسالتك لا يُرسلان إلى أي خادم — الرابط يفتح واتساب مباشرة، والبيانات تبقى على جهازك.',
          'Your number and message never reach a server — the link opens WhatsApp directly, and your data stays on this device.'
        )}
      </HintCard>

      <CountryPicker
        open={countryOpen}
        selected={country}
        onClose={() => setCountryOpen(false)}
        onSelect={(iso) => {
          setCountry(iso);
          updateSettings({ defaultCountry: iso });
          setCountryOpen(false);
        }}
      />
      <SaveTargetSheet open={saveOpen} onClose={() => setSaveOpen(false)} workspaceId={workspace?.id ?? null} target={actionTarget} />
      <QrPreviewSheet open={qrOpen} onClose={() => setQrOpen(false)} url={qrUrl} title={actionTarget?.display ?? ''} />
    </div>
  );
}
