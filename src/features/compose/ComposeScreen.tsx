import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, Chip, Field, HintCard, IconButton } from '../../components/ui';
import { useActiveWorkspace, useDestinations, useHistory, useTemplates } from '../../hooks/useData';
import { readClipboardText, writeClipboardText } from '../../lib/clipboard';
import { recordTargetUse } from '../../lib/db';
import { hapticError, hapticSuccess, hapticTap } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { shareNativeText } from '../../lib/native';
import { takeDraft, subscribeDraft } from '../../lib/launch';
import { COUNTRIES, countryByIso, extractCandidateFromText, formatPhone, normalizeDigits, parseTarget } from '../../lib/phone';
import { initials } from '../../lib/format';
import { navigate } from '../../lib/router';
import { updateSettings, useSettings } from '../../lib/settings';
import { hasVariables, localizedTemplate, previewTemplate } from '../../lib/template';
import { toast } from '../../lib/toast';
import { buildChatUrl, openChat } from '../../lib/whatsapp';
import { buildVCard } from '../../lib/vcard';
import { canShareFiles, downloadBlob, shareFiles } from '../../lib/image';
import { prepareMediaFile, releaseMedia, type MediaAttachment } from '../../lib/media';
import type { Draft, Target } from '../../types';
import { CountryPicker } from './CountryPicker';
import { ComposeMedia } from './ComposeMedia';
import { ComposePreview } from './ComposePreview';
import { QrPreviewSheet } from './QrPreviewSheet';
import { SaveTargetSheet } from './SaveTargetSheet';
import { ReminderEditorSheet } from '../tools/ReminderEditorSheet';

const MESSAGE_LIMIT = 2000;

