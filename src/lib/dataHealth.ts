/**
 * Local data health: scan + safe repair for everything stored in IndexedDB.
 *
 * The scan is read-only and returns a bilingual report. The repair re-runs the
 * same analysis internally, so it only ever touches the records that the user
 * just saw — nothing is deleted without a matching issue in the report.
 */
import type {
  Campaign,
  CampaignItem,
  CampaignItemStatus,
  Destination,
  HistoryEntry,
  Reminder,
  Settings,
  TargetType,
  Template,
  Workspace
} from '../types';
import { db } from './db';
import { uid } from './format';
import { NATIVE_BIOMETRIC_SENTINEL } from './native-biometric';
import { countryByIso, parseTarget, validateUsername } from './phone';
import { FONTS, getSettings, SETTINGS_VERSION, updateSettings } from './settings';

/* ------------------------------------------------------------------ types */

export type HealthSeverity = 'critical' | 'warning' | 'info';

export type HealthSectionId =
  | 'workspaces'
  | 'destinations'
  | 'templates'
  | 'history'
  | 'campaigns'
  | 'reminders'
  | 'settings';

export type HealthIssueKey =
  | 'workspaces:empty'
  | 'workspaces:missing-default'
  | 'workspaces:empty-name'
  | 'destinations:duplicate'
  | 'destinations:orphan-workspace'
  | 'destinations:invalid-number'
  | 'destinations:invalid-username'
  | 'destinations:invalid-type'
  | 'destinations:type-mismatch'
  | 'destinations:normalize'
  | 'destinations:empty-label'
  | 'destinations:bad-tags'
  | 'templates:orphan-workspace'
  | 'templates:empty-body'
  | 'templates:empty-title'
  | 'templates:bad-tags'
  | 'history:orphan-workspace'
  | 'history:invalid-entry'
  | 'history:normalize'
  | 'history:bad-date'
  | 'campaigns:orphan-workspace'
  | 'campaigns:empty'
  | 'campaigns:bad-items'
  | 'campaigns:item-fixes'
  | 'campaigns:empty-name'
  | 'reminders:orphan-workspace'
  | 'reminders:invalid-target'
  | 'reminders:bad-due'
  | 'reminders:empty-label'
  | 'reminders:empty-fingerprint'
  | 'settings:unreadable'
  | 'settings:invalid-fields'
  | 'settings:lock-broken'
  | 'settings:version';

export interface HealthIssue {
  key: HealthIssueKey;
  section: HealthSectionId;
  severity: HealthSeverity;
  /** Number of records affected by this issue. */
  count: number;
  /** Up to a few readable samples, already formatted for display. */
  samples: string[];
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
}

export interface HealthSection {
  id: HealthSectionId;
  titleAr: string;
  titleEn: string;
  /** Records scanned in this section. */
  total: number;
  issues: HealthIssue[];
  /** Records affected by at least one issue (issue counts summed). */
  affected: number;
}

export interface HealthTotals {
  destinations: number;
  templates: number;
  history: number;
  campaigns: number;
  reminders: number;
  workspaces: number;
}

export interface DataHealthReport {
  scannedAt: number;
  durationMs: number;
  totals: HealthTotals;
  sections: HealthSection[];
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  healthy: boolean;
  /** True when the database could not be read at all. */
  error: boolean;
}

export interface RepairSummary {
  /** Duplicate destinations merged away. */
  merged: number;
  /** Values normalized (numbers, usernames, displays, campaign items). */
  normalized: number;
  /** Labels, titles and displays filled in. */
  relabeled: number;
  /** Records moved back to the default workspace. */
  reassigned: number;
  /** Invalid/empty records deleted. */
  removedRecords: number;
  /** Invalid campaign items deleted. */
  removedItems: number;
  /** Settings fields corrected. */
  settingsFixed: number;
  /** The app lock was disabled because it had no usable credential. */
  lockDisabled: boolean;
  total: number;
}

export interface RepairResult {
  ok: boolean;
  summary: RepairSummary;
}

/* --------------------------------------------------------------- constants */

const SETTINGS_STORAGE_KEY = 'admh2_settings';
const DEFAULT_WORKSPACE_ID = 'personal';
const DEFAULT_COUNTRY = 'IQ';
const DEFAULT_ACCENT = '#6EE7B7';
const MAX_SAMPLES = 4;

const SECTION_ORDER: HealthSectionId[] = ['workspaces', 'destinations', 'templates', 'history', 'campaigns', 'reminders', 'settings'];

const SECTION_LABELS: Record<HealthSectionId, { ar: string; en: string }> = {
  workspaces: { ar: 'مساحات العمل', en: 'Workspaces' },
  destinations: { ar: 'الوجهات المحفوظة', en: 'Saved destinations' },
  templates: { ar: 'القوالب', en: 'Templates' },
  history: { ar: 'السجل', en: 'History' },
  campaigns: { ar: 'الحملات', en: 'Campaigns' },
  reminders: { ar: 'التذكيرات', en: 'Reminders' },
  settings: { ar: 'الإعدادات', en: 'Settings' }
};

interface IssueDefinition {
  section: HealthSectionId;
  severity: HealthSeverity;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
}

