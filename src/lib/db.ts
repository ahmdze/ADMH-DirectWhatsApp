import Dexie, { type Table } from 'dexie';
import type { Campaign, Destination, HistoryEntry, Reminder, Settings, Target, Template, TrashEntry, Workspace } from '../types';
import { getSettings } from './settings';
import { uid } from './format';

interface MetaRow {
  key: string;
  value: unknown;
}

class AdmhDB extends Dexie {
  workspaces!: Table<Workspace, string>;
  destinations!: Table<Destination, string>;
  templates!: Table<Template, string>;
  history!: Table<HistoryEntry, string>;
  campaigns!: Table<Campaign, string>;
  reminders!: Table<Reminder, string>;
  trash!: Table<TrashEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('admh-direct-whatsapp-v2');
    this.version(1).stores({
      workspaces: 'id, createdAt',
      destinations: 'id, workspaceId, favorite, lastUsedAt, createdAt, type, *tags',
      templates: 'id, workspaceId, createdAt, lastUsedAt, *tags',
      history: 'id, workspaceId, usedAt, value',
      campaigns: 'id, workspaceId, createdAt',
      reminders: 'id, workspaceId, dueAt, done',
      meta: 'key'
    });
    // Additive v2.4 schema: only adds the trash table, no rows are rewritten.
    this.version(2).stores({
      workspaces: 'id, createdAt',
      destinations: 'id, workspaceId, favorite, lastUsedAt, createdAt, type, *tags',
      templates: 'id, workspaceId, createdAt, lastUsedAt, *tags',
      history: 'id, workspaceId, usedAt, value',
      campaigns: 'id, workspaceId, createdAt',
      reminders: 'id, workspaceId, dueAt, done',
      trash: 'id, deletedAt, restoreUntil',
      meta: 'key'
    });
  }
}

export const db = new AdmhDB();

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'personal', name: 'شخصي', nameEn: 'Personal', icon: 'user', color: '#6EE7B7', createdAt: 1 },
  { id: 'work', name: 'عمل', nameEn: 'Work', icon: 'briefcase', color: '#7DD3FC', createdAt: 2 }
];

interface BuiltinTemplate {
  ar: { title: string; body: string };
  en: { title: string; body: string };
  tags: string[];
}

const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    ar: { title: 'السلام عليكم', body: 'السلام عليكم ورحمة الله وبركاته، كيف حالك؟' },
    en: { title: 'Greeting', body: 'Hello! How are you today?' },
    tags: ['عام']
  },
  {
    ar: { title: 'استفسار', body: 'مرحباً، أود الاستفسار عن التفاصيل والأسعار. شكراً لك.' },
    en: { title: 'Inquiry', body: 'Hi, I would like to ask about the details and pricing. Thank you.' },
    tags: ['عام', 'مبيعات']
  },
  {
    ar: { title: 'طلب الموقع', body: 'مرحباً، هل يمكنك إرسال موقعكم بالتحديد؟' },
    en: { title: 'Location request', body: 'Hi, could you please share your exact location?' },
    tags: ['عام']
  },
  {
    ar: { title: 'تأكيد الطلب', body: 'تم استلام طلبك بنجاح، وسنبدأ العمل عليه فوراً. شكراً لثقتك.' },
    en: { title: 'Order confirmed', body: 'Your order has been received successfully. We will start working on it right away. Thank you!' },
    tags: ['عمل', 'مبيعات']
  },
  {
    ar: { title: 'شكر', body: 'شكراً جزيلاً لك، سعدنا بالتعامل معك.' },
    en: { title: 'Thank you', body: 'Thank you very much — it was a pleasure working with you.' },
    tags: ['عام']
  },
  {
    ar: { title: 'متابعة', body: 'مرحباً، أردت المتابعة معك بخصوص طلبك السابق. هل تحتاج أي مساعدة إضافية؟' },
    en: { title: 'Follow-up', body: 'Hi, I wanted to follow up on your previous request. Is there anything else I can help with?' },
    tags: ['عمل']
  }
];

