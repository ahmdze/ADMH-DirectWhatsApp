import { Icon, type IconName } from './icons';
import { useI18n } from '../lib/i18n';
import { navigate } from '../lib/router';

export type TabKey = 'compose' | 'targets' | 'templates' | 'reminders' | 'tools';

const TABS: Array<{ key: TabKey; path: string; icon: IconName; ar: string; en: string }> = [
  { key: 'compose', path: '/compose', icon: 'chat', ar: 'إرسال', en: 'Send' },
  { key: 'targets', path: '/targets', icon: 'users', ar: 'وجهاتي', en: 'Targets' },
  { key: 'templates', path: '/templates', icon: 'fileText', ar: 'القوالب', en: 'Templates' },
  { key: 'reminders', path: '/reminders', icon: 'bell', ar: 'تذكيرات', en: 'Reminders' },
  { key: 'tools', path: '/tools', icon: 'grid', ar: 'الأدوات', en: 'Tools' }
];

export function BottomNav({ active }: { active: TabKey }) {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('التنقل الرئيسي', 'Main navigation')}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`nav-item ${active === tab.key ? 'active' : ''}`}
          aria-current={active === tab.key ? 'page' : undefined}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-icon">
            <Icon name={tab.icon} size={21} />
          </span>
          <span>{t(tab.ar, tab.en)}</span>
        </button>
      ))}
    </nav>
  );
}