const ISSUES: Record<HealthIssueKey, IssueDefinition> = {
  'workspaces:empty': {
    section: 'workspaces',
    severity: 'critical',
    titleAr: 'لا توجد مساحة عمل',
    titleEn: 'No workspaces',
    detailAr: 'ستُنشأ مساحتا «شخصي» و«عمل» تلقائياً.',
    detailEn: 'The “Personal” and “Work” workspaces will be created automatically.'
  },
  'workspaces:missing-default': {
    section: 'workspaces',
    severity: 'warning',
    titleAr: 'مساحة العمل الافتراضية مفقودة',
    titleEn: 'The default workspace is missing',
    detailAr: 'ستُنشأ مساحة «شخصي» تلقائياً لتستقبل السجلات اليتيمة.',
    detailEn: 'A “Personal” workspace will be created automatically to receive orphan records.'
  },
  'workspaces:empty-name': {
    section: 'workspaces',
    severity: 'info',
    titleAr: 'مساحات عمل بلا اسم',
    titleEn: 'Workspaces without a name',
    detailAr: 'سيُشتق الاسم من الاسم الإنجليزي أو المعرّف.',
    detailEn: 'The name will be derived from the English name or the id.'
  },
  'destinations:duplicate': {
    section: 'destinations',
    severity: 'warning',
    titleAr: 'وجهات مكررة',
    titleEn: 'Duplicate destinations',
    detailAr: 'نفس الوجهة أكثر من مرة في مساحة العمل نفسها — ستُدمج في سجل واحد يحتفظ بالمفضلة والوسوم وعدد الاستخدامات.',
    detailEn:
      'The same destination appears more than once in one workspace — the copies will be merged into one record that keeps favorites, tags and usage count.'
  },
  'destinations:orphan-workspace': {
    section: 'destinations',
    severity: 'warning',
    titleAr: 'وجهات في مساحة عمل مفقودة',
    titleEn: 'Destinations in a missing workspace',
    detailAr: 'ستُنقل إلى مساحة العمل الافتراضية بدل أن تختفي.',
    detailEn: 'They will be moved to the default workspace instead of disappearing.'
  },
  'destinations:invalid-number': {
    section: 'destinations',
    severity: 'critical',
    titleAr: 'وجهات بأرقام غير صالحة',
    titleEn: 'Destinations with invalid numbers',
    detailAr: 'لا يمكن فتحها في واتساب — ستُحذف بعد موافقتك فقط.',
    detailEn: 'They cannot open in WhatsApp — they will be deleted only after your confirmation.'
  },
  'destinations:invalid-username': {
    section: 'destinations',
    severity: 'critical',
    titleAr: 'وجهات بأسماء مستخدم غير صالحة',
    titleEn: 'Destinations with invalid usernames',
    detailAr: 'صيغة اسم المستخدم غير صحيحة — ستُحذف بعد موافقتك فقط.',
    detailEn: 'The username format is invalid — these will be deleted only after your confirmation.'
  },
  'destinations:invalid-type': {
    section: 'destinations',
    severity: 'critical',
    titleAr: 'وجهات بلا نوع أو قيمة',
    titleEn: 'Destinations without a type or value',
    detailAr: 'لا يمكن استخدامها — ستُحذف بعد موافقتك فقط.',
    detailEn: 'They cannot be used — they will be deleted only after your confirmation.'
  },
  'destinations:type-mismatch': {
    section: 'destinations',
    severity: 'warning',
    titleAr: 'نوع الوجهة لا يطابق القيمة',
    titleEn: 'Destination type does not match the value',
    detailAr: 'سيُصحَّح النوع تلقائياً دون فقدان البيانات.',
    detailEn: 'The type will be corrected automatically without losing data.'
  },
  'destinations:normalize': {
    section: 'destinations',
    severity: 'info',
    titleAr: 'أرقام بحاجة إلى تطبيع',
    titleEn: 'Numbers that need normalizing',
    detailAr: 'ستُحوَّل إلى الصيغة الدولية الموحّدة (E.164 بدون +).',
    detailEn: 'They will be converted to the unified international form (E.164 without +).'
  },
  'destinations:empty-label': {
    section: 'destinations',
    severity: 'info',
    titleAr: 'وجهات بلا اسم',
    titleEn: 'Destinations without a name',
    detailAr: 'سيُشتق الاسم من الرقم.',
    detailEn: 'The name will be derived from the number.'
  },
  'destinations:bad-tags': {
    section: 'destinations',
    severity: 'info',
    titleAr: 'وسوم وجهات غير صالحة',
    titleEn: 'Invalid destination tags',
    detailAr: 'سيُستبدل حقل الوسوم بقائمة فارغة.',
    detailEn: 'The tags field will be replaced with an empty list.'
  },
  'templates:orphan-workspace': {
    section: 'templates',
    severity: 'warning',
    titleAr: 'قوالب في مساحة عمل مفقودة',
    titleEn: 'Templates in a missing workspace',
    detailAr: 'ستُنقل إلى مساحة العمل الافتراضية.',
    detailEn: 'They will be moved to the default workspace.'
  },
  'templates:empty-body': {
    section: 'templates',
    severity: 'critical',
    titleAr: 'قوالب بلا نص',
    titleEn: 'Templates with an empty body',
    detailAr: 'لا فائدة منها — ستُحذف بعد موافقتك فقط.',
    detailEn: 'They are unusable — they will be deleted only after your confirmation.'
  },
  'templates:empty-title': {
    section: 'templates',
    severity: 'info',
    titleAr: 'قوالب بلا عنوان',
    titleEn: 'Templates without a title',
    detailAr: 'سيُشتق العنوان من أول نص القالب.',
    detailEn: 'The title will be derived from the first words of the template.'
  },
  'templates:bad-tags': {
    section: 'templates',
    severity: 'info',
    titleAr: 'وسوم قوالب غير صالحة',
    titleEn: 'Invalid template tags',
    detailAr: 'سيُستبدل حقل الوسوم بقائمة فارغة.',
    detailEn: 'The tags field will be replaced with an empty list.'
  },
  'history:orphan-workspace': {
    section: 'history',
    severity: 'warning',
    titleAr: 'سجلات في مساحة عمل مفقودة',
    titleEn: 'History entries in a missing workspace',
    detailAr: 'ستُنقل إلى مساحة العمل الافتراضية.',
    detailEn: 'They will be moved to the default workspace.'
  },
  'history:invalid-entry': {
    section: 'history',
    severity: 'critical',
    titleAr: 'سجلات تشير إلى وجهة غير صالحة',
    titleEn: 'History entries with an invalid target',
    detailAr: 'لا يمكن إعادة استخدامها — ستُحذف بعد موافقتك فقط.',
    detailEn: 'They cannot be reused — they will be deleted only after your confirmation.'
  },
  'history:normalize': {
    section: 'history',
    severity: 'info',
    titleAr: 'سجلات بحاجة إلى تطبيع',
    titleEn: 'History entries that need normalizing',
    detailAr: 'ستُصحَّح القيمة والعرض إلى الصيغة الموحّدة.',
    detailEn: 'The value and display will be corrected to the unified form.'
  },
  'history:bad-date': {
    section: 'history',
    severity: 'info',
    titleAr: 'سجلات بتاريخ غير صالح',
    titleEn: 'History entries with an invalid date',
    detailAr: 'سيُضبط تاريخها على الآن للحفاظ على الترتيب.',
    detailEn: 'Their date will be set to now to keep the ordering sane.'
  },
  'campaigns:orphan-workspace': {
    section: 'campaigns',
    severity: 'warning',
    titleAr: 'حملات في مساحة عمل مفقودة',
    titleEn: 'Campaigns in a missing workspace',
    detailAr: 'ستُنقل إلى مساحة العمل الافتراضية.',
    detailEn: 'They will be moved to the default workspace.'
  },
  'campaigns:empty': {
    section: 'campaigns',
    severity: 'critical',
    titleAr: 'حملات بلا عناصر',
    titleEn: 'Campaigns without items',
    detailAr: 'لا يمكن تشغيلها — ستُحذف بعد موافقتك فقط.',
    detailEn: 'They cannot be run — they will be deleted only after your confirmation.'
  },
  'campaigns:bad-items': {
    section: 'campaigns',
    severity: 'critical',
    titleAr: 'حملات بعناصر تالفة',
    titleEn: 'Campaigns with corrupted items',
    detailAr: 'قائمة العناصر غير قابلة للقراءة — ستُحذف بعد موافقتك فقط.',
    detailEn: 'The item list cannot be read — these campaigns will be deleted only after your confirmation.'
  },
  'campaigns:item-fixes': {
    section: 'campaigns',
    severity: 'warning',
    titleAr: 'عناصر حملات تحتاج إصلاحاً',
    titleEn: 'Campaign items that need repair',
    detailAr: 'ستُطبَّع الأرقام وتُحذف العناصر غير الصالحة من القائمة.',
    detailEn: 'Numbers will be normalized and invalid items removed from the list.'
  },
  'campaigns:empty-name': {
    section: 'campaigns',
    severity: 'info',
    titleAr: 'حملات بلا اسم',
    titleEn: 'Campaigns without a name',
    detailAr: 'سيُعطى كل منها اسماً افتراضياً.',
    detailEn: 'Each one will get a default name.'
  },
  'reminders:orphan-workspace': {
    section: 'reminders',
    severity: 'warning',
    titleAr: 'تذكيرات في مساحة عمل مفقودة',
    titleEn: 'Reminders in a missing workspace',
    detailAr: 'ستُنقل إلى مساحة العمل الافتراضية.',
    detailEn: 'They will be moved to the default workspace.'
  },
  'reminders:invalid-target': {
    section: 'reminders',
    severity: 'critical',
    titleAr: 'تذكيرات بوجهة غير صالحة',
    titleEn: 'Reminders with an invalid target',
    detailAr: 'لا يمكن فتح محادثتها — ستُحذف بعد موافقتك فقط.',
    detailEn: 'Their chat cannot be opened — they will be deleted only after your confirmation.'
  },
  'reminders:bad-due': {
    section: 'reminders',
    severity: 'warning',
    titleAr: 'تذكيرات بموعد غير صالح',
    titleEn: 'Reminders with an invalid time',
    detailAr: 'ستُعلَّم كمستحقة الآن حتى لا تضيع.',
    detailEn: 'They will be marked due now so they are not lost.'
  },
  'reminders:empty-label': {
    section: 'reminders',
    severity: 'info',
    titleAr: 'تذكيرات بلا اسم',
    titleEn: 'Reminders without a name',
    detailAr: 'سيُشتق الاسم من الوجهة.',
    detailEn: 'The name will be derived from the target.'
  },
  'reminders:empty-fingerprint': {
    section: 'reminders',
    severity: 'info',
    titleAr: 'تذكيرات بلا بصمة',
    titleEn: 'Reminders without a fingerprint',
    detailAr: 'ستُشتق البصمة من الوجهة لمنع التكرار.',
    detailEn: 'The fingerprint will be derived from the target to prevent duplicates.'
  },
  'settings:unreadable': {
    section: 'settings',
    severity: 'critical',
    titleAr: 'ملف الإعدادات تالف',
    titleEn: 'The settings file is corrupted',
    detailAr: 'ستُستعاد الإعدادات الافتراضية مع الحفاظ على كل بياناتك.',
    detailEn: 'Default settings will be restored while keeping all of your data.'
  },
  'settings:invalid-fields': {
    section: 'settings',
    severity: 'warning',
    titleAr: 'قيم إعدادات غير صالحة',
    titleEn: 'Invalid settings values',
    detailAr: 'ستُضبط القيم الصحيحة تلقائياً (اللغة، الخط، المظهر، الدولة، مساحة العمل).',
    detailEn: 'Valid values will be restored automatically (language, font, theme, country, workspace).'
  },
  'settings:lock-broken': {
    section: 'settings',
    severity: 'critical',
    titleAr: 'قفل التطبيق بلا بيانات دخول',
    titleEn: 'App lock without a credential',
    detailAr: 'القفل مفعّل بلا PIN أو بصمة صالحة، وقد يمنعك من الدخول — سيتوقف القفل ويمكنك إعادة تفعيله من الإعدادات.',
    detailEn:
      'The lock is enabled without a valid PIN or biometric credential and may lock you out — the lock will be turned off and you can enable it again from Settings.'
  },
  'settings:version': {
    section: 'settings',
    severity: 'info',
    titleAr: 'إصدار إعدادات قديم',
    titleEn: 'Outdated settings version',
    detailAr: 'سيُحدَّث هيكل الإعدادات إلى الإصدار الحالي.',
    detailEn: 'The settings structure will be updated to the current version.'
  }
};

