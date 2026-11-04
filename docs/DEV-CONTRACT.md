# DEV CONTRACT — ADMH Direct WhatsApp v2

> اقرأ هذا الملف قبل كتابة أي كود. المشروع قيد البناء بالتوازي، لذلك **لا تلمس** ملفات خارج نطاقك.

## 1) التقنية والتشغيل

- Vite 6 + React 19 + TypeScript + Tailwind CSS 4 + Dexie (IndexedDB).
- PWA عبر `vite-plugin-pwa` (مُعدّ مسبقاً).
- لا تضف أي اعتمادية جديدة (`package.json` مملوك للـLead).
- Cairo Variable خط التطبيق (مُحمّل في `main.tsx`).
- الأوامر:
  - فحص الأنواع: `pnpm exec tsc --noEmit -p tsconfig.app.json`
  - بناء: `pnpm run build` (يتولاّه الـLead)
  - **لا تشغّل** `pnpm dev` (لتجنّب تعارض المنافذ) — الـLead يعاين ويصوّر.

## 2) التصميم (Aurora Glass — داكن أولاً)

استخدم كلاسات `src/styles/index.css` الجاهزة، ولا تعدّل هذا الملف:

- الأسطح: `glass`, `glass-soft`, `card`, `divider`.
- النصوص: `page-title`, `page-sub`, `section-title`, `section-head`, `text-muted`, `text-danger`.
- الأزرار: `<Button variant="primary|soft|ghost|danger|default" size="sm|md|lg" block loading>` و`<IconButton name label variant="plain|accent">`.
- الحقول: `<Field label hint error counter>` + `<input className="control" />` / `<textarea className="control">`.
- القوائم: `list`, `list-row`, `avatar`, `list-main`, `list-title`, `list-sub`, `list-actions`.
- عناصر: `<Chip active>`, `<Segmented>`, `<Switch>`, `<EmptyState icon title description action>`, `<Sheet open onClose title subtitle footer>`, `<ConfirmSheet>`, `<ScreenHeader title onBack action>`, `<HintCard>`, `<Spinner>`.
- أيقونات: `<Icon name="..." size={20} />` من `../components/icons` (راجع `IconName`).
- شبكات: `grid-2`, `grid-3`, `row`, `row-between`, `grow`, `col`.
- خاص: `qr-frame`, `stat-card`, `bar-chart`, `scan-video`, `scan-frame`, `list`.
- الهاتف: أهداف لمس ≥ 44px، هوامش أمان، لا `prompt()`/`alert()`/`confirm()` إطلاقاً.
- كل شاشة تبدأ بـ `page-title` + `page-sub` (الإرسال له Hero خاص).
- الحركة خفيفة، احترام `prefers-reduced-motion` (المُعدّ مسبقاً في CSS).

## 3) الترجمة (عربي + إنجليزي)

```ts
const { t, locale, dir, n, date, time, rel, phoneError } = useI18n();
t('إرسال', 'Send'); // كل نص واجهة يجب أن يمر من هنا
```

- العربية افتراضية RTL، الإنجليزية LTR — لا تفترض اتجاهاً، استخدم `isRTL` عند الحاجة.
- الأرقام/الأرقام الهاتفية تُعرض LTR: `<span dir="ltr">` أو `className` مع `dir`.
- رسائل أخطاء الأرقام: `phoneError(code)` من `parseTarget`.

## 4) الحالة والبيانات

```ts
const settings = useSettings();                 // theme, locale, defaultCountry, activeWorkspaceId, hideNumbers, lock…
updateSettings({ defaultCountry: 'SA' });
const workspace = useActiveWorkspace();         // {id,name,…} | null
const destinations = useDestinations(workspace?.id);
const history = useHistory(workspace?.id, 50);
const templates = useTemplates(workspace?.id);
const campaigns = useCampaigns(workspace?.id);
const reminders = useReminders(workspace?.id);
const dueReminders = useDueReminders(workspace?.id);
```

عمليات البيانات من `src/lib/db.ts`: `addDestination`, `updateDestination`, `deleteDestination`, `addTemplate`, `updateTemplate`, `deleteTemplate`, `recordTargetUse`, `saveCampaign`, `deleteCampaign`, `addReminder`, `updateReminder`, `deleteReminder`, `createWorkspace`, `removeWorkspace`, `clearAllData`, `ensureDatabase`.

## 5) مكتبات جاهزة (لا تعِد اختراعها)

