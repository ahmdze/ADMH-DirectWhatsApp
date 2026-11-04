import { useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from '../../components/icons';
import { Button, ConfirmSheet, HintCard, IconButton, ScreenHeader, Segmented, Sheet, Spinner, Switch } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { ACCENTS, updateSettings, useSettings } from '../../lib/settings';
import { useWorkspaces } from '../../hooks/useData';
import { COUNTRIES, countryByIso } from '../../lib/phone';
import { clearAllData, removeWorkspace } from '../../lib/db';
import { goBack, navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess, hapticTap } from '../../lib/haptics';
import { formatBytes } from '../../lib/image';
import { isStandalone } from '../../lib/format';
import { promptInstall } from '../../lib/install';
import { biometricAvailable, registerBiometric } from '../../lib/webauthn';
import { CountrySheet } from './CountrySheet';
import { WorkspaceSheet } from './WorkspaceSheet';
import { PinSheet, type PinSheetMode } from './PinSheet';
import type { Locale, ThemeMode, Workspace } from '../../types';

const APP_VERSION = '2.0.0';

const SECTION_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 13 };
const LIST_STYLE: CSSProperties = {
  margin: 0,
  paddingInlineStart: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 12,
  lineHeight: 1.7,
  color: 'var(--muted)'
};

const WORKSPACE_ICONS: Record<string, IconName> = {
  user: 'user',
  briefcase: 'briefcase',
  folder: 'folder',
  star: 'star',
  users: 'users'
};

/**
 * Settings screen (`/settings`): appearance, language, default country,
 * behavior, workspaces, app lock, install/storage/backup and about.
 * Every change is persisted immediately through `updateSettings`.
 */