/* ----------------------------------------------------------------- helpers */

interface CollectedIssue {
  key: HealthIssueKey;
  count: number;
  samples: string[];
}

function createCollector() {
  const map = new Map<HealthIssueKey, CollectedIssue>();
  return {
    add(key: HealthIssueKey, count = 1, sample?: string): void {
      if (count <= 0) return;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { key, count, samples: sample ? [sample] : [] });
        return;
      }
      existing.count += count;
      if (sample && existing.samples.length < MAX_SAMPLES) existing.samples.push(sample);
    },
    values(): CollectedIssue[] {
      return [...map.values()];
    }
  };
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanOf(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

interface ResolvedTarget {
  type: TargetType;
  value: string;
  display: string;
}

/** Accepts digits, international format, local format or a wa.me link. */
function resolvePhoneTarget(rawValue: string, defaultCountry: string): ResolvedTarget | null {
  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.startsWith('@')) return null;
  const candidate = trimmed.startsWith('+') ? trimmed : '+' + trimmed;
  const international = parseTarget(candidate, { country: defaultCountry });
  if (international.ok && international.target.type === 'phone') {
    return { type: 'phone', value: international.target.value, display: international.target.display };
  }
  const local = parseTarget(trimmed, { country: defaultCountry });
  if (local.ok && local.target.type === 'phone') {
    return { type: 'phone', value: local.target.value, display: local.target.display };
  }
  return null;
}

