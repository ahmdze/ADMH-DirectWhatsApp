import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, ConfirmSheet, EmptyState, Field, HintCard, ScreenHeader, Segmented, Sheet, Switch } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack, navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useActiveWorkspace, useDestinations, useTemplates } from '../../hooks/useData';
import { buildBackup, importBackup, validateBackup, type ImportResult } from '../../lib/backup';
import { downloadBlob, readFileAsText, shareFiles } from '../../lib/image';
import { writeClipboardText } from '../../lib/clipboard';
import { shareNativeText } from '../../lib/native';
import { decodeImageFile, startCameraScanner, type CameraScanner } from '../../lib/scan';
import { qrDataUrl } from '../../lib/qr';
import { formatPhone } from '../../lib/phone';
import { initials } from '../../lib/format';
import {
  TRANSFER_QR_MAX_BYTES,
  createTransferPayload,
  decodeTransferText,
  encodeTransferPayload,
  mergeTransferPayload,
  transferTextByteSize,
  type DestinationMergeMode,
  type TransferDecodeError,
  type TransferMergeResult,
  type TransferPayload
} from '../../lib/transfer';
import type { BackupFile, Destination } from '../../types';

type ScreenMode = 'file' | 'qr';
type QrTab = 'share' | 'receive';
type FileBusy = 'export' | 'import' | null;
type ImportMode = 'merge' | 'replace';

interface FileImportRecord {
  mode: ImportMode;
  at: number;
  result: ImportResult;
}

function displayOf(destination: Destination): string {
  return destination.type === 'phone' ? formatPhone(destination.phone || '') : '@' + (destination.username || '');
}

