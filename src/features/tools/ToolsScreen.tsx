import { Icon, type IconName } from '../../components/icons';
import { HintCard, ScreenHeader } from '../../components/ui';
import { useActiveWorkspace, useDestinations } from '../../hooks/useData';
import { useI18n } from '../../lib/i18n';
import { navigate } from '../../lib/router';

interface ToolEntry {
  path: string;
  icon: IconName;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

interface ToolGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  tools: ToolEntry[];
}

const GROUPS: ToolGroup[] = [
  {
    id: 'qr',
    titleAr: 'QR والبطاقات',
    titleEn: 'QR & cards',
    tools: [
      {
        path: '/tools/qr',
        icon: 'qr',
        titleAr: 'توليد QR',
        titleEn: 'Generate QR',
        descAr: 'رمز QR لرابط واتساب أو نص مخصص، مع ألوان وشعار.',
        descEn: 'A QR for a WhatsApp link or custom text, with colors and a logo.'
      },
      {
        path: '/tools/scan',
        icon: 'scan',
        titleAr: 'مسح QR',
        titleEn: 'Scan QR',
        descAr: 'امسح رمزاً بالكاميرا أو من صورة، ثم أرسله مباشرة.',
        descEn: 'Scan with the camera or an image, then send it right away.'
      },
      {
        path: '/tools/card',
        icon: 'card',
        titleAr: 'بطاقة مشاركة',
        titleEn: 'Share card',
        descAr: 'بطاقة PNG جاهزة للمشاركة باسمك ورقمك ورمز QR.',
        descEn: 'A ready PNG card with your name, number and a QR code.'
      },
      {
        path: '/tools/labels',
        icon: 'printer',
        titleAr: 'ملصقات',
        titleEn: 'Labels',
        descAr: 'ملصقات QR جاهزة للطباعة على A4 أو حفظها PDF.',
        descEn: 'A4-ready QR labels, printable or saved as PDF.'
      },
      {
        path: '/tools/vcard',
        icon: 'contact',
        titleAr: 'بطاقة تواصل',
        titleEn: 'Contact card',
        descAr: 'بطاقة vCard مع رمز يفتح محادثة واتساب.',
        descEn: 'A vCard with a QR that opens a WhatsApp chat.'
      }
    ]
  },
  {
    id: 'data',
    titleAr: 'البيانات والحملات',
    titleEn: 'Data & campaigns',
    tools: [
      {
        path: '/tools/backup',
        icon: 'database',
        titleAr: 'نسخة احتياطية',
        titleEn: 'Backup',
        descAr: 'صدّر بياناتك أو استعدها على جهاز آخر.',
        descEn: 'Export your data or restore it on another device.'
      },
      {
        path: '/tools/stats',
        icon: 'chart',
        titleAr: 'إحصاءات',
        titleEn: 'Statistics',
        descAr: 'نظرة سريعة على استخدامك ووجهاتك.',
        descEn: 'A quick look at your usage and targets.'
      },
      {
        path: '/tools/import',
        icon: 'upload',
        titleAr: 'استيراد',
        titleEn: 'Import',
        descAr: 'أضف وجهات من ملف CSV أو بطاقات vCard.',
        descEn: 'Add targets from a CSV or vCard file.'
      },
      {
        path: '/tools/campaigns',
        icon: 'send',
        titleAr: 'حملات',
        titleEn: 'Campaigns',
        descAr: 'رتّب قائمة أرقام ومرّ عليها واحدة تلو الأخرى.',
        descEn: 'Queue a list of numbers and go through them one by one.'
      },
      {
        path: '/tools/reminders',
        icon: 'bell',
        titleAr: 'تذكيرات',
        titleEn: 'Reminders',
        descAr: 'ذكّر نفسك بمراسلة وجهة في وقت لاحق.',
        descEn: 'Remind yourself to message a target later.'
      }
    ]
  }
];

export function ToolsScreen() {
  const { t, n, locale, isRTL } = useI18n();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const workspaceName = workspace ? (locale === 'en' ? workspace.nameEn : workspace.name) : t('شخصي', 'Personal');

  return (
    <div className="screen">
      <ScreenHeader
        title={t('الأدوات', 'Tools')}
        subtitle={t(
          `${workspaceName} — ${n(destinations.length)} وجهة محفوظة`,
          `${workspaceName} — ${n(destinations.length)} saved targets`
        )}
      />

      {GROUPS.map((group) => (
        <section key={group.id} className="col" style={{ gap: 10 }}>
          <div className="section-head">
            <h2 className="section-title">{t(group.titleAr, group.titleEn)}</h2>
          </div>
          <div className="grid-2">
            {group.tools.map((tool) => (
              <button
                key={tool.path}
                type="button"
                className="glass card"
                onClick={() => navigate(tool.path)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 9,
                  textAlign: 'start',
                  minHeight: 136,
                  padding: 15
                }}
              >
                <span
                  className="brand-mark"
                  style={{ width: 42, height: 42, borderRadius: 14, color: 'var(--accent)' }}
                  aria-hidden="true"
                >
                  <Icon name={tool.icon} size={20} />
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>{t(tool.titleAr, tool.titleEn)}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.6 }}>{t(tool.descAr, tool.descEn)}</span>
                <span style={{ position: 'absolute', top: 14, insetInlineEnd: 13, color: 'var(--muted-2)' }} aria-hidden="true">
                  <Icon name={isRTL ? 'chevronLeft' : 'chevronRight'} size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <HintCard icon="shield">
        {t(
          'كل الأدوات تعمل على جهازك فقط — لا تُرسل بياناتك أو صورك إلى أي خادم.',
          'Every tool runs on your device only — your data and images are never sent to a server.'
        )}
      </HintCard>
    </div>
  );
}