function resolveUsernameTarget(rawValue: string): ResolvedTarget | null {
  const cleaned = rawValue.trim().replace(/^@/, '');
  if (!cleaned || !validateUsername(cleaned)) return null;
  return { type: 'username', value: cleaned, display: '@' + cleaned };
}

interface RawSettings {
  raw: Record<string, unknown> | null;
  unreadable: boolean;
  missing: boolean;
}

function readRawSettings(): RawSettings {
  try {
    const text = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!text) return { raw: null, unreadable: false, missing: true };
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { raw: null, unreadable: true, missing: false };
    }
    return { raw: parsed as Record<string, unknown>, unreadable: false, missing: false };
  } catch {
    return { raw: null, unreadable: true, missing: false };
  }
}

/* ------------------------------------------------------------ plan + report */

interface PlanCounts {
  merged: number;
  normalized: number;
  relabeled: number;
  reassigned: number;
  removedRecords: number;
  removedItems: number;
  settingsFixed: number;
  lockDisabled: boolean;
}

interface IdPatch<T> {
  id: string;
  patch: Partial<T>;
}

interface HealthPlan {
  report: DataHealthReport;
  counts: PlanCounts;
  destinationUpdates: Array<IdPatch<Destination>>;
  destinationRemovals: string[];
  templateUpdates: Array<IdPatch<Template>>;
  templateRemovals: string[];
  historyUpdates: Array<IdPatch<HistoryEntry>>;
  historyRemovals: string[];
  campaignUpdates: Array<IdPatch<Campaign>>;
  campaignRemovals: string[];
  reminderUpdates: Array<IdPatch<Reminder>>;
  reminderRemovals: string[];
  workspaceUpdates: Array<IdPatch<Workspace>>;
  createDefaultWorkspaces: boolean;
  createPersonalWorkspace: boolean;
  settingsPatch: Partial<Settings> | null;
}

const EMPTY_TOTALS: HealthTotals = { destinations: 0, templates: 0, history: 0, campaigns: 0, reminders: 0, workspaces: 0 };

function createEmptySummary(): RepairSummary {
  return {
    merged: 0,
    normalized: 0,
    relabeled: 0,
    reassigned: 0,
    removedRecords: 0,
    removedItems: 0,
    settingsFixed: 0,
    lockDisabled: false,
    total: 0
  };
}

function buildReport(collected: CollectedIssue[], totals: HealthTotals, durationMs: number): DataHealthReport {
  const sections: HealthSection[] = SECTION_ORDER.map((id) => {
    const issues: HealthIssue[] = collected
      .filter((item) => ISSUES[item.key].section === id)
      .map((item) => {
        const definition = ISSUES[item.key];
        return {
          key: item.key,
          section: id,
          severity: definition.severity,
          count: item.count,
          samples: item.samples,
          titleAr: definition.titleAr,
          titleEn: definition.titleEn,
          detailAr: definition.detailAr,
          detailEn: definition.detailEn
        };
      });
    return {
      id,
      titleAr: SECTION_LABELS[id].ar,
      titleEn: SECTION_LABELS[id].en,
      total: id === 'settings' ? 1 : totals[id],
      issues,
      affected: issues.reduce((sum, issue) => sum + issue.count, 0)
    };
  });

  const allIssues = sections.flatMap((section) => section.issues);
  const sum = (severity: HealthSeverity): number =>
    allIssues.filter((issue) => issue.severity === severity).reduce((total, issue) => total + issue.count, 0);
  const issueCount = allIssues.reduce((total, issue) => total + issue.count, 0);

  return {
    scannedAt: Date.now(),
    durationMs,
    totals,
    sections,
    issueCount,
    criticalCount: sum('critical'),
    warningCount: sum('warning'),
    infoCount: sum('info'),
    healthy: issueCount === 0,
    error: false
  };
}

function failedReport(): DataHealthReport {
  return {
    scannedAt: Date.now(),
    durationMs: 0,
    totals: EMPTY_TOTALS,
    sections: [],
    issueCount: 0,
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
    healthy: false,
    error: true
  };
}

function compareDestinations(a: Destination, b: Destination): number {
  const favoriteA = a.favorite === true ? 1 : 0;
  const favoriteB = b.favorite === true ? 1 : 0;
  if (favoriteA !== favoriteB) return favoriteB - favoriteA;
  const useA = numberOf(a.useCount) ?? 0;
  const useB = numberOf(b.useCount) ?? 0;
  if (useA !== useB) return useB - useA;
  const stampA = numberOf(a.lastUsedAt) ?? numberOf(a.createdAt) ?? 0;
  const stampB = numberOf(b.lastUsedAt) ?? numberOf(b.createdAt) ?? 0;
  return stampB - stampA;
}

interface ValidDestination {
  id: string;
  workspaceId: string;
  type: TargetType;
  value: string;
  display: string;
  label: string;
  record: Destination;
}

/* ---------------------------------------------------------------- analysis */