export function TransferScreen() {
  const { t, n, date, time } = useI18n();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const templates = useTemplates(workspace?.id);

  const [mode, setMode] = useState<ScreenMode>('file');

  /* ---------------------------------------------------------------- file mode */
  const [fileBusy, setFileBusy] = useState<FileBusy>(null);
  const [fileError, setFileError] = useState('');
  const [importFileError, setImportFileError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [importSettings, setImportSettings] = useState(true);
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [fileResult, setFileResult] = useState<FileImportRecord | null>(null);
  const [lastExportAt, setLastExportAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------- qr: sharing */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrPayloadText, setQrPayloadText] = useState('');
  const [qrBytes, setQrBytes] = useState(0);
  const [qrTooLarge, setQrTooLarge] = useState(false);
  const [qrError, setQrError] = useState('');

  /* ------------------------------------------------------------ qr: receiving */
  const [qrTab, setQrTab] = useState<QrTab>('share');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanStatus, setScanStatus] = useState<'scanning' | 'unsupported' | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [incoming, setIncoming] = useState<TransferPayload | null>(null);
  const [incomingError, setIncomingError] = useState('');
  const [mergeMode, setMergeMode] = useState<DestinationMergeMode>('skip');
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<TransferMergeResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<CameraScanner | null>(null);
  const cameraSeq = useRef(0);

  const stopCamera = useCallback(() => {
    cameraSeq.current += 1;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    scanner?.stop();
    setCameraOn(false);
    setCameraBusy(false);
  }, []);

  useEffect(() => {
    const seq = cameraSeq;
    const scanner = scannerRef;
    return () => {
      seq.current += 1;
      scanner.current?.stop();
      scanner.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'qr' || qrTab !== 'receive') stopCamera();
  }, [mode, qrTab, stopCamera]);

  const resetGenerated = () => {
    setQrUrl(null);
    setQrPayloadText('');
    setQrBytes(0);
    setQrTooLarge(false);
    setQrError('');
  };

  /* ------------------------------------------------------------------ file ops */
  const exportBackupFile = async () => {
    setFileBusy('export');
    setFileError('');
    try {
      const backup = await buildBackup(true);
      const json = JSON.stringify(backup, null, 2);
      const filename = `admh-transfer-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const file = new File([blob], filename, { type: 'application/json' });
      let shared = false;
      try {
        if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
          shared = await shareFiles([file], { title: t('نقل بيانات ADMH', 'ADMH data transfer') });
        }
      } catch {
        shared = false;
      }
      if (!shared) downloadBlob(blob, filename);
      setLastExportAt(Date.now());
      hapticSuccess();
      toast(shared ? t('تمت مشاركة ملف النقل.', 'Transfer file shared.') : t('تم تنزيل ملف النقل.', 'Transfer file downloaded.'), 'success');
    } catch {
      setFileError(t('تعذّر إنشاء ملف النقل. حاول مرة أخرى.', 'Could not create the transfer file. Please try again.'));
      hapticError();
      toast(t('تعذّر تصدير الملف', 'Could not export the file'), 'error');
    } finally {
      setFileBusy(null);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    setFileBusy('import');
    setImportFileError('');
    try {
      const text = await readFileAsText(file);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        setImportFileError(t('الملف ليس JSON صالحاً. تأكد أنه ملف نقل من هذا التطبيق.', 'The file is not valid JSON. Make sure it is a transfer file from this app.'));
        hapticError();
        return;
      }
      const validation = validateBackup(parsed);
      if (!validation.ok || !validation.data) {
        const reason =
          validation.error === 'unsupported'
            ? t('إصدار الملف غير مدعوم. حدّث التطبيق أو استخدم ملفاً أحدث.', 'This file version is not supported. Update the app or use a newer file.')
            : validation.error === 'empty'
              ? t('الملف لا يحتوي بيانات قابلة للاستيراد.', 'The file contains no importable data.')
              : t('الملف ليس نسخة نقل صالحة من هذا التطبيق.', 'This is not a valid transfer file from this app.');
        setImportFileError(reason);
        hapticError();
        toast(reason, 'error');
        return;
      }
      setPendingBackup(validation.data);
      setImportSettings(Boolean(validation.data.settings));
      setSummaryOpen(true);
    } catch {
      setImportFileError(t('تعذّرت قراءة الملف من الجهاز.', 'Could not read the file from this device.'));
      hapticError();
      toast(t('تعذّرت قراءة الملف', 'Could not read the file'), 'error');
    } finally {
      setFileBusy(null);
    }
  };

  const runFileImport = async (importMode: ImportMode) => {
    if (!pendingBackup) return;
    setFileBusy('import');
    try {
      const result = await importBackup(pendingBackup, importMode, importSettings && Boolean(pendingBackup.settings));
      setFileResult({ mode: importMode, at: Date.now(), result });
      setPendingBackup(null);
      setSummaryOpen(false);
      hapticSuccess();
      toast(t('تم استيراد ملف النقل بنجاح.', 'Transfer file imported successfully.'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر استيراد ملف النقل.', 'Could not import the transfer file.'), 'error');
    } finally {
      setFileBusy(null);
    }
  };

  const closeSummary = () => {
    setSummaryOpen(false);
    setPendingBackup(null);
  };

  /* ------------------------------------------------------------------- qr build */
  const toggleDestination = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    resetGenerated();
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplateId((current) => (current === id ? null : id));
    resetGenerated();
  };

  const generateQr = async () => {
    const chosenDestinations = destinations.filter((destination) => selectedIds.includes(destination.id));
    const chosenTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
    if (!chosenDestinations.length && !chosenTemplate) {
      toast(t('اختر وجهة أو قالباً واحداً على الأقل.', 'Select at least one destination or template.'), 'error');
      return;
    }
    const payload = createTransferPayload(chosenDestinations, chosenTemplate ? [chosenTemplate] : []);
    const text = encodeTransferPayload(payload);
    const bytes = transferTextByteSize(text);
    setQrPayloadText(text);
    setQrBytes(bytes);
    setQrUrl(null);
    setQrError('');
    setQrTooLarge(bytes > TRANSFER_QR_MAX_BYTES);
    if (bytes > TRANSFER_QR_MAX_BYTES) {
      hapticError();
      return;
    }
    setQrBusy(true);
    try {
      const url = await qrDataUrl(text, { size: 720, margin: 2 });
      setQrUrl(url);
      hapticSuccess();
    } catch {
      setQrError(t('تعذّر توليد رمز QR. حاول مرة أخرى.', 'Could not generate the QR code. Please try again.'));
      hapticError();
    } finally {
      setQrBusy(false);
    }
  };

  const copyPayload = async () => {
    if (!qrPayloadText) return;
    const copied = await writeClipboardText(qrPayloadText);
    if (copied) hapticSuccess();
    else hapticError();
    toast(copied ? t('تم نسخ نص النقل.', 'Transfer text copied.') : t('تعذّر النسخ على هذا المتصفح.', 'Could not copy on this browser.'), copied ? 'success' : 'error');
  };

  const sharePayload = async () => {
    if (!qrPayloadText) return;
    if (await shareNativeText(qrPayloadText, t('نقل بيانات ADMH', 'ADMH data transfer'))) {
      hapticSuccess();
      return;
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('نقل بيانات ADMH', 'ADMH data transfer'), text: qrPayloadText });
        hapticSuccess();
        return;
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
      }
    }
    const copied = await writeClipboardText(qrPayloadText);
    if (copied) hapticSuccess();
    else hapticError();
    toast(copied ? t('تم نسخ نص النقل بدلاً من المشاركة.', 'Transfer text copied instead of sharing.') : t('تعذّرت المشاركة.', 'Could not share.'), copied ? 'success' : 'error');
  };

  /* ---------------------------------------------------------------- qr receive */
  const decodeErrorMessage = (error: TransferDecodeError): string => {
    switch (error) {
      case 'empty':
        return t('لا يوجد نص للقراءة.', 'There is no text to read.');
      case 'prefix':
        return t('هذا الرمز ليس رمز نقل من ADMH.', 'This is not an ADMH transfer code.');
      case 'too_large':
        return t('الحمولة أكبر من الحد المسموح لرمز QR.', 'The payload exceeds the QR transfer limit.');
      case 'version':
        return t('إصدار رمز النقل غير مدعوم. حدّث التطبيق على الجهازين.', 'This transfer code version is not supported. Update the app on both devices.');
      case 'format':
        return t('تعذّر فك ترميز الرمز. تأكد أن الصورة واضحة وكاملة.', 'Could not decode the code. Make sure the image is clear and complete.');
      default:
        return t('بنية بيانات النقل غير صحيحة.', 'The transfer payload structure is invalid.');
    }
  };

  const applyIncoming = (value: string) => {
    const decoded = decodeTransferText(value);
    if (!decoded.ok) {
      setIncoming(null);
      setMergeResult(null);
      setIncomingError(decodeErrorMessage(decoded.error));
      hapticError();
      return;
    }
    setIncoming(decoded.payload);
    setIncomingError('');
    setMergeResult(null);
    setMergeMode('skip');
    hapticSuccess();
  };

  const startCamera = async () => {
    if (cameraBusy || cameraOn) return;
    const video = videoRef.current;
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('لا يدعم هذا المتصفح الكاميرا داخل الصفحة. ارفع صورة QR بدلاً من ذلك.', 'This browser does not support in-page camera access. Upload a QR image instead.'));
      hapticError();
      return;
    }
    const seq = cameraSeq.current + 1;
    cameraSeq.current = seq;
    setCameraBusy(true);
    setCameraOn(true);
    setCameraError('');
    setIncomingError('');
    setMergeResult(null);
    try {
      const scanner = await startCameraScanner({
        video,
        onResult: (value) => {
          cameraSeq.current += 1;
          scannerRef.current = null;
          setCameraOn(false);
          setCameraBusy(false);
          applyIncoming(value);
        },
        onStatus: (status) => setScanStatus(status)
      });
      if (cameraSeq.current !== seq) {
        scanner.stop();
        return;
      }
      scannerRef.current = scanner;
    } catch {
      if (cameraSeq.current === seq) {
        setCameraOn(false);
        setCameraError(t('تعذّر تشغيل الكاميرا. تحقق من الإذن أو ارفع صورة QR.', 'Could not start the camera. Check permission or upload a QR image.'));
        hapticError();
      }
    } finally {
      if (cameraSeq.current === seq) setCameraBusy(false);
    }
  };

  const handleQrImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    stopCamera();
    setScanBusy(true);
    setIncomingError('');
    setMergeResult(null);
    try {
      const value = await decodeImageFile(file);
      if (!value) {
        setIncoming(null);
        setIncomingError(t('لم نعثر على رمز QR واضح في الصورة. جرّب صورة أوضح.', 'No clear QR code was found in the image. Try a sharper image.'));
        hapticError();
        return;
      }
      applyIncoming(value);
    } catch {
      setIncomingError(t('تعذّرت قراءة الصورة.', 'Could not read the image.'));
      hapticError();
    } finally {
      setScanBusy(false);
    }
  };

  const mergeIncoming = async () => {
    if (!incoming || !workspace) {
      if (!workspace) toast(t('لا توجد مساحة عمل نشطة.', 'No active workspace.'), 'error');
      return;
    }
    setMerging(true);
    try {
      const result = await mergeTransferPayload(incoming, { workspaceId: workspace.id, destinationMode: mergeMode });
      setMergeResult(result);
      setIncoming(null);
      hapticSuccess();
      toast(t('تم دمج البيانات المنقولة في مساحة العمل الحالية.', 'Transferred data merged into the current workspace.'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر دمج البيانات المنقولة.', 'Could not merge the transferred data.'), 'error');
    } finally {
      setMerging(false);
    }
  };

  const resetIncoming = () => {
    setIncoming(null);
    setIncomingError('');
    setMergeResult(null);
  };

  const selectedDestinations = destinations.filter((destination) => selectedIds.includes(destination.id));
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
  const canGenerate = selectedDestinations.length > 0 || selectedTemplate !== null;

  const fileSummaryRows = pendingBackup
    ? [
        { key: 'destinations', label: t('وجهات', 'Destinations'), value: pendingBackup.destinations.length },
        { key: 'templates', label: t('قوالب', 'Templates'), value: pendingBackup.templates.length },
        { key: 'history', label: t('سجل', 'History'), value: pendingBackup.history.length },
        { key: 'campaigns', label: t('حملات', 'Campaigns'), value: pendingBackup.campaigns.length },
        { key: 'reminders', label: t('تذكيرات', 'Reminders'), value: pendingBackup.reminders.length },
        { key: 'workspaces', label: t('مساحات عمل', 'Workspaces'), value: pendingBackup.workspaces.length }
      ]
    : [];

  const fileResultRows = fileResult
    ? [
        { key: 'destinations', label: t('وجهات', 'destinations'), value: fileResult.result.destinations },
        { key: 'templates', label: t('قوالب', 'templates'), value: fileResult.result.templates },
        { key: 'history', label: t('سجل', 'history'), value: fileResult.result.history },
        { key: 'campaigns', label: t('حملات', 'campaigns'), value: fileResult.result.campaigns },
        { key: 'reminders', label: t('تذكيرات', 'reminders'), value: fileResult.result.reminders }
      ].filter((row) => row.value > 0)
    : [];

  return (
    <div className="screen">
      <ScreenHeader
        title={t('نقل البيانات', 'Transfer data')}
        subtitle={t('انقل وجهاتك وقوالبك بين جهازين — ملف كامل أو رمز QR سريع، بدون خادم.', 'Move your destinations and templates between two devices — a full file or a quick QR code, with no server.')}
        onBack={() => goBack()}
      />

      <Segmented
        value={mode}
        options={[
          { value: 'file', label: t('ملف كامل', 'Full file') },
          { value: 'qr', label: t('QR سريع', 'Quick QR') }
        ]}
        onChange={(next) => {
          setMode(next);
          setFileError('');
          setImportFileError('');
        }}
      />

      {mode === 'file' ? (
        <>
          <HintCard icon="shield">
            {t(
              'ملف النقل يحتوي أرقاماً ورسائل وملاحظات. شاركه فقط مع جهازك الآخر، ولا ترفعه إلى أي خدمة.',
              'The transfer file contains numbers, messages and notes. Share it only with your other device and never upload it to a service.'
            )}
          </HintCard>

          <section className="glass card col" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="download" size={18} />
              <h2 className="section-title">{t('تصدير نسخة كاملة', 'Export full copy')}</h2>
            </div>
            <p className="page-sub" style={{ margin: 0 }}>
              {t('نسخة كاملة من الوجهات والقوالب والسجل والحملات والتذكيرات والإعدادات.', 'A full copy of destinations, templates, history, campaigns, reminders and settings.')}
            </p>
            <Button variant="primary" block loading={fileBusy === 'export'} disabled={fileBusy !== null} onClick={() => void exportBackupFile()}>
              <Icon name="share" size={17} />
              {t('تصدير ومشاركة الملف', 'Export & share the file')}
            </Button>
            <p className="page-sub" style={{ margin: 0, fontSize: 10.5 }}>
              {t('على الأجهزة الداعمة تُفتح نافذة المشاركة، وإلا يُنزَّل الملف إلى التنزيلات.', 'On supported devices the share sheet opens; otherwise the file is downloaded.')}
            </p>
            {lastExportAt ? (
              <p className="page-sub" style={{ margin: 0, color: 'var(--accent)' }}>
                {t('آخر تصدير', 'Last export')}: {date(lastExportAt)} · {time(lastExportAt)}
              </p>
            ) : null}
            {fileError ? (
              <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
                {fileError}
              </p>
            ) : null}
          </section>

          <section className="glass card col" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon name="upload" size={18} />
              <h2 className="section-title">{t('استيراد ملف نقل', 'Import a transfer file')}</h2>
            </div>
            <p className="page-sub" style={{ margin: 0 }}>
              {t('اختر ملف JSON صالحاً من الجهاز الآخر. سنعرض ملخصاً قبل أي تعديل.', 'Pick a valid JSON file from the other device. You will see a summary before anything changes.')}
            </p>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => void handleFileChange(event)} />
            <Button variant="soft" block loading={fileBusy === 'import'} disabled={fileBusy !== null} onClick={() => fileRef.current?.click()}>
              <Icon name="folder" size={17} />
              {t('اختيار ملف JSON', 'Choose a JSON file')}
            </Button>
            {importFileError ? (
              <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
                {importFileError}
              </p>
            ) : null}
            {fileResult ? (
              <div className="glass-soft col" style={{ gap: 6, padding: 12 }}>
                <div className="row" style={{ gap: 8, color: 'var(--accent)' }}>
                  <Icon name="check" size={15} />
                  <b style={{ fontSize: 12.5 }}>
                    {fileResult.mode === 'replace' ? t('تم الاستبدال بنجاح', 'Replaced successfully') : t('تم الدمج بنجاح', 'Merged successfully')}
                  </b>
                </div>
                <span className="list-sub">
                  {date(fileResult.at)} · {time(fileResult.at)}
                </span>
                {fileResultRows.length ? (
                  <span className="list-sub">{fileResultRows.map((row) => `${n(row.value)} ${row.label}`).join(' · ')}</span>
                ) : null}
              </div>
            ) : null}
          </section>

          <Button variant="ghost" block onClick={() => navigate('/tools/backup')}>
            <Icon name="database" size={17} />
            {t('فتح النسخ الاحتياطي الكامل', 'Open full backup')}
          </Button>
        </>
      ) : (
        <>
          <Segmented
            value={qrTab}
            options={[
              { value: 'share', label: t('إنشاء QR', 'Create QR') },
              { value: 'receive', label: t('استلام QR', 'Receive QR') }
            ]}
            onChange={setQrTab}
          />

          {qrTab === 'share' ? (
            <>
              <HintCard icon="info">
                {t(
                  'رمز QR مناسب لعدد صغير من العناصر (حتى ~1800 بايت). لنقل بيانات كبيرة أو كاملة استخدم وضع الملف.',
                  'A QR code fits a small number of items (up to ~1800 bytes). For large or full data use the file mode.'
                )}
              </HintCard>

              <section className="glass card col" style={{ gap: 10 }}>
                <div className="section-head">
                  <h2 className="section-title">{t('الوجهات', 'Destinations')}</h2>
                  <span className="badge accent">
                    {n(selectedDestinations.length)}/{n(destinations.length)}
                  </span>
                </div>
                {destinations.length === 0 ? (
                  <p className="page-sub" style={{ margin: 0 }}>
                    {t('لا توجد وجهات محفوظة في هذه المساحة. أنشئها من «وجهاتي» أولاً.', 'No saved destinations in this workspace. Create them from “Targets” first.')}
                  </p>
                ) : (
                  <>
                    <div className="row" style={{ gap: 8 }}>
                      <Button
                        variant="ghost"
                        className="grow"
                        disabled={destinations.length === 0 || selectedDestinations.length === destinations.length}
                        onClick={() => {
                          setSelectedIds(destinations.map((destination) => destination.id));
                          resetGenerated();
                        }}
                      >
                        {t('تحديد الكل', 'Select all')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="grow"
                        disabled={selectedDestinations.length === 0}
                        onClick={() => {
                          setSelectedIds([]);
                          resetGenerated();
                        }}
                      >
                        {t('مسح التحديد', 'Clear')}
                      </Button>
                    </div>
                    <div className="list" style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {destinations.map((destination) => {
                        const selected = selectedIds.includes(destination.id);
                        return (
                          <button
                            key={destination.id}
                            type="button"
                            className="list-row"
                            aria-pressed={selected}
                            style={{ width: '100%', textAlign: 'start', background: selected ? 'var(--accent-soft)' : undefined }}
                            onClick={() => toggleDestination(destination.id)}
                          >
                            <span className="avatar">{initials(destination.label)}</span>
                            <span className="list-main">
                              <span className="list-title">{destination.label}</span>
                              <span className="list-sub sensitive" dir="ltr">
                                {displayOf(destination)}
                              </span>
                            </span>
                            <Icon name={selected ? 'check' : 'plus'} size={17} style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              <section className="glass card col" style={{ gap: 10 }}>
                <div className="section-head">
                  <h2 className="section-title">{t('قالب واحد (اختياري)', 'One template (optional)')}</h2>
                  <span className="badge">{n(templates.length)}</span>
                </div>
                {templates.length === 0 ? (
                  <p className="page-sub" style={{ margin: 0 }}>
                    {t('لا توجد قوالب في هذه المساحة.', 'No templates in this workspace.')}
                  </p>
                ) : (
                  <div className="list" style={{ maxHeight: 190, overflowY: 'auto' }}>
                    {templates.map((template) => {
                      const selected = template.id === selectedTemplateId;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          className="list-row"
                          aria-pressed={selected}
                          style={{ width: '100%', textAlign: 'start', background: selected ? 'var(--accent-soft)' : undefined }}
                          onClick={() => toggleTemplate(template.id)}
                        >
                          <span className="avatar">
                            <Icon name="fileText" size={17} />
                          </span>
                          <span className="list-main">
                            <span className="list-title">{template.title}</span>
                            <span className="list-sub">{template.body}</span>
                          </span>
                          <Icon name={selected ? 'check' : 'plus'} size={17} style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="glass card col" style={{ gap: 12 }}>
                <div className="row-between">
                  <h2 className="section-title">{t('رمز النقل', 'Transfer code')}</h2>
                  {qrBytes > 0 ? (
                    <span className={`badge ${qrTooLarge ? '' : 'accent'}`} style={qrTooLarge ? { color: 'var(--danger)' } : undefined}>
                      {n(qrBytes)} {t('بايت', 'bytes')}
                    </span>
                  ) : null}
                </div>
                <Button variant="primary" block loading={qrBusy} disabled={!canGenerate || qrBusy} onClick={() => void generateQr()}>
                  <Icon name="qr" size={17} />
                  {t('توليد رمز QR', 'Generate QR code')}
                </Button>

                {qrTooLarge ? (
                  <div className="hint-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <span className="row" style={{ gap: 8, color: 'var(--danger)' }}>
                      <Icon name="alert" size={17} />
                      <b style={{ fontSize: 12.5 }}>{t('الحمولة أكبر من رمز QR', 'Payload is too big for a QR code')}</b>
                    </span>
                    <span>{t('اختر عناصر أقل، أو استخدم ملف النسخة الكاملة لنقل كل البيانات بأمان.', 'Select fewer items, or use the full backup file to transfer everything safely.')}</span>
                    <span className="text-muted" style={{ fontSize: 10.5 }}>
                      {n(qrBytes)} / {n(TRANSFER_QR_MAX_BYTES)} {t('بايت', 'bytes')}
                    </span>
                    <Button variant="soft" onClick={() => setMode('file')}>
                      {t('التبديل إلى وضع الملف', 'Switch to file mode')}
                    </Button>
                  </div>
                ) : null}

                {qrError ? (
                  <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
                    {qrError}
                  </p>
                ) : null}

                {qrUrl ? (
                  <>
                    <div className="qr-frame">
                      <img
                        src={qrUrl}
                        alt={t('رمز QR لنقل البيانات', 'Data transfer QR code')}
                        width={244}
                        height={244}
                        style={{ width: 244, height: 'auto', maxWidth: '100%' }}
                      />
                    </div>
                    {qrBytes > 1200 ? (
                      <p className="page-sub" style={{ margin: 0, textAlign: 'center' }}>
                        {t('حمولة كبيرة: قد تحتاج لتكبير الشاشة أو خفض سطوع الشاشة على الجهاز الآخر للمسح.', 'Large payload: you may need a larger screen or lower brightness on the other device to scan.')}
                      </p>
                    ) : null}
                    <p className="page-sub" style={{ margin: 0, textAlign: 'center' }}>
                      {t('افتح «نقل البيانات» على الجهاز الآخر ← «استلام QR» ← امسح الرمز.', 'On the other device open “Transfer data” → “Receive QR” → scan the code.')}
                    </p>
                    <div className="grid-2">
                      <Button variant="soft" onClick={() => void copyPayload()}>
                        <Icon name="copy" size={16} />
                        {t('نسخ النص', 'Copy text')}
                      </Button>
                      <Button variant="soft" onClick={() => void sharePayload()}>
                        <Icon name="share" size={16} />
                        {t('مشاركة النص', 'Share text')}
                      </Button>
                    </div>
                  </>
                ) : null}
              </section>
            </>
          ) : (
            <>
              <HintCard icon="shield">
                {t(
                  'لا يغادر أي شيء جهازك: تُفك الحمولة وتُدمج محلياً. الكاميرا تعمل فقط عند تشغيلها ولا تُسجَّل أي صورة.',
                  'Nothing leaves your device: the payload is decoded and merged locally. The camera runs only while enabled and no image is recorded.'
                )}
              </HintCard>

              <section className="glass card col" style={{ gap: 12 }}>
                <div className="row-between">
                  <h2 className="section-title">{t('مسح رمز الاستلام', 'Scan the incoming code')}</h2>
                  {scanStatus === 'unsupported' ? <span className="badge">{t('jsQR', 'jsQR')}</span> : null}
                </div>
                <div className="scan-frame" style={{ display: cameraOn ? 'block' : 'none' }}>
                  <video
                    ref={videoRef}
                    className="scan-video"
                    muted
                    playsInline
                    aria-label={t('معاينة الكاميرا لمسح رمز النقل', 'Camera preview for scanning the transfer code')}
                  />
                </div>
                {cameraError ? (
                  <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
                    {cameraError}
                  </p>
                ) : null}
                <div className="grid-2">
                  <Button
                    variant={cameraOn ? 'danger' : 'primary'}
                    loading={cameraBusy}
                    onClick={() => {
                      if (cameraOn) stopCamera();
                      else void startCamera();
                    }}
                  >
                    <Icon name={cameraOn ? 'x' : 'camera'} size={17} />
                    {cameraOn ? t('إيقاف الكاميرا', 'Stop camera') : t('تشغيل الكاميرا', 'Start camera')}
                  </Button>
                  <Button variant="soft" loading={scanBusy} disabled={scanBusy} onClick={() => imageRef.current?.click()}>
                    <Icon name="image" size={16} />
                    {t('صورة QR', 'QR image')}
                  </Button>
                </div>
                <input ref={imageRef} type="file" accept="image/*" hidden onChange={(event) => void handleQrImage(event)} />
                {cameraOn ? (
                  <p className="page-sub" style={{ margin: 0, textAlign: 'center' }}>
                    {t('وجّه الكاميرا نحو رمز النقل على الجهاز الآخر…', 'Point the camera at the transfer code on the other device…')}
                  </p>
                ) : null}
                {incomingError ? (
                  <div className="col" style={{ gap: 8 }}>
                    <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
                      {incomingError}
                    </p>
                    <Button variant="ghost" onClick={() => navigate('/tools/scan')}>
                      {t('فتح أداة مسح QR العادية', 'Open the regular QR scanner')}
                    </Button>
                  </div>
                ) : null}
              </section>

              {mergeResult ? (
                <section className="glass card col" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 8, color: 'var(--accent)' }}>
                    <Icon name="check" size={17} />
                    <h2 className="section-title" style={{ color: 'var(--accent)' }}>
                      {t('تم دمج البيانات', 'Data merged')}
                    </h2>
                  </div>
                  <div className="grid-2">
                    <div className="stat-card">
                      <small>{t('وجهات مضافة', 'Destinations added')}</small>
                      <b>{n(mergeResult.addedDestinations)}</b>
                    </div>
                    <div className="stat-card">
                      <small>{t('وجهات محدّثة', 'Destinations updated')}</small>
                      <b>{n(mergeResult.updatedDestinations)}</b>
                    </div>
                    <div className="stat-card">
                      <small>{t('قوالب مضافة', 'Templates added')}</small>
                      <b>{n(mergeResult.addedTemplates)}</b>
                    </div>
                    <div className="stat-card">
                      <small>{t('تم تجاهلها', 'Skipped')}</small>
                      <b>{n(mergeResult.skippedDestinations + mergeResult.skippedTemplates)}</b>
                    </div>
                  </div>
                  <Button variant="ghost" block onClick={() => setMergeResult(null)}>
                    {t('مسح النتيجة', 'Clear result')}
                  </Button>
                </section>
              ) : null}

              {incoming ? (
                <section className="glass card col" style={{ gap: 12 }}>
                  <div className="section-head">
                    <h2 className="section-title">{t('معاينة المحتوى', 'Content preview')}</h2>
                    <span className="badge accent">
                      {incoming.kind === 'destination'
                        ? t('وجهات', 'Destinations')
                        : incoming.kind === 'template'
                          ? t('قوالب', 'Templates')
                          : t('حزمة', 'Bundle')}
                    </span>
                  </div>

                  {incoming.destinations?.length ? (
                    <div className="list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {incoming.destinations.map((destination) => (
                        <div key={destination.id} className="list-row">
                          <span className="avatar">{initials(destination.label)}</span>
                          <div className="list-main">
                            <span className="list-title">{destination.label}</span>
                            <span className="list-sub sensitive" dir="ltr">
                              {displayOf(destination)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {incoming.templates?.length ? (
                    <div className="list">
                      {incoming.templates.map((template) => (
                        <div key={template.id} className="list-row">
                          <span className="avatar">
                            <Icon name="fileText" size={17} />
                          </span>
                          <div className="list-main">
                            <span className="list-title">{template.title}</span>
                            <span className="list-sub">{template.body}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {incoming.destinations?.length ? (
                    <Field label={t('عند وجود وجهة مطابقة', 'When a destination already exists')}>
                      <Segmented
                        value={mergeMode}
                        options={[
                          { value: 'skip', label: t('تجاهل', 'Skip') },
                          { value: 'update', label: t('تحديث', 'Update') }
                        ]}
                        onChange={setMergeMode}
                      />
                    </Field>
                  ) : null}

                  <Button variant="primary" block loading={merging} disabled={merging} onClick={() => void mergeIncoming()}>
                    <Icon name="download" size={17} />
                    {t('دمج في بياناتي', 'Merge into my data')}
                  </Button>
                  <Button variant="ghost" block disabled={merging} onClick={resetIncoming}>
                    {t('إلغاء المعاينة', 'Cancel preview')}
                  </Button>
                </section>
              ) : !incomingError && !mergeResult ? (
                <EmptyState
                  icon="qr"
                  title={t('لا توجد معاينة بعد', 'No preview yet')}
                  description={t(
                    'امسح رمز نقل من الجهاز الآخر بالكاميرا أو ارفع صورة له. ستظهر محتوياته هنا قبل الدمج.',
                    'Scan a transfer code from the other device with the camera or upload an image. Its contents will appear here before merging.'
                  )}
                />
              ) : null}
            </>
          )}
        </>
      )}

      <Sheet
        open={summaryOpen && Boolean(pendingBackup)}
        onClose={closeSummary}
        title={t('ملخص ملف النقل', 'Transfer file summary')}
        subtitle={t('راجع المحتوى قبل الاستيراد. الدمج يحتفظ بالموجود، والاستبدال يحذف كل شيء أولاً.', 'Review the contents before importing. Merge keeps current data; replace deletes everything first.')}
        footer={
          <>
            <Button variant="soft" loading={fileBusy === 'import'} disabled={fileBusy !== null} onClick={() => void runFileImport('merge')}>
              {t('دمج', 'Merge')}
            </Button>
            <Button variant="danger" disabled={fileBusy !== null} onClick={() => setReplaceConfirm(true)}>
              {t('استبدال', 'Replace')}
            </Button>
          </>
        }
      >
        <div className="list">
          {fileSummaryRows.map((row) => (
            <div key={row.key} className="list-row">
              <span className="list-main">
                <span className="list-title">{row.label}</span>
              </span>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{n(row.value)}</b>
            </div>
          ))}
        </div>
        {pendingBackup?.settings ? (
          <Switch
            checked={importSettings}
            onChange={setImportSettings}
            label={t('استيراد الإعدادات أيضاً', 'Import settings too')}
            description={t('المظهر واللغة والدولة الافتراضية وقفل التطبيق.', 'Appearance, language, default country and app lock.')}
          />
        ) : (
          <p className="page-sub" style={{ margin: 0 }}>
            {t('لا يحتوي هذا الملف على إعدادات.', 'This file does not include settings.')}
          </p>
        )}
      </Sheet>

      <ConfirmSheet
        open={replaceConfirm}
        danger
        title={t('استبدال كل البيانات؟', 'Replace all data?')}
        description={t('سيتم حذف وجهاتك وقوالبك وسجلك وحملاتك وتذكيراتك الحالية قبل استيراد الملف. لا يمكن التراجع.', 'Your current destinations, templates, history, campaigns and reminders will be deleted before importing. This cannot be undone.')}
        confirmLabel={t('استبدال', 'Replace')}
        onConfirm={() => void runFileImport('replace')}
        onClose={() => setReplaceConfirm(false)}
      />
    </div>
  );
}
