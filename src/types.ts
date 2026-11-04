export type Locale = 'ar' | 'en' | 'ckb' | 'fa';
export type FontChoice = 'auto' | 'cairo' | 'vazirmatn' | 'noto-naskh';
export type ThemeMode = 'dark' | 'light' | 'auto';
export type TargetType = 'phone' | 'username';
export type CampaignItemStatus = 'pending' | 'sent' | 'skipped';

export interface Workspace {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  createdAt: number;
}

export interface Destination {
  id: string;
  workspaceId: string;
  type: TargetType;
  /** E.164 digits without the plus sign */
  phone?: string;
  username?: string;
  label: string;
  note?: string;
  tags: string[];
  favorite: boolean;
  color?: string;
  createdAt: number;
  lastUsedAt?: number;
  useCount: number;
}

export interface Template {
  id: string;
  workspaceId: string;
  title: string;
  titleEn?: string;
  body: string;
  bodyEn?: string;
  tags: string[];
  builtin?: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

export interface HistoryEntry {
  id: string;
  workspaceId: string;
  targetType: TargetType;
  value: string;
  display: string;
  messagePreview?: string;
  usedAt: number;
}

export interface CampaignItem {
  id: string;
  label: string;
  display: string;
  phone?: string;
  username?: string;
  status: CampaignItemStatus;
  updatedAt?: number;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  message: string;
  items: CampaignItem[];
  createdAt: number;
  updatedAt: number;
}

export interface Reminder {
  id: string;
  workspaceId: string;
  fingerprint: string;
  label: string;
  display: string;
  note?: string;
  dueAt: number;
  done: boolean;
  createdAt: number;

  /* v2.4 scheduling extensions (optional so old backups restore safely). */
  message?: string;
  templateId?: string;
  templateVars?: Record<string, string>;
  recurrence?: ReminderRecurrence;
  notificationIds?: number[];
  lastScheduledAt?: number;
  lastNotifiedAt?: number;
  lastOpenedAt?: number;
  missedAt?: number;
  missedCount?: number;
}

export type ReminderRecurrence =
  | { kind: 'daily'; interval: number; until?: number }
  | { kind: 'weekly'; weekdays: number[]; until?: number }
  | { kind: 'monthly'; day: number; until?: number };

export interface RetentionSettings {
  historyEnabled: boolean;
  retentionDays: 7 | 30 | 90 | 365 | 0;
  keepLatest: number | null;
  excludeFavoriteTargets: boolean;
  trashDays: number;
  lastRunAt?: number;
}

export interface TrashEntry {
  id: string;
  kind: 'history';
  payload: HistoryEntry;
  deletedAt: number;
  restoreUntil: number;
}

export interface LockSettings {
  enabled: boolean;
  method: 'pin' | 'biometric';
  hash?: string;
  salt?: string;
  credentialId?: string | null;
}

export interface Settings {
  version: number;
  theme: ThemeMode;
  accent: string;
  locale: Locale;
  font: FontChoice;
  defaultCountry: string;
  haptics: boolean;
  hideNumbers: boolean;
  activeWorkspaceId: string;
  lock: LockSettings;
  installBannerDismissed: boolean;
  notifications: boolean;
  onboarded: boolean;
  lastSeenVersion: string;
  retention: RetentionSettings;
  updatedAt: number;
}

export interface BackupFile {
  app: 'admh-direct-whatsapp';
  version: number;
  exportedAt: string;
  workspaces: Workspace[];
  destinations: Destination[];
  templates: Template[];
  history: HistoryEntry[];
  campaigns: Campaign[];
  reminders: Reminder[];
  trash?: TrashEntry[];
  settings?: Settings;
}

export interface Target {
  type: TargetType;
  /** digits only for phone, username without @ */
  value: string;
  /** pretty display: +964 770… or @name */
  display: string;
}

export type ParsedTarget = Target;

export interface Draft {
  raw: string;
  message?: string;
  origin?: 'share' | 'shortcut' | 'clipboard' | 'scan';
}
