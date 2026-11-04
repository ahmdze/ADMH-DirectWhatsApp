import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, ConfirmSheet, EmptyState, HintCard, IconButton, ScreenHeader, Sheet, Switch } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack, navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useActiveWorkspace, useDestinations, useHistory } from '../../hooks/useData';
import { downloadBackup, importBackup, validateBackup, type ImportResult } from '../../lib/backup';
import { exportDestinationsCsv, exportHistoryCsv } from '../../lib/csv';
import { clearAllData } from '../../lib/db';
import { formatBytes, readFileAsText } from '../../lib/image';
import type { BackupFile } from '../../types';

type BusyKind = 'export' | 'import' | 'clear' | null;

interface StorageInfo {
  usage: number;
  quota: number;
}

interface ImportRecord {
  mode: 'merge' | 'replace';
  at: number;
  result: ImportResult;
}

export function BackupScreen() {
  const { t, n, date, time } = useI18n();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const history = useHistory(workspace?.id, 300);

  const [includeSettings, setIncludeSettings] = useState(true);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageUnsupported, setStorageUnsupported] = useState(false);
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [importIncludeSettings, setImportIncludeSettings] = useState(true);
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [clearFirstConfirm, setClearFirstConfirm] = useState(false);
  const [clearFinalConfirm, setClearFinalConfirm] = useState(false);
  const [lastImport, setLastImport] = useState<ImportRecord | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadStorage = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      setStorageUnsupported(true);
      return;
    }
    try {
      const estimate = await navigator.storage.estimate();
      setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
      setStorageUnsupported(false);
    } catch {
      setStorageUnsupported(true);
    }
  }, []);

  useEffect(() => {
    void loadStorage();
  }, [loadStorage]);

  const closeSummary = () => {
    setSummaryOpen(false);
    setPendingImport(null);
  };

  const handleExport = async () => {
    setBusy('export');
    try {
      await downloadBackup(includeSettings);
      hapticSuccess();
      toast(t('تم تصدير النسخة الاحتياطية', 'Backup exported'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر تصدير النسخة الاحتياطية', 'Could not export the backup'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    setBusy('import');
    setImportError('');
    try {
      const text = await readFileAsText(file);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setImportError(t('الملف ليس JSON صالحاً. تأكد أنه ملف نسخة احتياطية من هذا التطبيق.', 'The file is not valid JSON. Make sure it is a backup file from this app.'));
        hapticError();
        return;
      }
      const validation = validateBackup(parsed);
      if (!validation.ok || !validation.data) {
        const reason =
          validation.error === 'unsupported'
            ? t('إصدار النسخة الاحتياطية غير مدعوم. حدّث التطبيق أو استخدم ملفاً أحدث.', 'This backup version is not supported. Update the app or use a newer file.')
            : validation.error === 'empty'
              ? t('الملف لا يحتوي بيانات قابلة للاستيراد.', 'The file does not contain any importable data.')
              : t('الملف ليس نسخة احتياطية صالحة من هذا التطبيق.', 'This is not a valid backup from this app.');
        setImportError(reason);
        hapticError();
        toast(reason, 'error');
        return;
      }
      setPendingImport(validation.data);
      setImportIncludeSettings(Boolean(validation.data.settings));
      setSummaryOpen(true);
    } catch {
      setImportError(t('تعذّرت قراءة الملف من الجهاز.', 'Could not read the file from this device.'));
      hapticError();
      toast(t('تعذّرت قراءة الملف', 'Could not read the file'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const runImport = async (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    setBusy('import');
    try {
      const result = await importBackup(pendingImport, mode, importIncludeSettings && Boolean(pendingImport.settings));
      setLastImport({ mode, at: Date.now(), result });
      setPendingImport(null);
      setSummaryOpen(false);
      hapticSuccess();
      toast(t('تم استيراد النسخة الاحتياطية بنجاح', 'Backup imported successfully'), 'success');
      await loadStorage();
    } catch {
      hapticError();
      toast(t('تعذّر استيراد النسخة الاحتياطية', 'Could not import the backup'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const clearEverything = async () => {
    setBusy('clear');
    try {
      await clearAllData(false);
      setLastImport(null);
      hapticSuccess();
      toast(t('تم مسح كل البيانات من هذا الجهاز', 'All data cleared from this device'), 'success');
      await loadStorage();
    } catch {
      hapticError();
      toast(t('تعذّر مسح البيانات', 'Could not clear the data'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const exportDestinations = () => {
    if (!destinations.length) return;
    exportDestinationsCsv(destinations);
    hapticSuccess();
    toast(t('تم تصدير ملف الوجهات CSV', 'Destinations CSV exported'), 'success');
  };

  const exportHistory = () => {
    if (!history.length) return;
    exportHistoryCsv(history);
    hapticSuccess();
    toast(t('تم تصدير ملف السجل CSV', 'History CSV exported'), 'success');
  };

  const quotaPercent = storage && storage.quota > 0 ? Math.min(100, Math.round((storage.usage / storage.quota) * 100)) : 0;

  const summaryRows = pendingImport
    ? [
        { key: 'workspaces', label: t('مساحات العمل', 'Workspaces'), value: pendingImport.workspaces.length },
        { key: 'destinations', label: t('الوجهات', 'Destinations'), value: pendingImport.destinations.length },
        { key: 'templates', label: t('القوالب', 'Templates'), value: pendingImport.templates.length },
        { key: 'history', label: t('السجل', 'History'), value: pendingImport.history.length },
        { key: 'campaigns', label: t('الحملات', 'Campaigns'), value: pendingImport.campaigns.length },
        { key: 'reminders', label: t('التذكيرات', 'Reminders'), value: pendingImport.reminders.length }
      ]
    : [];

  const exportedAt = pendingImport ? new Date(pendingImport.exportedAt).getTime() : Number.NaN;

  const lastResultRows = lastImport
    ? [
        { key: 'destinations', label: t('وجهات', 'destinations'), value: lastImport.result.destinations },
        { key: 'templates', label: t('قوالب', 'templates'), value: lastImport.result.templates },
        { key: 'history', label: t('سجل', 'history'), value: lastImport.result.history },
        { key: 'campaigns', label: t('حملات', 'campaigns'), value: lastImport.result.campaigns },
        { key: 'reminders', label: t('تذكيرات', 'reminders'), value: lastImport.result.reminders }
      ].filter((row) => row.value > 0)
    : [];

  return (
    <div className="screen">
      <ScreenHeader
        title={t('النسخ الاحتياطي', 'Backup')}
        subtitle={t('احفظ بياناتك محلياً واستعدها عند الحاجة — بدون خادم أو حساب.', 'Save your data locally and restore it when needed — no server, no account.')}
        onBack={() => goBack()}
        action={<IconButton name="refresh" label={t('تحديث معلومات التخزين', 'Refresh storage info')} onClick={() => void loadStorage()} variant="plain" />}
      />

      <HintCard icon="shield">
        {t(
          'ملف النسخة الاحتياطية يحتوي أرقاماً ورسائل وملاحظات. احفظه في مكان آمن، ولا تشاركه مع أي شخص.',
          'The backup file contains numbers, messages and notes. Keep it somewhere safe and never share it.'
        )}
      </HintCard>

      <section className="glass card col" style={{ gap: 12 }}>
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}>
            <Icon name="download" size={18} />
            <h2 className="section-title">{t('تصدير JSON', 'Export JSON')}</h2>
          </div>
          <span className="badge">{t('الكل', 'Full')}</span>
        </div>
        <p className="page-sub" style={{ margin: 0 }}>
          {t('نسخة كاملة من الوجهات والقوالب والسجل والحملات والتذكيرات.', 'A complete copy of destinations, templates, history, campaigns and reminders.')}
        </p>
        <Switch
          checked={includeSettings}
          onChange={setIncludeSettings}
          label={t('تضمين الإعدادات', 'Include settings')}
          description={t('المظهر واللغة والدولة الافتراضية وقفل التطبيق.', 'Appearance, language, default country and app lock.')}
        />
        <Button variant="primary" block loading={busy === 'export'} disabled={busy !== null} onClick={() => void handleExport()}>
          <Icon name="download" size={17} />
          {t('تنزيل النسخة الاحتياطية', 'Download backup')}
        </Button>
      </section>

      <section className="glass card col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="upload" size={18} />
          <h2 className="section-title">{t('استيراد نسخة احتياطية', 'Import a backup')}</h2>
        </div>
        <p className="page-sub" style={{ margin: 0 }}>
          {t('اختر ملف JSON صالحاً. سنعرض لك ملخصاً قبل أي تعديل على بياناتك.', 'Pick a valid JSON file. You will see a summary before anything changes.')}
        </p>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => void handleFileChange(event)} />
        <Button variant="soft" block loading={busy === 'import'} disabled={busy !== null} onClick={() => fileRef.current?.click()}>
          <Icon name="folder" size={17} />
          {t('اختيار ملف JSON', 'Choose a JSON file')}
        </Button>
        {importError ? (
          <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
            {importError}
          </p>
        ) : null}
        {lastImport ? (
          <div className="glass-soft col" style={{ gap: 6, padding: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="check" size={15} style={{ color: 'var(--accent)' }} />
              <b style={{ fontSize: 12.5 }}>
                {lastImport.mode === 'replace'
                  ? t('تم الاستبدال بنجاح', 'Replaced successfully')
                  : t('تم الدمج بنجاح', 'Merged successfully')}
              </b>
            </div>
            <span className="list-sub">
              {date(lastImport.at)} · {time(lastImport.at)}
            </span>
            {lastResultRows.length ? (
              <span className="list-sub">
                {lastResultRows.map((row) => `${n(row.value)} ${row.label}`).join(' · ')}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="glass card col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="fileText" size={18} />
          <h2 className="section-title">{t('تصدير CSV', 'Export CSV')}</h2>
        </div>
        <p className="page-sub" style={{ margin: 0 }}>
          {t('ملفات مناسبة لجداول البيانات. تُصدَّر بالعربية والإنجليزية عبر الترويسات.', 'Spreadsheet-friendly files with stable headers.')}
        </p>
        {destinations.length === 0 && history.length === 0 ? (
          <EmptyState
            icon="database"
            title={t('لا توجد بيانات لتصديرها بعد', 'Nothing to export yet')}
            description={t('أضف وجهات أو افتح محادثة أولاً، ثم عُد هنا.', 'Add destinations or open a chat first, then come back here.')}
            action={
              <Button variant="ghost" onClick={() => navigate('/compose')}>
                {t('ابدأ محادثة', 'Start a chat')}
              </Button>
            }
          />
        ) : (
          <div className="grid-2">
            <Button variant="default" disabled={destinations.length === 0} onClick={exportDestinations}>
              <Icon name="users" size={16} />
              {t('الوجهات', 'Destinations')}
            </Button>
            <Button variant="default" disabled={history.length === 0} onClick={exportHistory}>
              <Icon name="chat" size={16} />
              {t('السجل', 'History')}
            </Button>
          </div>
        )}
      </section>

      <section className="glass card col" style={{ gap: 10 }}>
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}>
            <Icon name="database" size={18} />
            <h2 className="section-title">{t('مساحة التخزين', 'Storage usage')}</h2>
          </div>
          {storage ? <span className="badge accent">{n(quotaPercent)}%</span> : null}
        </div>
        {storageUnsupported || !storage ? (
          <p className="page-sub" style={{ margin: 0 }}>
            {storageUnsupported
              ? t('لا يدعم هذا المتصفح عرض معلومات التخزين.', 'This browser does not report storage information.')
              : t('جارٍ حساب المساحة…', 'Calculating usage…')}
          </p>
        ) : (
          <>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--glass-3)', overflow: 'hidden' }} aria-hidden="true">
              <div
                style={{
                  height: '100%',
                  width: `${quotaPercent}%`,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div className="row-between" style={{ fontSize: 11.5 }}>
              <span className="text-muted">
                {t('المستخدم', 'Used')}: <b dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBytes(storage.usage)}</b>
              </span>
              <span className="text-muted">
                {t('المتاح', 'Available')}: <b dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBytes(storage.quota)}</b>
              </span>
            </div>
          </>
        )}
        <HintCard icon="info">
          {t('الحصة التخزينية يحددها المتصفح. عند امتلائها قد يتوقف حفظ البيانات الجديدة.', 'The browser sets the quota. When it fills up, new data may stop saving.')}
        </HintCard>
      </section>

      <section className="glass card col" style={{ gap: 12, borderColor: 'color-mix(in srgb, var(--danger) 28%, transparent)' }}>
        <div className="row" style={{ gap: 8, color: 'var(--danger)' }}>
          <Icon name="trash" size={18} />
          <h2 className="section-title" style={{ color: 'var(--danger)' }}>
            {t('منطقة الخطر', 'Danger zone')}
          </h2>
        </div>
        <p className="page-sub" style={{ margin: 0 }}>
          {t('حذف كل البيانات من هذا الجهاز نهائياً: الوجهات، القوالب، السجل، الحملات، التذكيرات، والإعدادات.', 'Permanently delete all data on this device: destinations, templates, history, campaigns, reminders and settings.')}
        </p>
        <Button variant="danger" block loading={busy === 'clear'} disabled={busy !== null} onClick={() => setClearFirstConfirm(true)}>
          <Icon name="trash" size={17} />
          {t('مسح كل البيانات', 'Clear all data')}
        </Button>
      </section>

      <Sheet
        open={summaryOpen && Boolean(pendingImport)}
        onClose={closeSummary}
        title={t('ملخص النسخة الاحتياطية', 'Backup summary')}
        subtitle={
          pendingImport
            ? Number.isNaN(exportedAt)
              ? t('ملف مستورد', 'Imported file')
              : t(`صُدِّرت في ${date(exportedAt)}`, `Exported on ${date(exportedAt)}`)
            : undefined
        }
        footer={
          <>
            <Button variant="soft" loading={busy === 'import'} disabled={busy !== null} onClick={() => void runImport('merge')}>
              {t('دمج', 'Merge')}
            </Button>
            <Button variant="danger" disabled={busy !== null} onClick={() => setReplaceConfirm(true)}>
              {t('استبدال', 'Replace')}
            </Button>
          </>
        }
      >
        <p className="page-sub" style={{ margin: 0 }}>
          {t('راجع المحتوى قبل المتابعة. الدمج يضيف البيانات ويحتفظ بالموجود، والاستبدال يحذف كل شيء أولاً.', 'Review the contents before continuing. Merge keeps current data; replace deletes everything first.')}
        </p>
        <div className="list">
          {summaryRows.map((row) => (
            <div key={row.key} className="list-row">
              <span className="list-main">
                <span className="list-title">{row.label}</span>
              </span>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{n(row.value)}</b>
            </div>
          ))}
        </div>
        {pendingImport?.settings ? (
          <Switch
            checked={importIncludeSettings}
            onChange={setImportIncludeSettings}
            label={t('استيراد الإعدادات أيضاً', 'Import settings too')}
            description={t('المظهر واللغة والدولة الافتراضية وقفل التطبيق.', 'Appearance, language, default country and app lock.')}
          />
        ) : (
          <p className="page-sub" style={{ margin: 0 }}>
            {t('لا تحتوي هذه النسخة على إعدادات.', 'This backup does not include settings.')}
          </p>
        )}
      </Sheet>

      <ConfirmSheet
        open={replaceConfirm}
        danger
        title={t('استبدال كل البيانات؟', 'Replace all data?')}
        description={t('سيتم حذف وجهاتك وقوالبك وسجلك وحملاتك وتذكيراتك الحالية قبل الاستيراد. لا يمكن التراجع.', 'Your current destinations, templates, history, campaigns and reminders will be deleted before importing. This cannot be undone.')}
        confirmLabel={t('استبدال', 'Replace')}
        onConfirm={() => void runImport('replace')}
        onClose={() => setReplaceConfirm(false)}
      />

      <ConfirmSheet
        open={clearFirstConfirm}
        danger
        title={t('مسح كل البيانات؟', 'Clear all data?')}
        description={t('احتفظ بنسخة احتياطية أولاً إن كنت تحتاج بياناتك. سيؤدي هذا إلى حذف كل شيء من هذا الجهاز.', 'Export a backup first if you need your data. This removes everything from this device.')}
        confirmLabel={t('متابعة', 'Continue')}
        onConfirm={() => setClearFinalConfirm(true)}
        onClose={() => setClearFirstConfirm(false)}
      />

      <ConfirmSheet
        open={clearFinalConfirm}
        danger
        title={t('تأكيد نهائي — لا يمكن التراجع', 'Final confirmation — cannot be undone')}
        description={t('لا توجد نسخة احتياطية تلقائية. هل أنت متأكد تماماً من المسح النهائي؟', 'There is no automatic backup. Are you absolutely sure you want to delete everything?')}
        confirmLabel={t('مسح نهائي', 'Delete everything')}
        onConfirm={() => void clearEverything()}
        onClose={() => setClearFinalConfirm(false)}
      />
    </div>
  );
}