async function seedTemplates(workspaceId: string): Promise<void> {
  const locale = getSettings().locale;
  const existing = await db.templates.where('workspaceId').equals(workspaceId).count();
  if (existing > 0) return;
  const now = Date.now();
  const rows: Template[] = BUILTIN_TEMPLATES.map((item, index) => ({
    id: uid(),
    workspaceId,
    title: locale === 'en' ? item.en.title : item.ar.title,
    titleEn: item.en.title,
    body: locale === 'en' ? item.en.body : item.ar.body,
    bodyEn: item.en.body,
    tags: item.tags,
    builtin: true,
    createdAt: now - index
  }));
  await db.templates.bulkAdd(rows);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** Seed workspaces/templates and migrate legacy v1 localStorage data. */
export async function ensureDatabase(): Promise<void> {
  const seeded = await getMeta<boolean>('seeded-v2');
  if (!seeded) {
    await db.transaction('rw', db.workspaces, db.templates, async () => {
      for (const workspace of DEFAULT_WORKSPACES) {
        if (!(await db.workspaces.get(workspace.id))) await db.workspaces.add(workspace);
      }
    });
    for (const workspace of DEFAULT_WORKSPACES) await seedTemplates(workspace.id);
    await setMeta('seeded-v2', true);
  }

  const migrated = await getMeta<boolean>('migrated-v1');
  if (!migrated) {
    await migrateLegacyV1();
    await setMeta('migrated-v1', true);
  }
}

interface LegacyFavorite {
  type?: string;
  value?: string;
  display?: string;
  name?: string;
}

interface LegacyTemplate {
  name?: string;
  message?: string;
}

interface LegacyHistory {
  type?: string;
  value?: string;
  display?: string;
}

async function migrateLegacyV1(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const read = <T,>(key: string): T[] => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]') as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  const favorites = read<LegacyFavorite>('admh_wa_favorites_v1');
  const templates = read<LegacyTemplate>('admh_wa_templates_v1');
  const history = read<LegacyHistory>('admh_wa_history_v3');
  if (!favorites.length && !templates.length && !history.length) return;

  const now = Date.now();
  const destinations: Destination[] = [];
  for (const item of favorites) {
    const type = item.type === 'username' ? 'username' : 'phone';
    const value = String(item.value || '').replace(/^@/, '');
    if (!value) continue;
    destinations.push({
      id: uid(),
      workspaceId: 'personal',
      type,
      phone: type === 'phone' ? value : undefined,
      username: type === 'username' ? value : undefined,
      label: String(item.name || item.display || value).slice(0, 80),
      tags: ['مستورد'],
      favorite: true,
      createdAt: now,
      useCount: 0
    });
  }

  const templateRows: Template[] = [];
  for (const item of templates) {
    const body = String(item.message || '').trim();
    if (!body) continue;
    templateRows.push({
      id: uid(),
      workspaceId: 'personal',
      title: String(item.name || 'قالب مستورد').slice(0, 60),
      body,
      tags: ['مستورد'],
      createdAt: now
    });
  }

  const historyRows: HistoryEntry[] = history.slice(0, 20).map((item, index) => ({
    id: uid(),
    workspaceId: 'personal',
    targetType: item.type === 'username' ? 'username' : 'phone',
    value: String(item.value || ''),
    display: String(item.display || item.value || ''),
    usedAt: now - index * 1000
  }));

  await db.transaction('rw', db.destinations, db.templates, db.history, async () => {
    if (destinations.length) await db.destinations.bulkAdd(destinations);
    if (templateRows.length) await db.templates.bulkAdd(templateRows);
    if (historyRows.length) await db.history.bulkAdd(historyRows);
  });
}

export async function createWorkspace(name: string, nameEn: string): Promise<Workspace> {
  const workspace: Workspace = {
    id: uid(),
    name,
    nameEn,
    icon: 'briefcase',
    color: '#C4B5FD',
    createdAt: Date.now()
  };
  await db.workspaces.add(workspace);
  await seedTemplates(workspace.id);
  return workspace;
}

