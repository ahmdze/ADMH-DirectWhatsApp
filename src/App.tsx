import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BottomNav, type TabKey } from './components/BottomNav';
import { InstallBanner } from './components/InstallBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { Icon, AppLogo } from './components/icons';
import { Button, IconButton, Sheet, ToastHost } from './components/ui';
import { useI18n } from './lib/i18n';
import { navigate, useRoute } from './lib/router';
import { applyAppearance, updateSettings, useSettings, watchSystemTheme } from './lib/settings';
import { isSessionUnlocked, markSessionUnlocked } from './lib/lock';
import { useActiveWorkspace, useDueReminders, useWorkspaces } from './hooks/useData';
import { useOnline } from './lib/install';
import { usePwaState } from './lib/pwa';
import { consumeLaunchParams, setDraft } from './lib/launch';
import { updateReminder } from './lib/db';
import { hapticSuccess } from './lib/haptics';
import { parseTarget } from './lib/phone';
import { takeSharedImage } from './lib/sharedImage';
import { getStorageInfo } from './lib/storage';
import { notificationPermission, notifyDueReminders } from './lib/notifications';
import { APP_VERSION } from './lib/changelog';
import { toast } from './lib/toast';
import { Onboarding } from './components/Onboarding';
import { WhatsNew } from './components/WhatsNew';
import { LockScreen } from './features/settings/LockScreen';

const ComposeScreen = lazy(() => import('./features/compose/ComposeScreen').then((module) => ({ default: module.ComposeScreen })));
const TargetsScreen = lazy(() => import('./features/targets/TargetsScreen').then((module) => ({ default: module.TargetsScreen })));
const TemplatesScreen = lazy(() => import('./features/templates/TemplatesScreen').then((module) => ({ default: module.TemplatesScreen })));
const ToolsScreen = lazy(() => import('./features/tools/ToolsScreen').then((module) => ({ default: module.ToolsScreen })));
const QrGenerateScreen = lazy(() => import('./features/tools/QrGenerateScreen').then((module) => ({ default: module.QrGenerateScreen })));
const QrScanScreen = lazy(() => import('./features/tools/QrScanScreen').then((module) => ({ default: module.QrScanScreen })));
const ShareCardScreen = lazy(() => import('./features/tools/ShareCardScreen').then((module) => ({ default: module.ShareCardScreen })));
const LabelsScreen = lazy(() => import('./features/tools/LabelsScreen').then((module) => ({ default: module.LabelsScreen })));
const VCardScreen = lazy(() => import('./features/tools/VCardScreen').then((module) => ({ default: module.VCardScreen })));
const BackupScreen = lazy(() => import('./features/tools/BackupScreen').then((module) => ({ default: module.BackupScreen })));
const StatsScreen = lazy(() => import('./features/tools/StatsScreen').then((module) => ({ default: module.StatsScreen })));
const ImportScreen = lazy(() => import('./features/tools/ImportScreen').then((module) => ({ default: module.ImportScreen })));
const CampaignsScreen = lazy(() => import('./features/tools/CampaignsScreen').then((module) => ({ default: module.CampaignsScreen })));
const RemindersScreen = lazy(() => import('./features/tools/RemindersScreen').then((module) => ({ default: module.RemindersScreen })));
const SettingsScreen = lazy(() => import('./features/settings/SettingsScreen').then((module) => ({ default: module.SettingsScreen })));

function ScreenSkeleton() {
  return (
    <div className="screen" aria-busy="true">
      <div className="skeleton" style={{ height: 26, width: '55%' }} />
      <div className="skeleton" style={{ height: 90, borderRadius: 26 }} />
      <div className="skeleton" style={{ height: 140, borderRadius: 26 }} />
      <div className="skeleton" style={{ height: 60, borderRadius: 18 }} />
    </div>
  );
}

function TopBar({ onWorkspace, workspaceName }: { onWorkspace: () => void; workspaceName: string }) {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <AppLogo size={40} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 className="brand-title">{t('واتساب المباشر', 'Direct WhatsApp')}</h1>
          <p className="brand-sub">{t('بدون حفظ الرقم', 'No number saved')}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="chip"
          onClick={onWorkspace}
          aria-label={t('تبديل مساحة العمل', 'Switch workspace')}
          style={{ maxWidth: 128, height: 34 }}
        >
          <Icon name="briefcase" size={13} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{workspaceName}</span>
        </button>
        <IconButton name="settings" label={t('الإعدادات', 'Settings')} onClick={() => navigate('/settings')} />
      </div>
    </header>
  );
}

function WorkspaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const workspaces = useWorkspaces();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('مساحة العمل', 'Workspace')}
      subtitle={t('افصل أرقام العمل عن أرقامك الشخصية.', 'Keep work numbers separate from personal ones.')}
      footer={
        <Button
          variant="soft"
          block
          onClick={() => {
            onClose();
            navigate('/settings');
          }}
        >
          {t('إدارة المساحات', 'Manage workspaces')}
        </Button>
      }
    >
      <div className="list">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            className="list-row"
            style={{ background: settings.activeWorkspaceId === workspace.id ? 'var(--accent-soft)' : undefined }}
            onClick={() => {
              updateSettings({ activeWorkspaceId: workspace.id });
              onClose();
              hapticSuccess();
            }}
          >
            <span className="avatar" style={{ background: workspace.color + '26', color: workspace.color }}>
              <Icon name="briefcase" size={18} />
            </span>
            <span className="list-main">
              <span className="list-title">{locale === 'en' ? workspace.nameEn : workspace.name}</span>
            </span>
            {settings.activeWorkspaceId === workspace.id ? <Icon name="check" size={18} /> : null}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function DueRemindersSheet({ open, onClose, workspaceId }: { open: boolean; onClose: () => void; workspaceId: string | undefined }) {
  const { t, rel } = useI18n();
  const due = useDueReminders(workspaceId);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('تذكيرات مستحقة', 'Reminders due')}
      subtitle={t('هذه تذكيرات حان وقتها. تظهر عند فتح التطبيق فقط.', 'These reminders are due. They appear when the app opens.')}
      footer={
        <Button variant="primary" block onClick={onClose}>
          {t('تم', 'Done')}
        </Button>
      }
    >
      <div className="list">
        {due.map((reminder) => (
          <div key={reminder.id} className="list-row">
            <span className="avatar">
              <Icon name="bell" size={18} />
            </span>
            <div className="list-main">
              <span className="list-title">{reminder.label}</span>
              <span className="list-sub">
                {reminder.note || reminder.display} · {rel(reminder.dueAt)}
              </span>
            </div>
            <Button
              size="sm"
              variant="soft"
              onClick={async () => {
                await updateReminder(reminder.id, { done: true });
                hapticSuccess();
              }}
            >
              {t('إنجاز', 'Done')}
            </Button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function renderRoute(path: string[]) {
  const first = path[0] || 'compose';
  switch (first) {
    case 'compose':
      return <ComposeScreen />;
    case 'targets':
      return <TargetsScreen />;
    case 'templates':
      return <TemplatesScreen />;
    case 'tools': {
      switch (path[1]) {
        case 'qr':
          return <QrGenerateScreen />;
        case 'scan':
          return <QrScanScreen />;
        case 'card':
          return <ShareCardScreen />;
        case 'labels':
          return <LabelsScreen />;
        case 'vcard':
          return <VCardScreen />;
        case 'backup':
          return <BackupScreen />;
        case 'stats':
          return <StatsScreen />;
        case 'import':
          return <ImportScreen />;
        case 'campaigns':
          return <CampaignsScreen />;
        case 'reminders':
          return <RemindersScreen />;
        default:
          return <ToolsScreen />;
      }
    }
    case 'settings':
      return <SettingsScreen />;
    default:
      return <ComposeScreen />;
  }
}

export default function App() {
  const { t, locale, phoneError } = useI18n();
  const settings = useSettings();
  const path = useRoute();
  const workspace = useActiveWorkspace();
  const online = useOnline();
  const { needRefresh } = usePwaState();
  const [workspaceSheet, setWorkspaceSheet] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [whatsNewClosed, setWhatsNewClosed] = useState(false);
  const [unlocked, setUnlocked] = useState(() => !settings.lock.enabled || isSessionUnlocked());

  const first = path[0] || 'compose';
  const isTab = path.length === 1 && (first === 'compose' || first === 'targets' || first === 'templates' || first === 'tools');
  const tab: TabKey = (isTab ? first : 'compose') as TabKey;
  const workspaceName = workspace ? (locale === 'en' ? workspace.nameEn : workspace.name) : t('شخصي', 'Personal');
  const due = useDueReminders(workspace?.id);
  const showOnboarding = !settings.onboarded && !introDone;
  const showWhatsNew = settings.onboarded && settings.lastSeenVersion !== APP_VERSION && !whatsNewClosed;

  useEffect(() => {
    applyAppearance(settings);
    const unwatch = watchSystemTheme();
    return unwatch;
  }, [settings]);

  useEffect(() => {
    const info = consumeLaunchParams();
    if (info.draft) setDraft(info.draft);
    if (info.sharedImage) {
      void (async () => {
        const file = await takeSharedImage();
        if (!file) {
          toast(t('لم يتم العثور على صورة مشتركة.', 'No shared image was found.'), 'error');
          return;
        }
        try {
          const { decodeImageFile } = await import('./lib/scan');
          const value = await decodeImageFile(file);
          if (!value) {
            toast(t('لم نعثر على رمز QR واضح في الصورة.', 'No clear QR code was found in the image.'), 'error');
            navigate('/tools/scan');
            return;
          }
          const parsed = parseTarget(value, { country: settings.defaultCountry });
          if (!parsed.ok) {
            toast(phoneError(parsed.code), 'error');
            return;
          }
          setDraft({ raw: value, origin: 'share' });
          navigate('/compose');
          toast(t('تمت قراءة الوجهة من الصورة المشتركة.', 'Destination read from the shared image.'), 'success');
        } catch {
          toast(t('تعذّرت قراءة الصورة المشتركة.', 'Could not read the shared image.'), 'error');
        }
      })();
    }
    if (info.action === 'scan') navigate('/tools/scan');
    else if (info.action === 'compose') navigate('/compose');

    void getStorageInfo().then((info) => {
      if (info.percent === null || info.percent < 85) return;
      try {
        if (sessionStorage.getItem('admh2_storage_warned')) return;
        sessionStorage.setItem('admh2_storage_warned', '1');
      } catch {
        /* ignore */
      }
      toast(t('المساحة المتاحة للتطبيق تقترب من الامتلاء. راجع الإعدادات.', 'App storage is almost full. Check Settings.'), 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settings.lock.enabled) setUnlocked(true);
  }, [settings.lock.enabled]);

  useEffect(() => {
    // Allow the Settings screen to re-open the tour by resetting `onboarded`.
    if (!settings.onboarded) setIntroDone(false);
  }, [settings.onboarded]);

  useEffect(() => {
    if (!due.length) return;
    try {
      if (sessionStorage.getItem('admh2_due_prompted')) return;
      sessionStorage.setItem('admh2_due_prompted', '1');
    } catch {
      /* ignore */
    }
    if (settings.notifications && notificationPermission() === 'granted') {
      void notifyDueReminders(due, t('تذكير متابعة', 'Follow-up reminder')).then((shown) => {
        if (!shown) setDueOpen(true);
      });
      return;
    }
    setDueOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due.length, settings.notifications]);

  const page = useMemo(() => renderRoute(path), [path]);

  if (settings.lock.enabled && !unlocked) {
    return (
      <>
        <div className="aurora-bg" aria-hidden="true" />
        <LockScreen
          onUnlocked={() => {
            markSessionUnlocked();
            setUnlocked(true);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="aurora-bg" aria-hidden="true" />
      <div className="app-shell">
        <main className="app-main">
          {isTab ? <TopBar onWorkspace={() => setWorkspaceSheet(true)} workspaceName={workspaceName} /> : null}
          <Suspense fallback={<ScreenSkeleton />}>{page}</Suspense>
        </main>
      </div>

      {!online ? (
        <div className="offline-pill" role="status">
          <Icon name="wifiOff" size={13} />
          {t('أنت غير متصل — الوظائف المحلية تعمل', 'You are offline — local features still work')}
        </div>
      ) : null}

      {isTab ? <BottomNav active={tab} /> : null}
      {needRefresh ? <UpdateBanner /> : <InstallBanner />}
      <ToastHost />

      <WorkspaceSheet open={workspaceSheet} onClose={() => setWorkspaceSheet(false)} />
      <DueRemindersSheet open={dueOpen} onClose={() => setDueOpen(false)} workspaceId={workspace?.id} />

      {showOnboarding ? (
        <Onboarding
          onDone={() => {
            updateSettings({ onboarded: true, lastSeenVersion: APP_VERSION });
            setIntroDone(true);
          }}
        />
      ) : null}
      <WhatsNew
        open={showWhatsNew && !showOnboarding && !dueOpen}
        onClose={() => {
          updateSettings({ lastSeenVersion: APP_VERSION });
          setWhatsNewClosed(true);
        }}
      />
    </>
  );
}
