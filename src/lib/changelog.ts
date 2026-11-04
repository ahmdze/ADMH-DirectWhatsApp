export const APP_VERSION = '2.3.0';

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
