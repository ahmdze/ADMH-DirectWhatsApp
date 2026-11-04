import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../../components/icons';
import { Button, ConfirmSheet, EmptyState, HintCard, IconButton, ScreenHeader, Spinner } from '../../components/ui';
import {
  repairDataHealth,
  scanDataHealth,
  type DataHealthReport,
  type HealthIssue,
  type HealthIssueKey,
  type HealthSectionId,
  type HealthSeverity,
  type RepairSummary
} from '../../lib/dataHealth';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { goBack, navigate } from '../../lib/router';
import { toast } from '../../lib/toast';

const SEVERITY_STYLE: Record<HealthSeverity, { color: string; background: string; icon: IconName; labelAr: string; labelEn: string }> = {
  critical: { color: 'var(--danger)', background: 'var(--danger-soft)', icon: 'alert', labelAr: 'حرج', labelEn: 'Critical' },
  warning: { color: 'var(--warning)', background: 'rgba(252, 211, 77, 0.14)', icon: 'info', labelAr: 'تحذير', labelEn: 'Warning' },
  info: { color: 'var(--muted)', background: 'var(--glass-2)', icon: 'sparkles', labelAr: 'ملاحظة', labelEn: 'Notice' }
};

const SECTION_ICONS: Record<HealthSectionId, IconName> = {
  workspaces: 'briefcase',
  destinations: 'users',
  templates: 'fileText',
  history: 'chat',
  campaigns: 'send',
  reminders: 'bell',
  settings: 'settings'
};

const REMOVAL_KEYS: HealthIssueKey[] = [
  'destinations:invalid-number',
  'destinations:invalid-username',
  'destinations:invalid-type',
  'templates:empty-body',
  'history:invalid-entry',
  'campaigns:empty',
  'campaigns:bad-items',
  'reminders:invalid-target'
];

const MERGE_KEYS: HealthIssueKey[] = ['destinations:duplicate'];
const REASSIGN_KEYS: HealthIssueKey[] = [
  'destinations:orphan-workspace',
  'templates:orphan-workspace',
  'history:orphan-workspace',
  'campaigns:orphan-workspace',
  'reminders:orphan-workspace'
];

function countIssues(report: DataHealthReport, keys: HealthIssueKey[]): number {
  let total = 0;
  for (const section of report.sections) {
    for (const issue of section.issues) {
      if (keys.includes(issue.key)) total += issue.count;
    }
  }
  return total;
}