async function buildPlan(): Promise<HealthPlan> {
  const startedAt = Date.now();
  const [workspaces, destinations, templates, history, campaigns, reminders] = await Promise.all([
    db.workspaces.toArray(),
    db.destinations.toArray(),
    db.templates.toArray(),
    db.history.toArray(),
    db.campaigns.toArray(),
    db.reminders.toArray()
  ]);

  const settings = getSettings();
  const defaultCountry = settings.defaultCountry;
  const issues = createCollector();
  const counts: PlanCounts = {
    merged: 0,
    normalized: 0,
    relabeled: 0,
    reassigned: 0,
    removedRecords: 0,
    removedItems: 0,
    settingsFixed: 0,
    lockDisabled: false
  };

  const workspaceIds = new Set<string>();
  for (const workspace of workspaces) {
    const id = textOf(workspace.id);
    if (id) workspaceIds.add(id);
  }
  const hasDefaultWorkspace = workspaceIds.has(DEFAULT_WORKSPACE_ID);
  const fallbackWorkspaceId = DEFAULT_WORKSPACE_ID;
  const createDefaultWorkspaces = workspaces.length === 0;
  const createPersonalWorkspace = !hasDefaultWorkspace;
  if (createDefaultWorkspaces) issues.add('workspaces:empty');
  else if (createPersonalWorkspace) issues.add('workspaces:missing-default');

  /* --- workspaces ------------------------------------------------------- */
  const workspaceUpdates: Array<IdPatch<Workspace>> = [];
  for (const workspace of workspaces) {
    const id = textOf(workspace.id);
    if (!id) continue;
    const name = textOf(workspace.name);
    const nameEn = textOf(workspace.nameEn);
    if (!name) {
      workspaceUpdates.push({ id, patch: { name: nameEn || 'مساحة عمل' } });
      issues.add('workspaces:empty-name', 1, nameEn || id);
      counts.relabeled += 1;
    }
  }

  /* --- templates -------------------------------------------------------- */
  const templatePatches = new Map<string, Partial<Template>>();
  const templateRemovals: string[] = [];
  const patchTemplate = (id: string, patch: Partial<Template>): void => {
    templatePatches.set(id, { ...(templatePatches.get(id) ?? {}), ...patch });
  };

  for (const template of templates) {
    const id = textOf(template.id);
    if (!id) continue;
    const title = textOf(template.title);

    if (!workspaceIds.has(textOf(template.workspaceId))) {
      patchTemplate(id, { workspaceId: fallbackWorkspaceId });
      issues.add('templates:orphan-workspace', 1, title || id);
      counts.reassigned += 1;
    }

    const body = textOf(template.body);
    if (!body) {
      templateRemovals.push(id);
      issues.add('templates:empty-body', 1, title || id);
      counts.removedRecords += 1;
      continue;
    }
    if (!title) {
      patchTemplate(id, { title: body.slice(0, 40) });
      issues.add('templates:empty-title', 1, body.slice(0, 40));
      counts.relabeled += 1;
    }
    if (!Array.isArray(template.tags)) {
      patchTemplate(id, { tags: [] });
      issues.add('templates:bad-tags', 1, title || body.slice(0, 30));
    }
  }

  /* --- destinations ----------------------------------------------------- */
  const destinationPatches = new Map<string, Partial<Destination>>();
  const destinationRemovals: string[] = [];
  const patchDestination = (id: string, patch: Partial<Destination>): void => {
    destinationPatches.set(id, { ...(destinationPatches.get(id) ?? {}), ...patch });
  };
  const validDestinations: ValidDestination[] = [];

  for (const destination of destinations) {
    const id = textOf(destination.id);
    if (!id) continue;
    const label = textOf(destination.label);
    const rawType = textOf(destination.type);
    const rawPhone = textOf(destination.phone);
    const rawUsername = textOf(destination.username);

    const storedWorkspaceId = textOf(destination.workspaceId);
    const workspaceIsValid = workspaceIds.has(storedWorkspaceId);
    if (!workspaceIsValid) {
      patchDestination(id, { workspaceId: fallbackWorkspaceId });
      issues.add('destinations:orphan-workspace', 1, label || id);
      counts.reassigned += 1;
    }
    const effectiveWorkspaceId = workspaceIsValid ? storedWorkspaceId : fallbackWorkspaceId;

    const declaredType: TargetType | null = rawType === 'phone' || rawType === 'username' ? rawType : null;
    const source = declaredType === 'username' ? rawUsername || rawPhone : rawPhone || rawUsername;

    if (!declaredType || !source) {
      destinationRemovals.push(id);
      issues.add('destinations:invalid-type', 1, label || id);
      counts.removedRecords += 1;
      continue;
    }

    let resolved: ResolvedTarget | null = null;
    let normalized = false;

    if (declaredType === 'phone') {
      if (source.startsWith('@')) {
        const asUsername = resolveUsernameTarget(source);
        if (asUsername) {
          resolved = asUsername;
          patchDestination(id, { type: 'username', username: asUsername.value, phone: undefined });
          issues.add('destinations:type-mismatch', 1, asUsername.display);
          counts.normalized += 1;
        }
      } else {
        const asPhone = resolvePhoneTarget(source, defaultCountry);
        if (asPhone) {
          resolved = asPhone;
          if (rawPhone !== asPhone.value) {
            patchDestination(id, { phone: asPhone.value });
            normalized = true;
          }
        }
      }
      if (!resolved) {
        destinationRemovals.push(id);
        issues.add('destinations:invalid-number', 1, label || rawPhone || id);
        counts.removedRecords += 1;
        continue;
      }
    } else {
      const asUsername = resolveUsernameTarget(source);
      if (asUsername) {
        resolved = asUsername;
        if (rawUsername !== asUsername.value) {
          patchDestination(id, { username: asUsername.value });
          normalized = true;
        }
      } else {
        const asPhone = resolvePhoneTarget(source, defaultCountry);
        if (asPhone) {
          resolved = asPhone;
          patchDestination(id, { type: 'phone', phone: asPhone.value, username: undefined });
          issues.add('destinations:type-mismatch', 1, asPhone.display);
          counts.normalized += 1;
        }
      }
      if (!resolved) {
        destinationRemovals.push(id);
        issues.add('destinations:invalid-username', 1, label || rawUsername || id);
        counts.removedRecords += 1;
        continue;
      }
    }

    if (normalized) {
      issues.add('destinations:normalize', 1, resolved.display);
      counts.normalized += 1;
    }
    if (!label) {
      patchDestination(id, { label: resolved.display.slice(0, 80) });
      issues.add('destinations:empty-label', 1, resolved.display);
      counts.relabeled += 1;
    }
    if (!Array.isArray(destination.tags)) {
      patchDestination(id, { tags: [] });
      issues.add('destinations:bad-tags', 1, label || resolved.display);
    }

    validDestinations.push({
      id,
      workspaceId: effectiveWorkspaceId,
      type: resolved.type,
      value: resolved.value,
      display: resolved.display,
      label: label || resolved.display,
      record: destination
    });
  }

  // Duplicates: same workspace + type + canonical value.
  const duplicateGroups = new Map<string, ValidDestination[]>();
  for (const item of validDestinations) {
    const key = `${item.workspaceId}|${item.type}|${item.value}`;
    const bucket = duplicateGroups.get(key);
    if (bucket) bucket.push(item);
    else duplicateGroups.set(key, [item]);
  }
  const duplicateRemovals = new Set<string>();
  for (const bucket of duplicateGroups.values()) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => compareDestinations(a.record, b.record));
    const keep = sorted[0];
    const extras = sorted.slice(1);
    const mergedPatch: Partial<Destination> = {};

    const favorite = sorted.some((item) => item.record.favorite === true);
    mergedPatch.favorite = favorite;
    const totalUse = sorted.reduce((sum, item) => sum + (numberOf(item.record.useCount) ?? 0), 0);
    if (totalUse > (numberOf(keep.record.useCount) ?? 0)) mergedPatch.useCount = totalUse;
    const lastUsed = Math.max(...sorted.map((item) => numberOf(item.record.lastUsedAt) ?? 0));
    if (lastUsed > 0) mergedPatch.lastUsedAt = lastUsed;

    const tagSet = new Set<string>();
    for (const item of sorted) {
      for (const tag of arrayOf<string>(item.record.tags)) {
        const clean = textOf(tag);
        if (clean) tagSet.add(clean);
      }
    }
    if (tagSet.size) mergedPatch.tags = [...tagSet].slice(0, 12);
    if (!textOf(keep.record.note)) {
      const note = extras.map((item) => textOf(item.record.note)).find(Boolean);
      if (note) mergedPatch.note = note;
    }
    if (!textOf(keep.record.label) && keep.label) mergedPatch.label = keep.label;

    patchDestination(keep.id, mergedPatch);
    for (const extra of extras) {
      duplicateRemovals.add(extra.id);
      destinationPatches.delete(extra.id);
    }
    issues.add('destinations:duplicate', extras.length, keep.display);
    counts.merged += extras.length;
  }

  /* --- history ---------------------------------------------------------- */
  const historyPatches = new Map<string, Partial<HistoryEntry>>();
  const historyRemovals: string[] = [];
  const patchHistory = (id: string, patch: Partial<HistoryEntry>): void => {
    historyPatches.set(id, { ...(historyPatches.get(id) ?? {}), ...patch });
  };

  for (const entry of history) {
    const id = textOf(entry.id);
    if (!id) continue;
    const targetType = textOf(entry.targetType);
    const value = textOf(entry.value);

    if (!workspaceIds.has(textOf(entry.workspaceId))) {
      patchHistory(id, { workspaceId: fallbackWorkspaceId });
      issues.add('history:orphan-workspace', 1, textOf(entry.display) || id);
      counts.reassigned += 1;
    }

    const resolved = targetType === 'phone' ? resolvePhoneTarget(value, defaultCountry) : targetType === 'username' ? resolveUsernameTarget(value) : null;
    if (!resolved) {
      historyRemovals.push(id);
      issues.add('history:invalid-entry', 1, textOf(entry.display) || value || id);
      counts.removedRecords += 1;
      continue;
    }

    const patch: Partial<HistoryEntry> = {};
    if (resolved.type !== targetType) patch.targetType = resolved.type;
    if (value !== resolved.value) patch.value = resolved.value;
    if (textOf(entry.display) !== resolved.display) patch.display = resolved.display;
    if (Object.keys(patch).length) {
      patchHistory(id, patch);
      issues.add('history:normalize', 1, resolved.display);
      counts.normalized += 1;
    }

    const usedAt = numberOf(entry.usedAt);
    if (usedAt === null || usedAt <= 0) {
      patchHistory(id, { usedAt: Date.now() });
      issues.add('history:bad-date', 1, resolved.display);
    }
  }

  /* --- campaigns -------------------------------------------------------- */
  const campaignPatches = new Map<string, Partial<Campaign>>();
  const campaignRemovals: string[] = [];
  const patchCampaign = (id: string, patch: Partial<Campaign>): void => {
    campaignPatches.set(id, { ...(campaignPatches.get(id) ?? {}), ...patch });
  };

  for (const campaign of campaigns) {
    const id = textOf(campaign.id);
    if (!id) continue;
    const name = textOf(campaign.name);

    if (!workspaceIds.has(textOf(campaign.workspaceId))) {
      patchCampaign(id, { workspaceId: fallbackWorkspaceId });
      issues.add('campaigns:orphan-workspace', 1, name || id);
      counts.reassigned += 1;
    }

    if (!Array.isArray(campaign.items)) {
      campaignRemovals.push(id);
      issues.add('campaigns:bad-items', 1, name || id);
      counts.removedRecords += 1;
      continue;
    }

    const fixedItems: CampaignItem[] = [];
    const seenTargets = new Set<string>();
    let changedItems = 0;
    let droppedItems = 0;

    for (const rawItem of campaign.items as unknown[]) {
      if (!rawItem || typeof rawItem !== 'object') {
        droppedItems += 1;
        continue;
      }
      const item = rawItem as Record<string, unknown>;
      const phone = textOf(item.phone);
      const username = textOf(item.username);
      const itemLabel = textOf(item.label);
      const itemDisplay = textOf(item.display);

      let resolved: ResolvedTarget | null = null;
      if (phone) resolved = resolvePhoneTarget(phone, defaultCountry);
      if (!resolved && username) resolved = resolveUsernameTarget(username);
      if (!resolved && itemDisplay) resolved = resolvePhoneTarget(itemDisplay, defaultCountry) ?? resolveUsernameTarget(itemDisplay);
      if (!resolved) {
        droppedItems += 1;
        continue;
      }

      const targetKey = `${resolved.type}:${resolved.value}`;
      if (seenTargets.has(targetKey)) {
        droppedItems += 1;
        continue;
      }
      seenTargets.add(targetKey);

      const rawStatus = textOf(item.status);
      const status: CampaignItemStatus =
        rawStatus === 'sent' || rawStatus === 'skipped' || rawStatus === 'pending' ? rawStatus : 'pending';
      const itemId = textOf(item.id) || uid();
      const nextLabel = itemLabel || resolved.display;
      const nextDisplay = resolved.display;

      if (
        !itemLabel ||
        rawStatus !== status ||
        itemDisplay !== nextDisplay ||
        textOf(item.id) !== itemId ||
        (resolved.type === 'phone' && phone !== resolved.value) ||
        (resolved.type === 'username' && username !== resolved.value)
      ) {
        changedItems += 1;
      }

      fixedItems.push({
        id: itemId,
        label: nextLabel,
        display: nextDisplay,
        phone: resolved.type === 'phone' ? resolved.value : undefined,
        username: resolved.type === 'username' ? resolved.value : undefined,
        status,
        updatedAt: numberOf(item.updatedAt) ?? undefined
      });
    }

    if (fixedItems.length === 0) {
      campaignRemovals.push(id);
      issues.add('campaigns:empty', 1, name || id);
      counts.removedRecords += 1;
      counts.removedItems += droppedItems;
      continue;
    }

    if (changedItems > 0 || droppedItems > 0) {
      patchCampaign(id, { items: fixedItems });
      issues.add('campaigns:item-fixes', changedItems + droppedItems, name || id);
      counts.normalized += changedItems;
      counts.removedItems += droppedItems;
    }
    if (!name) {
      patchCampaign(id, { name: 'حملة' });
      issues.add('campaigns:empty-name', 1, id);
      counts.relabeled += 1;
    }
  }

  /* --- reminders -------------------------------------------------------- */
  const reminderPatches = new Map<string, Partial<Reminder>>();
  const reminderRemovals: string[] = [];
  const patchReminder = (id: string, patch: Partial<Reminder>): void => {
    reminderPatches.set(id, { ...(reminderPatches.get(id) ?? {}), ...patch });
  };

  for (const reminder of reminders) {
    const id = textOf(reminder.id);
    if (!id) continue;
    const label = textOf(reminder.label);
    const fingerprint = textOf(reminder.fingerprint);
    let display = textOf(reminder.display);

    if (!workspaceIds.has(textOf(reminder.workspaceId))) {
      patchReminder(id, { workspaceId: fallbackWorkspaceId });
      issues.add('reminders:orphan-workspace', 1, label || display || id);
      counts.reassigned += 1;
    }

    if (!display && fingerprint) {
      const separator = fingerprint.indexOf(':');
      if (separator > 0) {
        const type = fingerprint.slice(0, separator);
        const value = fingerprint.slice(separator + 1);
        const resolved =
          type === 'phone' ? resolvePhoneTarget(value, defaultCountry) : type === 'username' ? resolveUsernameTarget(value) : null;
        if (resolved) display = resolved.display;
      }
    }
    if (!display) {
      reminderRemovals.push(id);
      issues.add('reminders:invalid-target', 1, label || id);
      counts.removedRecords += 1;
      continue;
    }

    if (display !== textOf(reminder.display)) {
      patchReminder(id, { display });
      counts.normalized += 1;
    }
    if (!label) {
      patchReminder(id, { label: display.slice(0, 80) });
      issues.add('reminders:empty-label', 1, display);
      counts.relabeled += 1;
    }
    if (!fingerprint) {
      patchReminder(id, { fingerprint: display });
      issues.add('reminders:empty-fingerprint', 1, display);
      counts.relabeled += 1;
    }
    const dueAt = numberOf(reminder.dueAt);
    if (dueAt === null) {
      patchReminder(id, { dueAt: Date.now() });
      issues.add('reminders:bad-due', 1, label || display);
    }
    if (booleanOf(reminder.done) === null) {
      patchReminder(id, { done: false });
    }
  }

  /* --- settings --------------------------------------------------------- */
  const rawSettings = readRawSettings();
  const settingsPatch: Partial<Settings> = {};
  let settingsDirty = false;

  if (rawSettings.unreadable) {
    issues.add('settings:unreadable');
    settingsDirty = true;
    counts.settingsFixed += 1;
  }

  if (rawSettings.raw) {
    const raw = rawSettings.raw;
    const invalidFields: string[] = [];

    const locale = raw.locale;
    if (typeof locale !== 'string' || !['ar', 'en', 'ckb', 'fa'].includes(locale)) {
      invalidFields.push(`locale=${String(locale)}`);
      settingsPatch.locale = 'ar';
    }
    const font = raw.font;
    const fontIds = new Set<string>(FONTS.map((choice) => choice.id));
    if (typeof font !== 'string' || !fontIds.has(font)) {
      invalidFields.push(`font=${String(font)}`);
      settingsPatch.font = 'auto';
    }
    const theme = raw.theme;
    if (typeof theme !== 'string' || !['dark', 'light', 'auto'].includes(theme)) {
      invalidFields.push(`theme=${String(theme)}`);
      settingsPatch.theme = 'dark';
    }
    const accent = raw.accent;
    if (typeof accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(accent)) {
      invalidFields.push(`accent=${String(accent)}`);
      settingsPatch.accent = DEFAULT_ACCENT;
    }
    const country = raw.defaultCountry;
    if (typeof country !== 'string' || !countryByIso(country)) {
      invalidFields.push(`defaultCountry=${String(country)}`);
      settingsPatch.defaultCountry = DEFAULT_COUNTRY;
    }
    const activeWorkspaceId = raw.activeWorkspaceId;
    if (typeof activeWorkspaceId !== 'string' || !workspaceIds.has(activeWorkspaceId)) {
      invalidFields.push(`activeWorkspaceId=${String(activeWorkspaceId)}`);
      settingsPatch.activeWorkspaceId = fallbackWorkspaceId;
    }
    const version = raw.version;
    if (typeof version !== 'number' || version !== SETTINGS_VERSION) {
      issues.add('settings:version');
      settingsDirty = true;
      counts.settingsFixed += 1;
    }

    if (invalidFields.length) {
      issues.add('settings:invalid-fields', invalidFields.length, invalidFields.join(' · '));
      settingsDirty = true;
      counts.settingsFixed += invalidFields.length;
    }
  }

  // Cached settings can be broken even when the stored JSON parses (e.g. the
  // active workspace was deleted after the setting was written).
  if (!settingsPatch.activeWorkspaceId && !workspaceIds.has(settings.activeWorkspaceId)) {
    issues.add('settings:invalid-fields', 1, `activeWorkspaceId=${settings.activeWorkspaceId}`);
    settingsPatch.activeWorkspaceId = fallbackWorkspaceId;
    settingsDirty = true;
    counts.settingsFixed += 1;
  }

  const lock = settings.lock;
  // Native biometrics store the `native-biometric` sentinel instead of a WebAuthn
  // credential id — treat it (and any non-empty WebAuthn id) as a valid credential.
  const hasBiometricCredential =
    lock.credentialId === NATIVE_BIOMETRIC_SENTINEL || Boolean(lock.credentialId && lock.credentialId.trim());
  const lockBroken =
    lock.enabled && (lock.method === 'biometric' ? !hasBiometricCredential : !lock.hash || !lock.salt);
  if (lockBroken) {
    issues.add('settings:lock-broken');
    settingsPatch.lock = { enabled: false, method: 'pin', hash: undefined, salt: undefined, credentialId: null };
    settingsDirty = true;
    counts.lockDisabled = true;
    counts.settingsFixed += 1;
  }

  /* --- assemble --------------------------------------------------------- */
  const totals: HealthTotals = {
    destinations: destinations.length,
    templates: templates.length,
    history: history.length,
    campaigns: campaigns.length,
    reminders: reminders.length,
    workspaces: workspaces.length
  };
  const report = buildReport(issues.values(), totals, Date.now() - startedAt);

  return {
    report,
    counts,
    destinationUpdates: [...destinationPatches.entries()].map(([id, patch]) => ({ id, patch })),
    destinationRemovals: [...destinationRemovals, ...duplicateRemovals],
    templateUpdates: [...templatePatches.entries()].map(([id, patch]) => ({ id, patch })),
    templateRemovals,
    historyUpdates: [...historyPatches.entries()].map(([id, patch]) => ({ id, patch })),
    historyRemovals,
    campaignUpdates: [...campaignPatches.entries()].map(([id, patch]) => ({ id, patch })),
    campaignRemovals,
    reminderUpdates: [...reminderPatches.entries()].map(([id, patch]) => ({ id, patch })),
    reminderRemovals,
    workspaceUpdates,
    createDefaultWorkspaces,
    createPersonalWorkspace,
    settingsPatch: settingsDirty ? settingsPatch : null
  };
}

