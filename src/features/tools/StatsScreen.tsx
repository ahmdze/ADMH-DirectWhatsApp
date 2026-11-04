import { useMemo } from 'react';
import { Button, EmptyState, HintCard, ScreenHeader } from '../../components/ui';
import { Icon, type IconName } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack, navigate } from '../../lib/router';
import { formatPhone } from '../../lib/phone';
import { initials } from '../../lib/format';
import { useActiveWorkspace, useCampaigns, useDestinations, useHistory, useTemplates } from '../../hooks/useData';
import type { Destination } from '../../types';

function destinationDisplay(destination: Destination): string {
  return destination.type === 'phone' ? formatPhone(destination.phone || '') : '@' + (destination.username || '');
}

interface DayStat {
  key: number;
  label: string;
  count: number;
  height: number;
}

export function StatsScreen() {
  const { t, n, locale } = useI18n();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const history = useHistory(workspace?.id, 300);
  const templates = useTemplates(workspace?.id);
  const campaigns = useCampaigns(workspace?.id);

  const cards: Array<{ key: string; label: string; value: number; icon: IconName }> = [
    { key: 'conversations', label: t('محادثات', 'Conversations'), value: history.length, icon: 'chat' },
    { key: 'destinations', label: t('وجهات محفوظة', 'Saved destinations'), value: destinations.length, icon: 'users' },
    { key: 'templates', label: t('قوالب', 'Templates'), value: templates.length, icon: 'fileText' },
    { key: 'campaigns', label: t('حملات', 'Campaigns'), value: campaigns.length, icon: 'send' }
  ];

  const days = useMemo<DayStat[]>(() => {
    const weekdayFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-GB', { weekday: 'short' });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const buckets: Array<{ key: number; label: string; count: number }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(start.getTime());
      day.setDate(start.getDate() - offset);
      buckets.push({ key: day.getTime(), label: weekdayFormat.format(day), count: 0 });
    }
    const firstKey = buckets[0]?.key ?? 0;
    for (const entry of history) {
      if (entry.usedAt < firstKey) continue;
      const day = new Date(entry.usedAt);
      day.setHours(0, 0, 0, 0);
      const bucket = buckets.find((item) => item.key === day.getTime());
      if (bucket) bucket.count += 1;
    }
    const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
    return buckets.map((bucket) => ({
      ...bucket,
      height: bucket.count === 0 ? 3 : Math.max(8, Math.round((bucket.count / max) * 54))
    }));
  }, [history, locale]);

  const weekTotal = useMemo(() => days.reduce((sum, day) => sum + day.count, 0), [days]);

  const topDestinations = useMemo(
    () =>
      [...destinations]
        .filter((destination) => destination.useCount > 0)
        .sort((a, b) => b.useCount - a.useCount || (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
        .slice(0, 5),
    [destinations]
  );

  const phoneCount = useMemo(() => destinations.filter((destination) => destination.type === 'phone').length, [destinations]);
  const usernameCount = destinations.length - phoneCount;
  const phonePercent = destinations.length ? Math.round((phoneCount / destinations.length) * 100) : 0;

  const hasAnyData = history.length > 0 || destinations.length > 0 || templates.length > 0 || campaigns.length > 0;

  return (
    <div className="screen">
      <ScreenHeader
        title={t('الإحصاءات', 'Statistics')}
        subtitle={t('نظرة سريعة على استخدامك — كل الحسابات محلية على جهازك.', 'A quick look at your usage — all calculations happen locally on your device.')}
        onBack={() => goBack()}
      />

      {!hasAnyData ? (
        <EmptyState
          icon="chart"
          title={t('لا توجد إحصاءات بعد', 'No statistics yet')}
          description={t('ابدأ محادثة أو أضف وجهة، وستظهر أرقامك هنا تلقائياً.', 'Start a chat or add a destination and your numbers will appear here automatically.')}
          action={
            <Button variant="primary" onClick={() => navigate('/compose')}>
              {t('ابدأ محادثة', 'Start a chat')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid-2">
            {cards.map((card) => (
              <div key={card.key} className="stat-card">
                <div className="row" style={{ gap: 6, color: 'var(--accent)' }}>
                  <Icon name={card.icon} size={15} />
                  <small style={{ color: 'var(--muted)' }}>{card.label}</small>
                </div>
                <b>{n(card.value)}</b>
              </div>
            ))}
          </div>

          <section className="glass card col" style={{ gap: 12 }}>
            <div className="section-head">
              <h2 className="section-title">{t('آخر 7 أيام', 'Last 7 days')}</h2>
              <span className="badge accent">
                {t('الإجمالي', 'Total')}: {n(weekTotal)}
              </span>
            </div>
            <div className="bar-chart" role="img" aria-label={t('رسم أعمدة لعدد المحادثات في آخر 7 أيام', 'Bar chart of conversations over the last 7 days')}>
              {days.map((day) => (
                <div key={day.key} className="bar-col" title={`${day.label}: ${n(day.count)}`}>
                  <span style={{ fontSize: 9.5, color: 'var(--muted-2)', fontVariantNumeric: 'tabular-nums' }}>{n(day.count)}</span>
                  <div className="bar" style={{ height: `${day.height}px` }} />
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
            {weekTotal === 0 ? (
              <p className="page-sub" style={{ margin: 0, textAlign: 'center' }}>
                {t('لا توجد محادثات خلال هذا الأسبوع.', 'No conversations this week.')}
              </p>
            ) : null}
          </section>

          <section className="glass card col" style={{ gap: 12 }}>
            <div className="section-head">
              <h2 className="section-title">{t('أكثر 5 وجهات استخداماً', 'Top 5 destinations')}</h2>
              <Icon name="star" size={16} style={{ color: 'var(--accent)' }} />
            </div>
            {topDestinations.length ? (
              <div className="list">
                {topDestinations.map((destination) => (
                  <div key={destination.id} className="list-row">
                    <span className="avatar">{initials(destination.label)}</span>
                    <div className="list-main">
                      <span className="list-title">{destination.label}</span>
                      <span className="list-sub sensitive" dir="ltr">
                        {destinationDisplay(destination)}
                      </span>
                    </div>
                    <span className="badge accent">
                      <Icon name="chat" size={11} /> {n(destination.useCount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="page-sub" style={{ margin: 0 }}>
                {t('لم تُستخدم أي وجهة محفوظة بعد. استخدم وجهة من شاشة الإرسال أو «وجهاتي».', 'No saved destination has been used yet. Use one from the compose screen or “Targets”.')}
              </p>
            )}
          </section>

          <section className="glass card col" style={{ gap: 12 }}>
            <h2 className="section-title">{t('توزيع الوجهات', 'Destination mix')}</h2>
            {destinations.length === 0 ? (
              <p className="page-sub" style={{ margin: 0 }}>
                {t('لا توجد وجهات محفوظة بعد.', 'No saved destinations yet.')}
              </p>
            ) : (
              <>
                <div
                  style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--glass-3)' }}
                  role="img"
                  aria-label={t('نسبة أرقام الهواتف إلى أسماء المستخدمين', 'Phone numbers versus usernames')}
                >
                  <div style={{ width: `${phonePercent}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }} />
                  <div style={{ width: `${100 - phonePercent}%`, background: '#7DD3FC' }} />
                </div>
                <div className="col" style={{ gap: 6 }}>
                  <div className="row-between" style={{ fontSize: 11.5 }}>
                    <span className="row" style={{ gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--accent)' }} aria-hidden="true" />
                      {t('أرقام هواتف', 'Phone numbers')}
                    </span>
                    <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {n(phoneCount)} · {n(phonePercent)}%
                    </span>
                  </div>
                  <div className="row-between" style={{ fontSize: 11.5 }}>
                    <span className="row" style={{ gap: 7 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: '#7DD3FC' }} aria-hidden="true" />
                      {t('أسماء مستخدمين', 'Usernames')}
                    </span>
                    <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {n(usernameCount)} · {n(100 - phonePercent)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>

          <HintCard icon="shield">
            {t('كل الإحصاءات محسوبة محلياً على جهازك، ولا تُرسل إلى أي خادم.', 'All statistics are computed locally on your device and are never sent to any server.')}
          </HintCard>
        </>
      )}
    </div>
  );
}