function IssueRow({ issue }: { issue: HealthIssue }) {
  const { t, n } = useI18n();
  const meta = SEVERITY_STYLE[issue.severity];
  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <span
        className="avatar"
        aria-hidden="true"
        style={{ width: 32, height: 32, borderRadius: 11, background: meta.background, color: meta.color }}
      >
        <Icon name={meta.icon} size={15} />
      </span>
      <div className="list-main" style={{ gap: 3 }}>
        <div className="row-between" style={{ gap: 8 }}>
          <span className="list-title" style={{ fontSize: 12.5 }}>
            {t(issue.titleAr, issue.titleEn)}
          </span>
          <span className="badge" style={{ color: meta.color, whiteSpace: 'nowrap' }}>
            {t(meta.labelAr, meta.labelEn)} · {n(issue.count)}
          </span>
        </div>
        <span className="list-sub" style={{ whiteSpace: 'normal' }}>
          {t(issue.detailAr, issue.detailEn)}
        </span>
        {issue.samples.length ? (
          <span className="list-sub" dir="auto" style={{ whiteSpace: 'normal', fontSize: 10, color: 'var(--muted-2)' }}>
            {issue.samples.join(' · ')}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  const { n } = useI18n();
  return (
    <span className="badge">
      {label}: {n(value)}
    </span>
  );
}

/** B4 — scan + safe repair of every local table. */
export function HealthScreen() {
  const { t, n, date, time } = useI18n();
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [scanning, setScanning] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastRepair, setLastRepair] = useState<RepairSummary | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    const next = await scanDataHealth();
    setReport(next);
    setScanning(false);
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const result = await repairDataHealth();
      if (!result.ok) {
        hapticError();
        toast(t('تعذّر إصلاح البيانات. حاول مرة أخرى.', 'Could not repair the data. Please try again.'), 'error');
      } else {
        setLastRepair(result.summary);
        hapticSuccess();
        if (result.summary.total === 0) {
          toast(t('لا شيء بحاجة إلى إصلاح.', 'Nothing needs repairing.'), 'success');
        } else {
          toast(
            t(
              `تم إصلاح ${n(result.summary.total)} عنصراً — دمج ${n(result.summary.merged)}، تطبيع ${n(result.summary.normalized)}، إعادة تعيين ${n(result.summary.reassigned)}، حذف ${n(result.summary.removedRecords + result.summary.removedItems)}.`,
              `Repaired ${n(result.summary.total)} items — merged ${n(result.summary.merged)}, normalized ${n(result.summary.normalized)}, reassigned ${n(result.summary.reassigned)}, deleted ${n(result.summary.removedRecords + result.summary.removedItems)}.`
            ),
            'success'
          );
        }
      }
    } catch {
      hapticError();
      toast(t('حدث خطأ غير متوقع أثناء الإصلاح.', 'An unexpected error occurred while repairing.'), 'error');
    } finally {
      await scan();
      setRepairing(false);
    }
  };

  const activeSections = useMemo(() => (report ? report.sections.filter((section) => section.issues.length > 0) : []), [report]);
  const recordCount = report
    ? report.totals.destinations +
      report.totals.templates +
      report.totals.history +
      report.totals.campaigns +
      report.totals.reminders +
      report.totals.workspaces
    : 0;

  const stats: Array<{ key: string; icon: IconName; labelAr: string; labelEn: string; value: number }> = report
    ? [
        { key: 'destinations', icon: 'users', labelAr: 'وجهات', labelEn: 'Targets', value: report.totals.destinations },
        { key: 'templates', icon: 'fileText', labelAr: 'قوالب', labelEn: 'Templates', value: report.totals.templates },
        { key: 'history', icon: 'chat', labelAr: 'سجل', labelEn: 'History', value: report.totals.history },
        { key: 'campaigns', icon: 'send', labelAr: 'حملات', labelEn: 'Campaigns', value: report.totals.campaigns },
        { key: 'reminders', icon: 'bell', labelAr: 'تذكيرات', labelEn: 'Reminders', value: report.totals.reminders },
        { key: 'workspaces', icon: 'briefcase', labelAr: 'مساحات', labelEn: 'Spaces', value: report.totals.workspaces }
      ]
    : [];

  const duplicateCount = report ? countIssues(report, MERGE_KEYS) : 0;
  const reassignCount = report ? countIssues(report, REASSIGN_KEYS) : 0;
  const removalCount = report ? countIssues(report, REMOVAL_KEYS) : 0;

  return (
    <div className="screen">
      <ScreenHeader
        title={t('فحص البيانات', 'Data health')}
        subtitle={t(
          'افحص كل ما هو محفوظ على جهازك، وأصلح التكرارات والسجلات التالفة بأمان.',
          'Scan everything stored on your device and safely repair duplicates and damaged records.'
        )}
        onBack={() => goBack()}
        action={<IconButton name="refresh" label={t('إعادة الفحص', 'Scan again')} onClick={() => void scan()} variant="accent" />}
      />

      {scanning ? (
        <section className="glass card col" style={{ gap: 12, alignItems: 'center', paddingBlock: 30 }}>
          <Spinner size={28} />
          <p className="page-sub" style={{ margin: 0 }}>
            {t('جارٍ فحص كل الجداول المحلية…', 'Scanning every local table…')}
          </p>
        </section>
      ) : !report ? null : report.error ? (
        <EmptyState
          icon="alert"
          title={t('تعذّر فحص البيانات', 'Could not scan the data')}
          description={t(
            'لم نتمكن من قراءة قاعدة البيانات المحلية. أعد المحاولة، وتأكد أن التخزين متاح في المتصفح.',
            'The local database could not be read. Try again and make sure browser storage is available.'
          )}
          action={
            <Button variant="primary" onClick={() => void scan()}>
              {t('إعادة المحاولة', 'Try again')}
            </Button>
          }
        />
      ) : (
        <>
          <section className="glass card col" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span
                className="brand-mark"
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  color: report.healthy ? 'var(--accent)' : report.criticalCount ? 'var(--danger)' : 'var(--warning)',
                  background: report.healthy
                    ? 'var(--accent-soft)'
                    : report.criticalCount
                      ? 'var(--danger-soft)'
                      : 'rgba(252, 211, 77, 0.14)'
                }}
              >
                <Icon name={report.healthy ? 'check' : report.criticalCount ? 'alert' : 'info'} size={22} />
              </span>
              <div className="grow">
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                  {report.healthy
                    ? t('بياناتك سليمة', 'Your data is healthy')
                    : t(`وُجدت ${n(report.issueCount)} مشكلة`, `${n(report.issueCount)} issues found`)}
                </h2>
                <p className="page-sub" style={{ marginTop: 3 }}>
                  {report.healthy
                    ? t(
                        `فحصنا ${n(recordCount)} سجلاً ولم نجد أي تكرار أو سجل تالف.`,
                        `We scanned ${n(recordCount)} records and found no duplicates or damaged entries.`
                      )
                    : t(
                        'راجع القائمة أدناه قبل الإصلاح — لا يُحذف أي سجل بدون موافقتك.',
                        'Review the list below before repairing — nothing is deleted without your confirmation.'
                      )}
                </p>
              </div>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {report.criticalCount ? (
                <span className="badge" style={{ color: 'var(--danger)' }}>
                  <Icon name="alert" size={11} /> {t('حرج', 'Critical')}: {n(report.criticalCount)}
                </span>
              ) : null}
              {report.warningCount ? (
                <span className="badge" style={{ color: 'var(--warning)' }}>
                  {t('تحذير', 'Warning')}: {n(report.warningCount)}
                </span>
              ) : null}
              {report.infoCount ? (
                <span className="badge">
                  {t('ملاحظات', 'Notices')}: {n(report.infoCount)}
                </span>
              ) : null}
              <span className="badge">
                <Icon name="refresh" size={11} /> {t('آخر فحص', 'Last scan')}: {time(report.scannedAt)}
              </span>
            </div>
          </section>

          <div className="grid-3">
            {stats.map((stat) => (
              <div key={stat.key} className="stat-card" style={{ padding: 11 }}>
                <div className="row" style={{ gap: 5, color: 'var(--accent)' }}>
                  <Icon name={stat.icon} size={13} />
                  <small style={{ color: 'var(--muted)', fontSize: 9.5 }}>{t(stat.labelAr, stat.labelEn)}</small>
                </div>
                <b style={{ fontSize: 18 }}>{n(stat.value)}</b>
              </div>
            ))}
          </div>

          {lastRepair ? (
            <section className="glass-soft" style={{ padding: '12px 14px' }}>
              <div className="row" style={{ gap: 8 }}>
                <Icon name="check" size={16} style={{ color: 'var(--accent)' }} />
                <b style={{ fontSize: 12.5 }}>{t('نتيجة آخر إصلاح', 'Last repair result')}</b>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                <SummaryPill label={t('دُمج', 'Merged')} value={lastRepair.merged} />
                <SummaryPill label={t('طُبِّع', 'Normalized')} value={lastRepair.normalized} />
                <SummaryPill label={t('أُعيد تعيينه', 'Reassigned')} value={lastRepair.reassigned} />
                <SummaryPill label={t('حُذف', 'Deleted')} value={lastRepair.removedRecords + lastRepair.removedItems} />
                <SummaryPill label={t('إعدادات', 'Settings')} value={lastRepair.settingsFixed} />
              </div>
              {lastRepair.lockDisabled ? (
                <p className="field-error" style={{ marginTop: 7, marginBottom: 0 }}>
                  {t(
                    'أوقفنا قفل التطبيق لأنه كان بلا بيانات دخول صالحة. أعد تفعيله من الإعدادات إن أردت.',
                    'The app lock was turned off because it had no usable credential. Enable it again from Settings if you want.'
                  )}
                </p>
              ) : null}
            </section>
          ) : null}

          {activeSections.map((section) => (
            <section key={section.id} className="glass card col" style={{ gap: 8 }}>
              <div className="section-head">
                <div className="row" style={{ gap: 7 }}>
                  <Icon name={SECTION_ICONS[section.id]} size={15} style={{ color: 'var(--accent)' }} />
                  <h2 className="section-title">{t(section.titleAr, section.titleEn)}</h2>
                </div>
                <span className="badge accent">{n(section.affected)}</span>
              </div>
              <div className="list">
                {section.issues.map((issue) => (
                  <IssueRow key={issue.key} issue={issue} />
                ))}
              </div>
            </section>
          ))}

          {report.healthy ? (
            <section className="glass card col" style={{ gap: 8, alignItems: 'center', textAlign: 'center', paddingBlock: 22 }}>
              <span className="brand-mark" aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 18 }}>
                <Icon name="shield" size={24} />
              </span>
              <b style={{ fontSize: 14 }}>{t('لا شيء يحتاج إلى إصلاح', 'Nothing needs repairing')}</b>
              <p className="page-sub" style={{ margin: 0, maxWidth: 280 }}>
                {t(
                  'سنعيد الفحص في كل مرة تفتح فيها هذه الشاشة. البيانات الجديدة تُفحص تلقائياً.',
                  'We scan again every time you open this screen. New data is checked automatically.'
                )}
              </p>
              <span className="badge">
                {t('آخر فحص', 'Last scan')}: {date(report.scannedAt)} · {time(report.scannedAt)}
              </span>
              <Button variant="soft" size="sm" onClick={() => void scan()}>
                <Icon name="refresh" size={15} />
                {t('فحص الآن', 'Scan now')}
              </Button>
            </section>
          ) : (
            <Button variant="primary" size="lg" block loading={repairing} onClick={() => setConfirmOpen(true)}>
              <Icon name="sparkles" size={18} />
              {t(`إصلاح تلقائي (${n(report.issueCount)})`, `Auto-repair (${n(report.issueCount)})`)}
            </Button>
          )}

          <HintCard icon="shield">
            {t(
              'الفحص يعمل على جهازك فقط ولا يرسل أي بيانات. ننصح بأخذ نسخة احتياطية قبل الإصلاح.',
              'The scan runs on your device only and never sends any data. We recommend a backup before repairing.'
            )}
          </HintCard>

          <div className="grid-2">
            <Button variant="ghost" onClick={() => navigate('/tools/backup')}>
              <Icon name="database" size={16} />
              {t('نسخة احتياطية', 'Backup')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/tools/diagnostics')}>
              <Icon name="info" size={16} />
              {t('تشخيص الجهاز', 'Diagnostics')}
            </Button>
          </div>

          <ConfirmSheet
            open={confirmOpen}
            title={t('إصلاح البيانات تلقائياً؟', 'Repair the data automatically?')}
            description={t(
              `سيعالج الفحص ${n(report.issueCount)} مشكلة: دمج ${n(duplicateCount)} وجهة مكررة، وإعادة تعيين ${n(reassignCount)} سجلاً يتيماً، وحذف ${n(removalCount)} سجلاً غير صالح فقط. لا يمكن التراجع — يُفضّل أخذ نسخة احتياطية أولاً.`,
              `The scan will fix ${n(report.issueCount)} issues: merge ${n(duplicateCount)} duplicate destinations, reassign ${n(reassignCount)} orphan records, and delete ${n(removalCount)} invalid records only. This cannot be undone — a backup first is recommended.`
            )}
            confirmLabel={t('إصلاح الآن', 'Repair now')}
            onConfirm={() => void runRepair()}
            onClose={() => setConfirmOpen(false)}
          />
        </>
      )}
    </div>
  );
}