| الملف | الاستخدام |
|---|---|
| `lib/phone.ts` | `parseTarget(raw,{country}) → {ok,target}|{ok:false,code}`، `formatPhone`, `extractCandidateFromText`, `PHONE_ERRORS`, `COUNTRIES` |
| `lib/whatsapp.ts` | `buildChatUrl(target, message)`, `openChat(target, message)` |
| `lib/qr.ts` | `qrDataUrl`, `qrSvg`, `qrWithLogo`, `loadImage` |
| `lib/image.ts` | `downloadBlob`, `downloadUrl`, `dataUrlToBlob`, `canvasToBlob`, `shareFiles`, `canShareFiles`, `readFileAsDataUrl`, `readFileAsText`, `roundRectPath` |
| `lib/scan.ts` | `decodeImageFile(file)`, `startCameraScanner({video,onResult,onStatus})`, `supportsNativeBarcode()` |
| `lib/backup.ts` | `downloadBackup`, `validateBackup`, `importBackup`, `buildBackup` |
| `lib/csv.ts` | `exportDestinationsCsv`, `exportHistoryCsv`, `parseContactsCsv`, `parseCsv`, `downloadTextFile` |
| `lib/vcard.ts` | `buildVCard`, `downloadVCard`, `parseVCards` |
| `lib/template.ts` | `applyTemplate`, `templateVariables`, `previewTemplate` |
| `lib/format.ts` | `formatNumber`, `formatDate`, `formatTime`, `relativeTime`, `uid`, `isIos`, `isStandalone` |
| `lib/clipboard.ts` | `readClipboardText`, `writeClipboardText` |
| `lib/toast.ts` | `toast(message, 'success'|'error'|'default')` |
| `lib/haptics.ts` | `hapticSuccess`, `hapticError`, `hapticTap` |
| `lib/router.ts` | `navigate('/tools/qr')`, `useRoute()`, `goBack()` |
| `lib/launch.ts` | `setDraft({raw,message})`, `takeDraft()` |
| `lib/lock.ts` / `lib/webauthn.ts` | PIN + بصمة |
| `components/ui.tsx` | مكوّنات الواجهة المذكورة أعلاه |

## 6) المسارات

| المسار | المكوّن (المالك) |
|---|---|
| `/compose` | `ComposeScreen` (ui-core) |
| `/targets` | `TargetsScreen` (ui-core) |
| `/templates` | `TemplatesScreen` (ui-core) |
| `/tools` | `ToolsScreen` (tools-visual) |
| `/tools/qr` | `QrGenerateScreen` (tools-visual) |
| `/tools/scan` | `QrScanScreen` (tools-visual) |
| `/tools/card` | `ShareCardScreen` (tools-visual) |
| `/tools/labels` | `LabelsScreen` (tools-visual) |
| `/tools/vcard` | `VCardScreen` (tools-visual) |
| `/tools/backup` | `BackupScreen` (tools-data) |
| `/tools/stats` | `StatsScreen` (tools-data) |
| `/tools/import` | `ImportScreen` (tools-data) |
| `/tools/campaigns` | `CampaignsScreen` (tools-data) |
| `/tools/reminders` | `RemindersScreen` (tools-data) |
| `/settings` | `SettingsScreen` (settings-pwa) |
| قفل | `LockScreen` (settings-pwa) |

كل مكوّن يُصدَّر **named export** بنفس الاسم أعلاه.

## 7) قواعد الملكية (مهم)

- **ممنوع** تعديل: `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/*`, `src/lib/*`, `src/components/*`, `src/hooks/*`, `tsconfig*`.
- لكل ميزة مجلدها فقط. إذا احتجت مكوّناً مشتركاً، ضعه داخل مجلد ميزتك.
- لا تعدّل ملفات زملاء آخرين.
- إن واجهت خطأ نوع في ملف خارج نطاقك: تجاهله وأبلغ الـLead، ولا تصلحه.
- لا تشغّل أي أمر يكتب على git.

## 8) معايير القبول لكل شاشة

- تعمل على عرض 360px دون تمرير أفقي، وRTL/LTR سليمان.
- كل نص مترجم، وكل زر له `aria-label` عند كونه أيقونة فقط.
- لا استخدام `window.prompt/alert/confirm`.
- الحالات: تحميل، فارغ، خطأ، نجاح (Toast).
- لا استدعاء شبكة خارجية.
- كود TypeScript صارم بلا `any` غير مبرر ولا متغيرات غير مستخدمة.
- اكتب تقريراً نهائياً قصيراً: الملفات، الميزات، أي نقص/افتراض.

## 9) سياق المنتج

PWA عربية للهاتف: تفتح محادثة واتساب دون حفظ الرقم، مع وجهات وقوالب ورموز QR. لا إرسال تلقائي. الخصوصية أولاً: كل البيانات محلية (`IndexedDB`)، ولا خادم. الاتجاه البصري: Aurora Glass (تدرجات خضراء/سماوية، أسطح زجاجية، Cairo).
