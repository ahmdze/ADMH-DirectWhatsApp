export const APP_VERSION = '2.4.0';

export interface ChangelogItem {
  ar: string;
  en: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.4.0',
    date: '2026-11-05',
    items: [
      { ar: 'الإصدار المستقر v2.4.0: تذكيرات متكررة وإشعارات محلية، مرفقات جلسة ومعاينة كاملة، Quick Schedule، وسلة محذوفات مع استعادة.', en: 'v2.4.0 stable: recurring reminders with local notifications, session media with full preview, Quick Schedule, and a restorable trash.' }
    ]
  },
  {
    version: '2.4.0-beta.3',
    date: '2026-11-05',
    items: [
      { ar: 'تنظيف تلقائي للسجل حسب إعدادات الاحتفاظ، مع سلة محذوفات تسمح بالاستعادة حتى 30 يوماً.', en: 'Automatic history retention with a trash that allows restoring entries for up to 30 days.' }
    ]
  },
  {
    version: '2.4.0-beta.2',
    date: '2026-11-05',
    items: [
      { ar: 'معاينة كاملة قبل الإرسال: واتساب + بطاقة مشاركة + ملصق QR، مع تبويبات داخل شيت واحد.', en: 'Full preview before sending: WhatsApp, share card and QR label in one tabbed sheet.' },
      { ar: 'زر التذكيرات في شريط التنقل السفلي للوصول بضغطة واحدة.', en: 'A Reminders button in the bottom navigation for one-tap access.' },
      { ar: 'فحص تحديث APK يدوي فقط — لا فحص تلقائي في الخلفية.', en: 'Manual APK update checks only — no automatic background checks.' }
    ]
  },
  {
    version: '2.4.0-beta.1',
    date: '2026-11-05',
    items: [
      { ar: 'مرفقات محلية للصور والملفات وجهات الاتصال والموقع، تُشارك عبر نافذة النظام ولا تُخزّن في التطبيق.', en: 'Local image, file, contact and location attachments shared through the system sheet; never stored by the app.' },
      { ar: 'معاينة محلية لنص الرسالة والرابط والمرفقات، وجدولة سريعة للتذكير من Compose.', en: 'Local preview of the message, link and attachments, plus Quick Schedule from Compose.' }
    ]
  },
  {
    version: '2.4.0-alpha.1',
    date: '2026-11-04',
    items: [
      { ar: 'تذكيرات متكررة (يومي/أسبوعي/شهري) مع معاينة المواعيد القادمة وإشعارات محلية في تطبيق Android.', en: 'Recurring reminders (daily/weekly/monthly) with next-occurrence preview and local notifications in the Android app.' },
      { ar: 'فتح Compose من إشعار التذكير مع المساحة والرسالة أو القالب المحفوظ — دون إرسال تلقائي.', en: 'Open Compose from a reminder notification with its workspace and saved message/template — no automatic sending.' },
      { ar: 'نسخة احتياطية تلقائية قبل ترقية البيانات، قابلة للتنزيل من الإعدادات.', en: 'Automatic pre-upgrade data backup, downloadable from Settings.' },
      { ar: 'إصدار Alpha تجريبي للاختبار الداخلي فقط.', en: 'Alpha test build for internal testing only.' }
    ]
  },
  {
    version: '2.3.5',
    date: '2026-11-04',
    items: [
      { ar: 'زر «فحص التحديثات» يدوي في الإعدادات: يعمل على الويب عبر Service Worker، وداخل Android عبر GitHub Releases.', en: 'A manual “Check for updates” button in Settings: uses the service worker on the web and GitHub Releases in the Android app.' }
    ]
  },
  {
    version: '2.3.4',
    date: '2026-11-04',
    items: [
      { ar: 'زر «شارك التطبيق» يعرض خيارين: مشاركة تطبيق الويب PWA أو رابط تنزيل APK، بدل رابط localhost داخل التطبيق الأصلي.', en: '“Share app” now offers two choices: share the PWA web app or the APK download link, instead of the localhost URL inside the native app.' }
    ]
  },
  {
    version: '2.3.3',
    date: '2026-11-04',
    items: [
      { ar: 'اللصق وقراءة الحافظة يعملان في تطبيق Android عبر حافظة النظام الأصلية.', en: 'Paste and clipboard reading now work in the Android app through the native clipboard.' },
      { ar: 'حالة التخزين الدائم أصبحت صحيحة في تطبيق Android (بيانات التطبيق محمية تلقائياً).', en: 'Persistent-storage status is now correct in the Android app (app-private data is protected automatically).' },
      { ar: 'زر «إرسال إلى المطوّر» في التشخيص يفتح واتساب مع التقرير الكامل.', en: 'A “Send to developer” button in Diagnostics opens WhatsApp with the full report.' },
      { ar: 'تنزيل تحديث APK داخل التطبيق بشريط تقدم، ثم زر تثبيت بموافقة المستخدم.', en: 'Download APK updates inside the app with a progress bar, then install with the user’s approval.' }
    ]
  },
  {
    version: '2.3.2',
    date: '2026-11-04',
    items: [
      { ar: 'قفل بالبصمة الأصلية في تطبيق Android مع بقاء PIN بديلاً دائماً.', en: 'Native biometric app lock on Android, with PIN always available as a fallback.' },
      { ar: 'فاحص تحديث داخل التطبيق يقرأ GitHub Releases ويظهر «يتوفر تحديث» مع رابط APK.', en: 'In-app update checker that reads GitHub Releases and offers the APK download.' }
    ]
  },
  {
    version: '2.3.1',
    date: '2026-11-04',
    items: [
      { ar: 'إصلاح تشخيص نسخة Android: وضع التطبيق الأصلي، Service Worker غير المطلوب، والمشاركة الأصلية.', en: 'Android diagnostics fixes: native display mode, service worker not required, and native sharing.' },
      { ar: 'زر المشاركة في شاشة الإرسال يستخدم نافذة المشاركة الأصلية في تطبيق Android.', en: 'The share button in Compose uses the native Android share sheet.' },
      { ar: 'توقيع APK بمفتاح ثابت لتمكين التحديثات المستقبلية دون إعادة تثبيت.', en: 'APK signed with a stable key so future versions can update in place.' }
    ]
  },
  {
    version: '2.3.0',
    date: '2026-11-04',
    items: [
      { ar: 'نقل البيانات بين جهازين عبر ملف أو QR بدون خادم.', en: 'Transfer data between two devices via file or QR, without a server.' },
      { ar: 'فحص وإصلاح البيانات المحلية (تكرارات، أرقام تالفة، سجلات يتيمة).', en: 'Local data health scan and safe repair (duplicates, invalid numbers, orphan records).' },
      { ar: 'شاشة تشخيص للجهاز والمتصفح ومصفوفة اختبار للأجهزة الحقيقية.', en: 'Device/browser diagnostics screen and a real-device test matrix.' },
      { ar: 'تطبيق Android أصلي (APK) مبني عبر Capacitor — بدون متجر أو حساب.', en: 'Native Android app (APK) built with Capacitor — no store or account required.' }
    ]
  },
  {
    version: '2.2.0',
    date: '2026-11-04',
    items: [
      { ar: 'إضافة اللغة الفارسية إلى جانب العربية والإنجليزية والكردية.', en: 'Added Persian alongside Arabic, English and Kurdish.' },
      { ar: 'خط تلقائي مناسب لكل لغة: Cairo للعربية، Vazirmatn للفارسية، Noto Naskh للكردية — مع إمكانية تغييره يدوياً.', en: 'A language-aware font: Cairo for Arabic, Vazirmatn for Persian, Noto Naskh for Kurdish — with a manual override.' },
      { ar: 'README متعدد اللغات: العربية والإنجليزية والكردية والفارسية.', en: 'Multilingual README: Arabic, English, Kurdish and Persian.' }
    ]
  },
  {
    version: '2.1.0',
    date: '2026-11-04',
    items: [
      { ar: 'اسم المطوّر أصبح رابطاً مباشراً لمراسلته على واتساب.', en: 'The developer name is now a direct WhatsApp link.' },
      { ar: 'إكمال تلقائي للوجهات المحفوظة أثناء كتابة الرقم.', en: 'Autocomplete for saved destinations while typing.' },
      { ar: 'جولة تعريفية عند أول تشغيل وشاشة «ما الجديد» بعد كل تحديث.', en: 'First-run tour and a “What’s new” screen after updates.' },
      { ar: 'تحسين لافتة تثبيت التطبيق وتقليل إزعاجها.', en: 'Smarter, less intrusive install banner.' },
      { ar: 'مسح رموز QR من صورة مشتركة من تطبيق آخر (Android).', en: 'Scan QR codes from images shared from other apps (Android).' },
      { ar: 'إشعارات محلية لتذكيرات المتابعة عند فتح التطبيق.', en: 'Local notifications for follow-up reminders when the app opens.' },
      { ar: 'البصمة كطريقة أساسية لفتح التطبيق مع PIN كبديل.', en: 'Biometric unlock as the primary method, with PIN fallback.' },
      { ar: 'شاشات معاينة في PWA وتحسين فتح الروابط داخل التطبيق المثبّت.', en: 'PWA screenshots and better link handling in the installed app.' },
      { ar: 'زر «شارك التطبيق» لإرسال الرابط إلى الآخرين.', en: 'A “Share app” button to send the link to others.' },
      { ar: 'شاشة خطأ أنيقة بدل الشاشة البيضاء مع خيار إصلاح.', en: 'A friendly error screen with a recovery option instead of a blank page.' },
      { ar: 'طلب تخزين دائم وتنبيه عند اقتراب نفاد المساحة.', en: 'Persistent storage request and a low-storage warning.' },
      { ar: 'دعم اللغة الكردية (سوراني) في الواجهات الأساسية.', en: 'Kurdish (Sorani) support across the core interface.' }
    ]
  }
];