export function SettingsScreen() {
  const { t, locale, isRTL, n } = useI18n();
  const settings = useSettings();
  const workspaces = useWorkspaces();
  const [installedNow, setInstalledNow] = useState(false);
  const installed = installedNow || isStandalone();

  const [countryOpen, setCountryOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [pinMode, setPinMode] = useState<PinSheetMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  const country = countryByIso(settings.defaultCountry) ?? COUNTRIES[0];
  const countryName = locale === 'en' ? country.en : country.ar;
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === settings.activeWorkspaceId) ?? workspaces[0] ?? null;

  const storageUsed = storage ? formatBytes(storage.usage) : '—';
  const storageTotal = storage && storage.quota > 0 ? formatBytes(storage.quota) : '—';
  const storagePercent =
    storage && storage.quota > 0 ? Math.min(100, Math.round((storage.usage / storage.quota) * 100)) : null;

  useEffect(() => {
    let alive = true;
    void biometricAvailable().then((available) => {
      if (alive) setBioSupported(available);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const manager = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!manager?.estimate) return;
    manager
      .estimate()
      .then((estimate) => {
        if (alive) setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------------------------------------- handlers */

  const changeTheme = (theme: ThemeMode) => {
    updateSettings({ theme });
    if (settings.haptics) hapticTap();
  };

  const changeLocale = (nextLocale: Locale) => {
    if (nextLocale === settings.locale) return;
    updateSettings({ locale: nextLocale });
    if (settings.haptics) hapticTap();
  };

  const changeAccent = (color: string) => {
    if (settings.accent.toLowerCase() === color.toLowerCase()) return;
    updateSettings({ accent: color });
    if (settings.haptics) hapticTap();
  };

  const changeDefaultCountry = (iso: string) => {
    updateSettings({ defaultCountry: iso });
    if (settings.haptics) hapticSuccess();
    toast(t('تم تحديث الدولة الافتراضية.', 'Default country updated.'), 'success');
  };

  const toggleHaptics = (enabled: boolean) => {
    updateSettings({ haptics: enabled });
    if (enabled) hapticTap();
  };

  const toggleHideNumbers = (hidden: boolean) => {
    updateSettings({ hideNumbers: hidden });
    if (settings.haptics) hapticTap();
    toast(hidden ? t('تم إخفاء الأرقام.', 'Numbers are hidden.') : t('تم إظهار الأرقام.', 'Numbers are visible.'), 'success');
  };

  const activateWorkspace = (id: string) => {
    if (settings.activeWorkspaceId === id) return;
    updateSettings({ activeWorkspaceId: id });
    if (settings.haptics) hapticSuccess();
    toast(t('تم تبديل مساحة العمل.', 'Workspace switched.'), 'success');
  };

  const handleWorkspaceCreated = (workspace: Workspace) => {
    updateSettings({ activeWorkspaceId: workspace.id });
  };

  const confirmDeleteWorkspace = async () => {
    const target = deleteTarget;
    if (!target || target.id === 'personal') return;
    try {
      await removeWorkspace(target.id);
      if (settings.activeWorkspaceId === target.id) updateSettings({ activeWorkspaceId: 'personal' });
      if (settings.haptics) hapticSuccess();
      toast(t('تم حذف مساحة العمل.', 'Workspace deleted.'), 'success');
    } catch {
      if (settings.haptics) hapticError();
      toast(t('تعذّر حذف مساحة العمل. حاول مجدداً.', 'Could not delete the workspace. Please try again.'), 'error');
    }
  };

  const enableBiometric = async () => {
    if (bioBusy) return;
    if (!settings.lock.enabled || !settings.lock.hash || !settings.lock.salt) {
      toast(t('فعّل رمز PIN أولاً ثم أضف البصمة.', 'Enable a PIN first, then add biometrics.'), 'error');
      setPinMode('set');
      return;
    }
    setBioBusy(true);
    try {
      const credentialId = await registerBiometric('ADMH Direct WhatsApp');
      if (!credentialId) {
        if (settings.haptics) hapticError();
        toast(
          t(
            'تعذّر تفعيل البصمة. تأكد من دعم الجهاز ومن فتح التطبيق عبر اتصال آمن.',
            'Could not enable biometrics. Make sure the device supports it and the app is served over a secure connection.'
          ),
          'error'
        );
        return;
      }
      updateSettings({ lock: { ...settings.lock, credentialId, method: 'biometric' } });
      if (settings.haptics) hapticSuccess();
      toast(t('تم تفعيل الفتح بالبصمة.', 'Biometric unlock enabled.'), 'success');
    } finally {
      setBioBusy(false);
    }
  };

  const removeBiometric = () => {
    updateSettings({ lock: { ...settings.lock, credentialId: null, method: 'pin' } });
    if (settings.haptics) hapticTap();
    toast(t('تمت إزالة البصمة. سيبقى رمز PIN فعالاً.', 'Biometrics removed. Your PIN still works.'), 'success');
  };

  const handleInstall = async () => {
    if (installed) return;
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setInstalledNow(true);
      if (settings.haptics) hapticSuccess();
      toast(t('تم تثبيت التطبيق.', 'App installed.'), 'success');
      return;
    }
    if (outcome === 'dismissed') {
      toast(t('تم إلغاء التثبيت.', 'Installation cancelled.'));
      return;
    }
    setInstallOpen(true);
  };

  const clearData = async () => {
    try {
      await clearAllData(true);
      updateSettings({ activeWorkspaceId: 'personal' });
      if (settings.haptics) hapticSuccess();
      toast(t('تم مسح البيانات، وبقيت الإعدادات محفوظة.', 'Data cleared. Your settings were kept.'), 'success');
    } catch {
      if (settings.haptics) hapticError();
      toast(t('تعذّر مسح البيانات. حاول مجدداً.', 'Could not clear data. Please try again.'), 'error');
    }
  };

  /* ---------------------------------------------------------------- render */

  return (
    <div className="screen">
      <ScreenHeader
        title={t('الإعدادات', 'Settings')}
        subtitle={t('خصّص المظهر والبيانات. كل شيء محلي على جهازك.', 'Tune the look and your data. Everything stays local on this device.')}
        onBack={() => goBack('/compose')}
      />

      {/* ------------------------------------------------------ appearance */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-appearance">
        <h2 className="section-title" id="settings-appearance">
          {t('المظهر', 'Appearance')}
        </h2>
        <Segmented
          value={settings.theme}
          options={[
            { value: 'dark', label: t('داكن', 'Dark') },
            { value: 'light', label: t('فاتح', 'Light') },
            { value: 'auto', label: t('تلقائي', 'Auto') }
          ]}
          onChange={changeTheme}
        />
        <div className="col" style={{ gap: 8 }}>
          <span className="section-title">{t('لون التمييز', 'Accent color')}</span>
          <div className="grid-3">
            {ACCENTS.map((accent) => {
              const selected = settings.accent.toLowerCase() === accent.color.toLowerCase();
              const accentName = locale === 'en' ? accent.en : accent.ar;
              return (
                <button
                  key={accent.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={accentName}
                  onClick={() => changeAccent(accent.color)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    height: 42,
                    padding: '0 9px',
                    borderRadius: 13,
                    background: selected ? 'var(--accent-soft)' : 'var(--glass-2)',
                    border: selected ? '1px solid var(--accent)' : '1px solid var(--line)'
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 16, height: 16, borderRadius: '50%', background: accent.color, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: selected ? 'var(--accent)' : 'var(--muted)'
                    }}
                  >
                    {accentName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- language */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-language">
        <h2 className="section-title" id="settings-language">
          {t('اللغة', 'Language')}
        </h2>
        <Segmented
          value={settings.locale}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' }
          ]}
          onChange={changeLocale}
        />
        <HintCard icon="globe">
          {t('يتغيّر اتجاه الواجهة (RTL/LTR) تلقائياً حسب اللغة.', 'The interface direction (RTL/LTR) switches automatically with the language.')}
        </HintCard>
      </section>

      {/* --------------------------------------------------- default country */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-country">
        <h2 className="section-title" id="settings-country">
          {t('الدولة الافتراضية', 'Default country')}
        </h2>
        <button
          type="button"
          className="list-row"
          style={{ width: '100%', textAlign: 'start', paddingInline: 2 }}
          onClick={() => setCountryOpen(true)}
        >
          <span className="avatar" style={{ fontSize: 18 }} aria-hidden="true">
            {country.flag}
          </span>
          <span className="list-main">
            <span className="list-title">{countryName}</span>
            <span className="list-sub" dir="ltr">
              +{country.dial}
            </span>
          </span>
          <Icon name={isRTL ? 'chevronLeft' : 'chevronRight'} size={18} />
        </button>
      </section>

      {/* ---------------------------------------------------------- behavior */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-behavior">
        <h2 className="section-title" id="settings-behavior">
          {t('السلوك', 'Behavior')}
        </h2>
        <Switch
          checked={settings.haptics}
          onChange={toggleHaptics}
          label={t('الاهتزاز', 'Haptics')}
          description={t('اهتزاز خفيف عند اللمس والنجاح والأخطاء.', 'A light vibration on taps, success and errors.')}
        />
        <div className="divider" />
        <Switch
          checked={settings.hideNumbers}
          onChange={toggleHideNumbers}
          label={t('إخفاء الأرقام', 'Hide numbers')}
          description={t('تمويه الأرقام الحساسة حتى تلمسها.', 'Blur sensitive numbers until you tap them.')}
        />
      </section>

      {/* -------------------------------------------------------- workspaces */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-workspaces">
        <div className="section-head">
          <h2 className="section-title" id="settings-workspaces">
            {t('مساحات العمل', 'Workspaces')}
          </h2>
          <Button size="sm" variant="soft" onClick={() => setWorkspaceOpen(true)}>
            <Icon name="plus" size={15} />
            {t('إضافة', 'Add')}
          </Button>
        </div>

        {workspaces.length === 0 ? (
          <div className="row" style={{ justifyContent: 'center', padding: 12 }}>
            <Spinner size={20} />
          </div>
        ) : (
          <div className="list">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;
              const iconName = WORKSPACE_ICONS[workspace.icon] ?? 'briefcase';
              const localName = locale === 'en' ? workspace.nameEn || workspace.name : workspace.name;
              return (
                <div key={workspace.id} className="list-row">
                  <span
                    className="avatar"
                    aria-hidden="true"
                    style={{
                      background: `color-mix(in srgb, ${workspace.color} 18%, transparent)`,
                      color: workspace.color
                    }}
                  >
                    <Icon name={iconName} size={18} />
                  </span>
                  <div className="list-main">
                    <span className="list-title">{localName}</span>
                    <span className="list-sub">
                      {isActive ? t('المساحة النشطة', 'Active workspace') : t('مساحة محلية', 'Local workspace')}
                    </span>
                  </div>
                  <div className="list-actions">
                    {isActive ? (
                      <span className="badge accent">
                        <Icon name="check" size={10} />
                        {t('نشطة', 'Active')}
                      </span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => activateWorkspace(workspace.id)}>
                        {t('تبديل', 'Switch')}
                      </Button>
                    )}
                    {workspace.id !== 'personal' ? (
                      <IconButton
                        name="trash"
                        label={t('حذف المساحة', 'Delete workspace')}
                        variant="plain"
                        onClick={() => setDeleteTarget(workspace)}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <HintCard icon="info">
          {t('مساحة «شخصي» هي المساحة الأساسية ولا يمكن حذفها.', 'The “Personal” workspace is the primary one and cannot be deleted.')}
        </HintCard>
      </section>

      {/* -------------------------------------------------------------- lock */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-lock">
        <div className="section-head">
          <h2 className="section-title" id="settings-lock">
            {t('قفل التطبيق', 'App lock')}
          </h2>
          {settings.lock.enabled ? <span className="badge accent">{t('مفعّل', 'On')}</span> : null}
        </div>

        <Switch
          checked={settings.lock.enabled}
          onChange={(next) => {
            if (settings.haptics) hapticTap();
            setPinMode(next ? 'set' : 'disable');
          }}
          label={t('قفل التطبيق', 'App lock')}
          description={
            settings.lock.enabled
              ? t('يُطلب رمز PIN عند كل فتح للتطبيق.', 'A PIN is required every time the app opens.')
              : t('اطلب رمز PIN عند فتح التطبيق.', 'Require a PIN when the app opens.')
          }
        />

        {settings.lock.enabled ? (
          <div className="grid-2">
            <Button variant="soft" size="sm" onClick={() => setPinMode('change')}>
              <Icon name="key" size={15} />
              {t('تغيير الرمز', 'Change PIN')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPinMode('disable')}>
              <Icon name="unlock" size={15} />
              {t('تعطيل القفل', 'Disable')}
            </Button>
          </div>
        ) : null}

        {bioSupported || settings.lock.credentialId ? (
          <>
            <div className="divider" />
            <div className="row-between" style={{ gap: 10 }}>
              <div className="row" style={{ minWidth: 0 }}>
                <span className="avatar" style={{ width: 36, height: 36, borderRadius: 13 }} aria-hidden="true">
                  <Icon name="user" size={18} />
                </span>
                <div className="col" style={{ minWidth: 0 }}>
                  <span className="list-title">{t('فتح بالبصمة', 'Biometric unlock')}</span>
                  <span className="list-sub">
                    {settings.lock.credentialId
                      ? t('مفعّل على هذا الجهاز', 'Enabled on this device')
                      : t('متاح على هذا الجهاز', 'Available on this device')}
                  </span>
                </div>
              </div>
              {settings.lock.credentialId ? (
                <Button size="sm" variant="ghost" onClick={removeBiometric}>
                  {t('إزالة', 'Remove')}
                </Button>
              ) : (
                <Button size="sm" variant="soft" loading={bioBusy} onClick={() => void enableBiometric()}>
                  {t('تفعيل', 'Enable')}
                </Button>
              )}
            </div>
          </>
        ) : null}

        <HintCard icon="shield">
          {t(
            'يُحفظ رمز PIN كبصمة مشفّرة (PBKDF2) على جهازك فقط؛ لا خادم ولا يمكن استعادته. عند نسيانه يمكنك مسح بيانات التطبيق يدوياً.',
            'The PIN is stored only as a PBKDF2 hash on your device; there is no server and it cannot be recovered. If forgotten, you can clear the app data manually.'
          )}
        </HintCard>
      </section>

      {/* --------------------------------------------------------------- app */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-app">
        <h2 className="section-title" id="settings-app">
          {t('التطبيق', 'App')}
        </h2>

        <div className="list">
          <div className="list-row" style={{ paddingInline: 2 }}>
            <span className="avatar" style={{ width: 36, height: 36, borderRadius: 13 }} aria-hidden="true">
              <Icon name="install" size={18} />
            </span>
            <div className="list-main">
              <span className="list-title">{t('تثبيت التطبيق', 'Install app')}</span>
              <span className="list-sub">
                {installed
                  ? t('مثبَّت بالفعل على هذا الجهاز', 'Already installed on this device')
                  : t('أضف التطبيق إلى الشاشة الرئيسية', 'Add the app to your home screen')}
              </span>
            </div>
            <Button
              size="sm"
              variant={installed ? 'ghost' : 'soft'}
              disabled={installed}
              onClick={() => void handleInstall()}
            >
              {installed ? t('مثبَّت', 'Installed') : t('تثبيت', 'Install')}
            </Button>
          </div>

          <div className="divider" />

          <div className="col" style={{ gap: 8 }}>
            <span className="section-title">{t('حالة التخزين', 'Storage status')}</span>
            <div className="grid-2">
              <div className="stat-card">
                <b style={{ fontSize: 17 }}>{storageUsed}</b>
                <small>{t('المستخدم من التخزين', 'Storage used')}</small>
              </div>
              <div className="stat-card">
                <b style={{ fontSize: 17 }}>{storageTotal}</b>
                <small>{t('المساحة المتاحة', 'Storage available')}</small>
              </div>
            </div>
            {storagePercent !== null ? (
              <p className="page-sub" style={{ margin: 0 }}>
                {t(
                  `تم استخدام ${n(storagePercent)}% من المساحة المتاحة للتطبيق.`,
                  `Used ${storagePercent}% of the storage available to the app.`
                )}
              </p>
            ) : (
              <p className="page-sub" style={{ margin: 0 }}>
                {t('لا يمكن قراءة تقدير التخزين على هذا المتصفح.', 'Storage estimates are not available in this browser.')}
              </p>
            )}
          </div>

          <div className="divider" />

          <div className="list-row" style={{ paddingInline: 2 }}>
            <span className="avatar" style={{ width: 36, height: 36, borderRadius: 13 }} aria-hidden="true">
              <Icon name="download" size={18} />
            </span>
            <div className="list-main">
              <span className="list-title">{t('نسخة احتياطية سريعة', 'Quick backup')}</span>
              <span className="list-sub">{t('صدّر أو استورد بياناتك من أدوات النسخ الاحتياطي', 'Export or import your data from the backup tools')}</span>
            </div>
            <Button size="sm" variant="soft" onClick={() => navigate('/tools/backup')}>
              {t('فتح', 'Open')}
            </Button>
          </div>

          <div className="divider" />

          <div className="list-row" style={{ paddingInline: 2 }}>
            <span className="avatar" style={{ width: 36, height: 36, borderRadius: 13 }} aria-hidden="true">
              <Icon name="info" size={18} />
            </span>
            <div className="list-main">
              <span className="list-title">{t('الإصدار', 'Version')}</span>
              <span className="list-sub">{t('واتساب المباشر', 'Direct WhatsApp')}</span>
            </div>
            <span className="badge" dir="ltr">
              {APP_VERSION}
            </span>
          </div>

          <div className="divider" />

          <div className="list-row" style={{ paddingInline: 2 }}>
            <span className="avatar" style={{ width: 36, height: 36, borderRadius: 13, color: 'var(--danger)', background: 'var(--danger-soft)' }} aria-hidden="true">
              <Icon name="trash" size={18} />
            </span>
            <div className="list-main">
              <span className="list-title">{t('مسح البيانات', 'Clear data')}</span>
              <span className="list-sub">{t('حذف كل الوجهات والقوالب والسجل نهائياً', 'Permanently delete all destinations, templates and history')}</span>
            </div>
            <Button size="sm" variant="danger" onClick={() => setClearOpen(true)}>
              {t('مسح', 'Clear')}
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- about */}
      <section className="glass card" style={SECTION_STYLE} aria-labelledby="settings-about">
        <h2 className="section-title" id="settings-about">
          {t('عن التطبيق', 'About')}
        </h2>
        <p className="page-sub" style={{ margin: 0 }}>
          {t(
            'واتساب المباشر — تطبيق PWA عربي لفتح محادثة واتساب دون حفظ الرقم، مع وجهات وقوالب ورموز QR ومساحات عمل. لا إرسال تلقائي.',
            'Direct WhatsApp — an Arabic PWA that opens a WhatsApp chat without saving the number, with destinations, templates, QR codes and workspaces. No automatic sending.'
          )}
        </p>
        <HintCard icon="shield">
          {t(
            'الخصوصية أولاً: كل البيانات محلية في IndexedDB على جهازك. لا خادم، لا تتبّع، ولا تُرسل أي بيانات إلى طرف ثالث.',
            'Privacy first: all data lives locally in IndexedDB on your device. No server, no tracking, and no data is sent to third parties.'
          )}
        </HintCard>
        <div className="row-between">
          <span className="text-muted" style={{ fontSize: 12 }}>
            {t('المطوّر', 'Developer')}
          </span>
          <span style={{ fontWeight: 800 }}>ADMH - احمد زياد | جميع الحقوق محفوظة 2026</span>
        </div>
      </section>

      {/* ------------------------------------------------------------- sheets */}
      <CountrySheet
        open={countryOpen}
        selected={settings.defaultCountry}
        onSelect={changeDefaultCountry}
        onClose={() => setCountryOpen(false)}
      />

      <WorkspaceSheet open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} onCreated={handleWorkspaceCreated} />

      <PinSheet open={pinMode !== null} mode={pinMode ?? 'set'} onClose={() => setPinMode(null)} />

      <ConfirmSheet
        open={deleteTarget !== null}
        title={t('حذف مساحة العمل', 'Delete workspace')}
        description={t(
          'سيتم حذف كل الوجهات والقوالب والسجل الخاصة بهذه المساحة نهائياً. لا يمكن التراجع.',
          'All destinations, templates and history in this workspace will be permanently deleted. This cannot be undone.'
        )}
        confirmLabel={t('حذف', 'Delete')}
        danger
        onConfirm={() => {
          void confirmDeleteWorkspace();
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmSheet
        open={clearOpen}
        title={t('مسح كل البيانات', 'Clear all data')}
        description={t(
          'سيتم حذف الوجهات والقوالب والسجل والحملات والتذكيرات نهائياً. ستبقى إعداداتك (المظهر واللغة والقفل) محفوظة. لا يمكن التراجع.',
          'Destinations, templates, history, campaigns and reminders will be permanently deleted. Your settings (appearance, language, lock) are kept. This cannot be undone.'
        )}
        confirmLabel={t('مسح الكل', 'Clear all')}
        danger
        onConfirm={() => {
          void clearData();
        }}
        onClose={() => setClearOpen(false)}
      />

      <Sheet
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title={t('تثبيت التطبيق', 'Install the app')}
        subtitle={t('أضف التطبيق إلى الشاشة الرئيسية ليعمل مثل تطبيق مستقل.', 'Add the app to your home screen so it works like a standalone app.')}
        footer={
          <Button block variant="primary" onClick={() => setInstallOpen(false)}>
            {t('تم', 'Done')}
          </Button>
        }
      >
        {installed ? (
          <HintCard icon="check">{t('التطبيق مثبَّت بالفعل على هذا الجهاز.', 'The app is already installed on this device.')}</HintCard>
        ) : null}

        <div className="col" style={{ gap: 6 }}>
          <span className="section-title">{t('آيفون / آيباد — Safari', 'iPhone / iPad — Safari')}</span>
          <ol style={LIST_STYLE}>
            <li>{t('افتح التطبيق في متصفح Safari.', 'Open the app in Safari.')}</li>
            <li>{t('اضغط زر المشاركة (مربع مع سهم).', 'Tap the Share button (square with an arrow).')}</li>
            <li>{t('اختر «إضافة إلى الشاشة الرئيسية».', 'Choose “Add to Home Screen”.')}</li>
          </ol>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <span className="section-title">{t('أندرويد — Chrome', 'Android — Chrome')}</span>
          <ol style={LIST_STYLE}>
            <li>{t('افتح التطبيق في متصفح Chrome.', 'Open the app in Chrome.')}</li>
            <li>{t('اضغط قائمة النقاط الثلاث أعلى المتصفح.', 'Open the three-dot menu at the top of the browser.')}</li>
            <li>{t('اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'Choose “Install app” or “Add to Home screen”.')}</li>
          </ol>
        </div>
      </Sheet>
    </div>
  );
}