/* -------------------------------------------------------------------- api */

/** Read-only scan of every local table. Never writes anything. */
export async function scanDataHealth(): Promise<DataHealthReport> {
  try {
    const plan = await buildPlan();
    return plan.report;
  } catch {
    return failedReport();
  }
}

/**
 * Apply the same fixes the last scan reported: merge duplicates, normalize
 * valid numbers, move orphan records to the default workspace and delete only
 * the records that cannot be used. The caller must show the report and get an
 * explicit confirmation first.
 */
export async function repairDataHealth(): Promise<RepairResult> {
  let plan: HealthPlan;
  try {
    plan = await buildPlan();
  } catch {
    return { ok: false, summary: createEmptySummary() };
  }

  try {
    await db.transaction(
      'rw',
      [db.workspaces, db.destinations, db.templates, db.history, db.campaigns, db.reminders],
      async () => {
        if (plan.createDefaultWorkspaces) {
          await db.workspaces.put({
            id: 'personal',
            name: 'شخصي',
            nameEn: 'Personal',
            icon: 'user',
            color: '#6EE7B7',
            createdAt: Date.now()
          });
          await db.workspaces.put({
            id: 'work',
            name: 'عمل',
            nameEn: 'Work',
            icon: 'briefcase',
            color: '#7DD3FC',
            createdAt: Date.now() + 1
          });
        } else if (plan.createPersonalWorkspace) {
          await db.workspaces.put({
            id: 'personal',
            name: 'شخصي',
            nameEn: 'Personal',
            icon: 'user',
            color: '#6EE7B7',
            createdAt: Date.now()
          });
        }
        for (const update of plan.workspaceUpdates) await db.workspaces.update(update.id, update.patch);
        for (const update of plan.destinationUpdates) await db.destinations.update(update.id, update.patch);
        if (plan.destinationRemovals.length) await db.destinations.bulkDelete(plan.destinationRemovals);
        for (const update of plan.templateUpdates) await db.templates.update(update.id, update.patch);
        if (plan.templateRemovals.length) await db.templates.bulkDelete(plan.templateRemovals);
        for (const update of plan.historyUpdates) await db.history.update(update.id, update.patch);
        if (plan.historyRemovals.length) await db.history.bulkDelete(plan.historyRemovals);
        for (const update of plan.campaignUpdates) await db.campaigns.update(update.id, update.patch);
        if (plan.campaignRemovals.length) await db.campaigns.bulkDelete(plan.campaignRemovals);
        for (const update of plan.reminderUpdates) await db.reminders.update(update.id, update.patch);
        if (plan.reminderRemovals.length) await db.reminders.bulkDelete(plan.reminderRemovals);
      }
    );
  } catch {
    return { ok: false, summary: createEmptySummary() };
  }

  if (plan.settingsPatch) {
    try {
      updateSettings(plan.settingsPatch);
    } catch {
      /* settings writes are best-effort; the records are already repaired */
    }
  }

  const summary: RepairSummary = { ...plan.counts, total: 0 };
  summary.total =
    summary.merged +
    summary.normalized +
    summary.relabeled +
    summary.reassigned +
    summary.removedRecords +
    summary.removedItems +
    summary.settingsFixed;
  return { ok: true, summary };
}