export async function removeWorkspace(workspaceId: string): Promise<void> {
  if (workspaceId === 'personal') return;
  await db.transaction('rw', [db.workspaces, db.destinations, db.templates, db.history, db.campaigns, db.reminders], async () => {
    await db.destinations.where('workspaceId').equals(workspaceId).delete();
    await db.templates.where('workspaceId').equals(workspaceId).delete();
    await db.history.where('workspaceId').equals(workspaceId).delete();
    await db.campaigns.where('workspaceId').equals(workspaceId).delete();
    await db.reminders.where('workspaceId').equals(workspaceId).delete();
    await db.workspaces.delete(workspaceId);
  });
}

export async function clearAllData(keepSettings = true): Promise<void> {
  await db.transaction('rw', [db.workspaces, db.destinations, db.templates, db.history, db.campaigns, db.reminders, db.meta], async () => {
    await Promise.all([
      db.workspaces.clear(),
      db.destinations.clear(),
      db.templates.clear(),
      db.history.clear(),
      db.campaigns.clear(),
      db.reminders.clear(),
      db.meta.clear()
    ]);
  });
  if (!keepSettings) {
    try {
      localStorage.removeItem('admh2_settings');
    } catch {
      /* ignore */
    }
  }
  await ensureDatabase();
}

export async function recordTargetUse(target: Target, workspaceId: string, message = ''): Promise<void> {
  const now = Date.now();
  const key = target.type === 'username' ? target.value : target.value;
  const existing = await db.destinations.where('workspaceId').equals(workspaceId).toArray();
  const match = existing.find((item) => item.type === target.type && (item.phone === key || item.username === key));
  if (match) {
    await db.destinations.update(match.id, { lastUsedAt: now, useCount: (match.useCount || 0) + 1 });
  }
  await db.history.add({
    id: uid(),
    workspaceId,
    targetType: target.type,
    value: target.value,
    display: target.display,
    messagePreview: message.trim().slice(0, 80) || undefined,
    usedAt: now
  });
  const count = await db.history.where('workspaceId').equals(workspaceId).count();
  if (count > 300) {
    const oldest = await db.history.where('workspaceId').equals(workspaceId).sortBy('usedAt');
    const remove = oldest.slice(0, count - 300).map((row) => row.id);
    await db.history.bulkDelete(remove);
  }
}

export async function addDestination(input: Omit<Destination, 'id' | 'createdAt' | 'useCount'>): Promise<Destination> {
  const destination: Destination = { ...input, id: uid(), createdAt: Date.now(), useCount: 0 };
  await db.destinations.add(destination);
  return destination;
}

export async function updateDestination(id: string, patch: Partial<Destination>): Promise<void> {
  await db.destinations.update(id, patch);
}

export async function deleteDestination(id: string): Promise<void> {
  await db.destinations.delete(id);
}

export async function addTemplate(input: Omit<Template, 'id' | 'createdAt'>): Promise<Template> {
  const template: Template = { ...input, id: uid(), createdAt: Date.now() };
  await db.templates.add(template);
  return template;
}

export async function updateTemplate(id: string, patch: Partial<Template>): Promise<void> {
  await db.templates.update(id, patch);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await db.campaigns.put(campaign);
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.campaigns.delete(id);
}

export async function addReminder(input: Omit<Reminder, 'id' | 'createdAt' | 'done'>): Promise<Reminder> {
  const reminder: Reminder = { ...input, id: uid(), createdAt: Date.now(), done: false };
  await db.reminders.add(reminder);
  return reminder;
}

export async function updateReminder(id: string, patch: Partial<Reminder>): Promise<void> {
  await db.reminders.update(id, patch);
}

export async function deleteReminder(id: string): Promise<void> {
  await db.reminders.delete(id);
}

export async function getWorkspaceSettingsSnapshot(): Promise<Settings> {
  return getSettings();
}
