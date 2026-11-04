import { db } from './db';
import { getMeta, setMeta } from './db';
import { uid } from './format';

/**
 * Development-only sample data (?demo=1).
 * Imported dynamically from main.tsx when import.meta.env.DEV, so it never
 * ships in the production bundle.
 */
export async function seedDemoData(): Promise<void> {
  if (await getMeta<boolean>('demo-seeded')) return;
  const now = Date.now();
  const day = 86400000;

  const destinations = [
    { label: 'أحمد زياد', phone: '9647701234567', tags: ['عمل', 'VIP'], favorite: true },
    { label: 'سارة التميمي', phone: '9647712345678', tags: ['عمل'], favorite: true },
    { label: 'مطعم النخيل', phone: '9647801112233', tags: ['مطاعم'], favorite: false },
    { label: 'شركة الرافدين', phone: '9647905556677', tags: ['عمل'], favorite: false },
    { label: 'كرار الموسوي', phone: '9647509876543', tags: ['توصيل'], favorite: false },
    { label: 'حسين علي', phone: '9647812223344', tags: ['شخصي'], favorite: false },
    { label: 'متجر الوردة', phone: '966512345678', tags: ['خليج'], favorite: false }
  ];

  for (const [index, item] of destinations.entries()) {
    await db.destinations.add({
      id: uid(),
      workspaceId: index < 5 ? 'personal' : 'work',
      type: 'phone',
      phone: item.phone,
      label: item.label,
      tags: item.tags,
      favorite: item.favorite,
      note: index === 0 ? 'عميل دائم — يفضل الرسائل الصباحية' : undefined,
      createdAt: now - index * day,
      lastUsedAt: now - index * 3600000,
      useCount: 18 - index * 2
    });
  }

  const historyValues = [
    { label: 'أحمد زياد', phone: '9647701234567', ago: 1000 * 60 * 35 },
    { label: 'سارة التميمي', phone: '9647712345678', ago: 1000 * 60 * 90 },
    { label: 'مطعم النخيل', phone: '9647801112233', ago: 1000 * 60 * 60 * 3 },
    { label: 'شركة الرافدين', phone: '9647905556677', ago: day },
    { label: 'كرار الموسوي', phone: '9647509876543', ago: day * 1.5 },
    { label: 'حسين علي', phone: '9647812223344', ago: day * 2 },
    { label: 'متجر الوردة', phone: '966512345678', ago: day * 3 },
    { label: 'أحمد زياد', phone: '9647701234567', ago: day * 5 }
  ];

  for (const item of historyValues) {
    await db.history.add({
      id: uid(),
      workspaceId: 'personal',
      targetType: 'phone',
      value: item.phone,
      display: '+' + item.phone,
      messagePreview: 'مرحباً، أود الاستفسار عن التفاصيل',
      usedAt: now - item.ago
    });
  }

  const campaign = {
    id: uid(),
    workspaceId: 'personal',
    name: 'عروض نهاية الأسبوع',
    message: 'مرحباً، لدينا عرض خاص لهذا الأسبوع. هل ترغب بالتفاصيل؟',
    items: [
      { id: uid(), label: 'أحمد زياد', display: '+964 770 123 4567', phone: '9647701234567', status: 'sent' as const, updatedAt: now - day },
      { id: uid(), label: 'سارة التميمي', display: '+964 771 234 5678', phone: '9647712345678', status: 'pending' as const },
      { id: uid(), label: 'مطعم النخيل', display: '+964 780 111 2233', phone: '9647801112233', status: 'pending' as const }
    ],
    createdAt: now - day,
    updatedAt: now - day
  };
  await db.campaigns.add(campaign);

  await db.reminders.add({
    id: uid(),
    workspaceId: 'personal',
    fingerprint: 'reminder:9647701234567',
    label: 'متابعة أحمد',
    display: '+964 770 123 4567',
    note: 'سؤال عن الطلب السابق',
    dueAt: now + 1000 * 60 * 60 * 28,
    done: false,
    createdAt: now - day
  });

  await setMeta('demo-seeded', true);
}