/** Home screen: turn a phone / @username / wa.me link into an open WhatsApp chat. */
export function ComposeScreen() {
  const { t, locale, n, phoneError, isRTL } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const templates = useTemplates(workspace?.id);
  const history = useHistory(workspace?.id, 8);
  const destinations = useDestinations(workspace?.id);

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
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePreset, setSchedulePreset] = useState<{
    workspaceId: string;
    label: string;
    display: string;
    message?: string;
  } | null>(null);
  const mediaRef = useRef<MediaAttachment[]>([]);

  const query = raw.trim().toLowerCase();
  const queryDigits = normalizeDigits(query).replace(/\D/g, '');
  const suggestions = useMemo(() => {
    if (hideSuggestions || !query || query.length < 1) return [];
    const nameQuery = query.replace(/^@/, '');
    return destinations
      .filter((destination) => {
        if (destination.label.toLowerCase().includes(query)) return true;
        if (destination.phone && queryDigits.length >= 2 && destination.phone.includes(queryDigits)) return true;
        if (destination.username && destination.username.toLowerCase().includes(nameQuery)) return true;
        return false;
      })
      .slice(0, 5);
  }, [destinations, query, queryDigits, hideSuggestions]);

  const countryInfo = countryByIso(country) ?? COUNTRIES[0];
  const preview = useMemo(() => (raw.trim() ? parseTarget(raw, { country }) : null), [raw, country]);
  const validTarget = preview && preview.ok ? preview.target : null;

  // Drafts handed over by templates, the share target, a QR scan, or a shared
  // image decoded asynchronously. Subscribe so late drafts still fill the form.
  useEffect(() => {
    const apply = (draft: Draft) => {
      if (draft.workspaceId && draft.workspaceId !== settings.activeWorkspaceId) {
        updateSettings({ activeWorkspaceId: draft.workspaceId });
      }
      if (draft.raw || draft.phone) setRaw(draft.phone || draft.raw);
      if (draft.message) setMessage(draft.message.slice(0, MESSAGE_LIMIT));
      if (draft.origin === 'share') toast(t('تم استلام الوجهة من المشاركة', 'Destination received from the share'), 'success');
      else if (draft.origin === 'scan') toast(t('تم استلام الوجهة من مسح QR', 'Destination received from the QR scan'), 'success');
    };
    const consume = () => {
      const draft = takeDraft();
      if (draft) apply(draft);
    };
    consume();
    const timer = window.setTimeout(consume, 0);
    const unsubscribe = subscribeDraft(consume);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [t, settings.activeWorkspaceId]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    return () => releaseMedia(mediaRef.current);
  }, []);

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

  const addPreparedMedia = async (file: File) => {
    const prepared = await prepareMediaFile(file);
    setMedia((current) => [...current, prepared].slice(0, 5));
  };

  const handleFiles = async (files: FileList) => {
    setMediaError(null);
    setMediaBusy(true);
    try {
      for (const file of Array.from(files)) {
        try {
          await addPreparedMedia(file);
        } catch (error) {
          const code = (error as Error)?.message;
          setMediaError(
            code === 'too-large'
              ? t('الملف أكبر من الحد المسموح.', 'The file is larger than the allowed limit.')
              : code === 'unsupported'
                ? t('نوع الملف غير مدعوم.', 'This file type is not supported.')
                : t('تعذّر تجهيز الملف.', 'Could not prepare this file.')
          );
        }
      }
    } finally {
      setMediaBusy(false);
    }
  };

  const addContactCard = async () => {
    const target = validTarget;
    if (!target) {
      toast(t('حدّد وجهة أولاً لإرفاق جهة الاتصال.', 'Choose a destination first to attach a contact.'), 'error');
      return;
    }
    const safe = target.display.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 40) || 'contact';
    const file = new File(
      [
        buildVCard({
          name: target.display,
          phone: target.type === 'phone' ? target.value : undefined,
          url: target.type === 'username' ? `https://wa.me/${target.value}` : undefined
        })
      ],
      `${safe}.vcf`,
      { type: 'text/vcard' }
    );
    await addPreparedMedia(file);
    hapticSuccess();
  };

  const addLocation = () => {
    if (!navigator.geolocation) {
      toast(t('الموقع غير مدعوم على هذا الجهاز.', 'Location is not supported on this device.'), 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const url = `https://maps.google.com/?q=${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
        setMessage((current) => [current, url].filter(Boolean).join('\n').slice(0, MESSAGE_LIMIT));
        hapticSuccess();
      },
      () => toast(t('تعذّر الحصول على الموقع.', 'Could not get the location.'), 'error'),
      { timeout: 10000 }
    );
  };

  const removeMedia = (id: string) => {
    setMedia((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) releaseMedia([item]);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const openSchedule = () => {
    const target = resolveTarget();
    if (!target) return;
    setSchedulePreset({
      workspaceId: workspace?.id || 'personal',
      label: target.display,
      display: target.display,
      message: message.trim() || undefined
    });
    setScheduleOpen(true);
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

    if (media.length) {
      const shared = canShareFiles() && (await shareFiles(media.map((item) => item.file), {
        title: t('واتساب المباشر', 'Direct WhatsApp'),
        text: message || undefined
      }));
      setBusy(false);
      if (shared) {
        hapticSuccess();
        toast(t('اختر واتساب والمحادثة في نافذة المشاركة.', 'Pick WhatsApp and the chat in the share sheet.'), 'success');
        return;
      }
      for (const item of media) downloadBlob(item.file, item.name);
      const copied = await writeClipboardText([message, buildChatUrl(target)].filter(Boolean).join('\n'));
      toast(
        copied
          ? t('تعذّرت المشاركة؛ نُزّلت المرفقات ونُسخ الرابط.', 'Sharing failed; attachments were downloaded and the link copied.')
          : t('تعذّرت المشاركة؛ نُزّلت المرفقات.', 'Sharing failed; attachments were downloaded.'),
        copied ? 'success' : 'error'
      );
      return;
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
    if (await shareNativeText(url, t('واتساب المباشر', 'Direct WhatsApp'))) {
      hapticSuccess();
      return;
    }
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
                  setHideSuggestions(false);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                aria-expanded={suggestions.length > 0}
                placeholder="0770 000 0000 · @name"
                aria-label={t('رقم الهاتف أو اسم المستخدم', 'Phone number or username')}
                style={{ paddingInlineEnd: 52 }}
              />
            </div>
          </div>
          {suggestions.length ? (
            <div
              className="list"
              role="listbox"
              aria-label={t('الوجهات المحفوظة', 'Saved destinations')}
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                overflow: 'hidden',
                marginTop: 2
              }}
            >
              {suggestions.map((destination) => {
                const display = destination.type === 'phone' ? formatPhone(destination.phone || '') : '@' + (destination.username || '');
                return (
                  <button
                    key={destination.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="list-row"
                    style={{ padding: '8px 10px', textAlign: 'start', borderRadius: 10 }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setRaw(destination.type === 'phone' ? destination.phone || '' : '@' + (destination.username || ''));
                      setError(null);
                      setHideSuggestions(true);
                      hapticTap();
                    }}
                  >
                    <span className="avatar" style={{ width: 32, height: 32, borderRadius: 11, fontSize: 11 }}>
                      {initials(destination.label)}
                    </span>
                    <span className="list-main">
                      <span className="list-title">{destination.label}</span>
                      <span className="list-sub" dir="ltr">
                        {display}
                      </span>
                    </span>
                    {destination.favorite ? <Icon name="star" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
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

        <ComposeMedia
          items={media}
          busy={mediaBusy}
          error={mediaError}
          onFiles={(files) => void handleFiles(files)}
          onContact={() => void addContactCard()}
          onLocation={addLocation}
          onRemove={removeMedia}
        />

        <ComposePreview target={validTarget} message={message} media={media} />

        {templates.length ? (
          <div className="col" style={{ gap: 8 }}>
            <div className="section-head">
              <span className="section-title">{t('قوالب سريعة', 'Quick templates')}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
                {t('الكل', 'All')}
              </Button>
            </div>
            <div className="chip-row">
              {templates.slice(0, 12).map((template) => {
                const localized = localizedTemplate(template, t);
                return (
                  <Chip key={template.id} title={localized.title} onClick={() => insertTemplate(localized.body)}>
                    {localized.title}
                  </Chip>
                );
              })}
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
          <Icon name={media.length ? 'share' : 'whatsapp'} size={19} />
          {media.length
            ? t('مشاركة المرفقات عبر واتساب', 'Share attachments via WhatsApp')
            : t('مراسلة عبر واتساب', 'Message on WhatsApp')}
        </Button>

        {media.length ? (
          <Button
            variant="ghost"
            size="sm"
            block
            onClick={() => {
              const target = resolveTarget();
              if (!target) return;
              openChat(target, message);
              toast(t('فُتحت المحادثة — أرفق الملفات من داخل واتساب.', 'Chat opened — attach the files inside WhatsApp.'), 'success');
            }}
          >
            <Icon name="whatsapp" size={15} />
            {t('فتح المحادثة فقط', 'Open chat only')}
          </Button>
        ) : null}

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
          <Button variant="ghost" size="sm" className="grow" onClick={openSchedule}>
            <Icon name="calendar" size={16} />
            {t('جدولة', 'Schedule')}
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
      <ReminderEditorSheet
        open={scheduleOpen}
        defaultWorkspaceId={workspace?.id || 'personal'}
        preset={schedulePreset ?? undefined}
        onClose={() => setScheduleOpen(false)}
        onSaved={() => setScheduleOpen(false)}
      />
    </div>
  );
}
