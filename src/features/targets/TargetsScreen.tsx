import { useMemo, useState } from 'react';
import { Icon, type IconName } from '../../components/icons';
import { Button, Chip, ConfirmSheet, EmptyState, IconButton, ScreenHeader, Segmented, Sheet, Spinner } from '../../components/ui';
import { useActiveWorkspace, useDestinations, useHistory } from '../../hooks/useData';
import { db, deleteDestination, recordTargetUse, updateDestination } from '../../lib/db';
import { initials } from '../../lib/format';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { setDraft } from '../../lib/launch';
import { formatPhone } from '../../lib/phone';
import { navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import { openChat } from '../../lib/whatsapp';
import type { Destination, HistoryEntry, Target } from '../../types';
import { DestinationSheet } from './DestinationSheet';

type Tab = 'saved' | 'history';

function targetOf(destination: Destination): Target {
  const value = destination.type === 'username' ? destination.username || '' : destination.phone || '';
  return {
    type: destination.type,
    value,
    display: destination.type === 'username' ? '@' + value : formatPhone(value)
  };
}

interface ActionRowProps {
  icon: IconName;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

function ActionRow({ icon, label, danger, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      className="list-row"
      onClick={onClick}
      style={{ width: '100%', textAlign: 'start', minHeight: 48, color: danger ? 'var(--danger)' : undefined }}
    >
      <span
        className="avatar"
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: danger ? 'var(--danger-soft)' : 'var(--accent-soft)',
          color: danger ? 'var(--danger)' : 'var(--accent)'
        }}
      >
        <Icon name={icon} size={17} />
      </span>
      <span className="list-title" style={{ flex: 1 }}>
        {label}
      </span>
    </button>
  );
}

/** Saved destinations + chat history, both local-only. */
export function TargetsScreen() {
  const { t, n, rel } = useI18n();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const history = useHistory(workspace?.id, 100);

  const [tab, setTab] = useState<Tab>('saved');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Destination | null>(null);
  const [menuTarget, setMenuTarget] = useState<Destination | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

  const tags = useMemo(() => {
    const found = new Set<string>();
    for (const destination of destinations) {
      for (const tag of destination.tags || []) found.add(tag);
    }
    return [...found].slice(0, 16);
  }, [destinations]);

  const term = query.trim().toLowerCase();

  const filteredDestinations = useMemo(() => {
    return destinations.filter((destination) => {
      if (activeTag && !(destination.tags || []).includes(activeTag)) return false;
      if (!term) return true;
      const haystack = [
        destination.label,
        destination.note || '',
        destination.phone || '',
        destination.username || '',
        ...(destination.tags || [])
      ];
      return haystack.some((value) => value.toLowerCase().includes(term));
    });
  }, [destinations, activeTag, term]);

  const filteredHistory = useMemo(() => {
    if (!term) return history;
    return history.filter((entry) => {
      const haystack = [entry.display, entry.value, entry.messagePreview || ''];
      return haystack.some((value) => value.toLowerCase().includes(term));
    });
  }, [history, term]);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (destination: Destination) => {
    setEditing(destination);
    setSheetOpen(true);
  };

  const sendTo = async (destination: Destination) => {
    const target = targetOf(destination);
    if (!target.value) {
      toast(t('الوجهة غير صالحة', 'This destination is not valid'), 'error');
      hapticError();
      return;
    }
    try {
      if (workspace) await recordTargetUse(target, workspace.id);
    } catch {
      /* history is best-effort — the chat still opens */
    }
    openChat(target);
    hapticSuccess();
  };

  const useInCompose = (destination: Destination) => {
    const target = targetOf(destination);
    if (!target.value) {
      toast(t('الوجهة غير صالحة', 'This destination is not valid'), 'error');
      hapticError();
      return;
    }
    setDraft({ raw: target.type === 'username' ? '@' + target.value : target.value });
    navigate('/compose');
  };

  const toggleFavorite = async (destination: Destination) => {
    try {
      await updateDestination(destination.id, { favorite: !destination.favorite });
      toast(
        destination.favorite ? t('أُزيلت من المفضلة', 'Removed from favorites') : t('أُضيفت إلى المفضلة', 'Added to favorites'),
        'success'
      );
      hapticSuccess();
    } catch {
      toast(t('تعذّر التحديث', 'Could not update'), 'error');
      hapticError();
    }
  };

  const removeDestination = async (id: string) => {
    try {
      await deleteDestination(id);
      toast(t('تم حذف الوجهة', 'Destination deleted'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر حذف الوجهة', 'Could not delete the destination'), 'error');
      hapticError();
    }
  };

  const reuseEntry = (entry: HistoryEntry) => {
    setDraft({ raw: entry.targetType === 'username' ? '@' + entry.value : entry.value });
    navigate('/compose');
  };

  const removeEntry = async (id: string) => {
    try {
      await db.history.delete(id);
      hapticSuccess();
    } catch {
      toast(t('تعذّر حذف العنصر', 'Could not delete the entry'), 'error');
      hapticError();
    }
  };

  const clearAllHistory = async () => {
    if (!workspace) return;
    try {
      await db.history.where('workspaceId').equals(workspace.id).delete();
      toast(t('تم مسح السجل', 'History cleared'), 'success');
      hapticSuccess();
    } catch {
      toast(t('تعذّر مسح السجل', 'Could not clear the history'), 'error');
      hapticError();
    }
  };

  if (!workspace) {
    return (
      <div className="screen">
        <ScreenHeader title={t('وجهاتي', 'My destinations')} subtitle={t('جارٍ تحميل بياناتك المحلية…', 'Loading your local data…')} />
        <div className="row" style={{ justifyContent: 'center', padding: 28 }}>
          <Spinner />
        </div>
      </div>
    );
  }

  const searching = Boolean(term || (tab === 'saved' && activeTag));

  return (
    <div className="screen">
      <ScreenHeader
        title={t('وجهاتي', 'My destinations')}
        subtitle={t('محفوظاتك وسجل المحادثات — على جهازك فقط.', 'Your saved destinations and chat history — on your device only.')}
        action={
          <Button variant="soft" size="sm" onClick={openNew}>
            <Icon name="plus" size={16} />
            {t('جديد', 'New')}
          </Button>
        }
      />

      <Segmented<Tab>
        value={tab}
        onChange={(next) => {
          setTab(next);
          setQuery('');
          setActiveTag(null);
        }}
        options={[
          { value: 'saved', label: t('المحفوظة', 'Saved') },
          { value: 'history', label: t('السجل', 'History') }
        ]}
      />

      <input
        className="control"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={
          tab === 'saved'
            ? t('ابحث بالاسم أو الرقم أو الوسم', 'Search by name, number, or tag')
            : t('ابحث في السجل', 'Search the history')
        }
        aria-label={t('بحث', 'Search')}
        inputMode="search"
        autoComplete="off"
      />

      {tab === 'saved' && tags.length ? (
        <div className="chip-row">
          <Chip active={activeTag === null} onClick={() => setActiveTag(null)}>
            {t('الكل', 'All')}
          </Chip>
          {tags.map((tag) => (
            <Chip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      {tab === 'saved' ? (
        filteredDestinations.length ? (
          <div className="glass list" style={{ padding: 4 }}>
            {filteredDestinations.map((destination) => (
              <div className="list-row" key={destination.id}>
                <span className="avatar" aria-hidden="true">
                  {initials(destination.label)}
                </span>
                <button
                  type="button"
                  className="list-main"
                  style={{ textAlign: 'start', minHeight: 44 }}
                  onClick={() => openEdit(destination)}
                >
                  <span className="list-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {destination.favorite ? <Icon name="star" size={12} /> : null}
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {destination.label}
                    </span>
                  </span>
                  <span className="list-sub">
                    <span dir="ltr" className="sensitive">
                      {targetOf(destination).display}
                    </span>
                    {destination.note ? ` · ${destination.note}` : ''}
                  </span>
                </button>
                <div className="list-actions">
                  <IconButton
                    name="whatsapp"
                    label={t('مراسلة مباشرة', 'Message now')}
                    variant="accent"
                    size={17}
                    onClick={() => {
                      void sendTo(destination);
                    }}
                  />
                  <IconButton
                    name="more"
                    label={t('خيارات الوجهة', 'Destination options')}
                    variant="plain"
                    onClick={() => setMenuTarget(destination)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={searching ? 'search' : 'bookmark'}
            title={searching ? t('لا نتائج مطابقة', 'No matching results') : t('لا وجهات محفوظة بعد', 'No saved destinations yet')}
            description={
              searching
                ? t('جرّب كلمة أخرى أو أزل فلتر الوسم.', 'Try another word or clear the tag filter.')
                : t('احفظ وجهة من شاشة الإرسال لتظهر هنا بلمسة واحدة.', 'Save a destination from the compose screen to reach it in one tap.')
            }
            action={
              searching ? (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setActiveTag(null);
                  }}
                >
                  {t('مسح الفلاتر', 'Clear filters')}
                </Button>
              ) : (
                <Button variant="soft" size="sm" onClick={openNew}>
                  <Icon name="plus" size={16} />
                  {t('إضافة وجهة', 'Add a destination')}
                </Button>
              )
            }
          />
        )
      ) : filteredHistory.length ? (
        <div className="col" style={{ gap: 8 }}>
          <div className="section-head">
            <span className="section-title">{t('آخر المحادثات', 'Recent chats')}</span>
            {history.length ? (
              <Button variant="ghost" size="sm" onClick={() => setClearHistoryOpen(true)}>
                <Icon name="trash" size={14} />
                {t('مسح الكل', 'Clear all')}
              </Button>
            ) : null}
          </div>
          <div className="glass list" style={{ padding: 4 }}>
            {filteredHistory.map((entry) => (
              <div className="list-row" key={entry.id}>
                <span className="avatar" aria-hidden="true" style={{ background: 'var(--glass-2)', color: 'var(--muted)' }}>
                  <Icon name={entry.targetType === 'username' ? 'user' : 'chat'} size={17} />
                </span>
                <button
                  type="button"
                  className="list-main"
                  style={{ textAlign: 'start', minHeight: 44 }}
                  onClick={() => reuseEntry(entry)}
                >
                  <span className="list-title" dir="ltr">
                    {entry.display}
                  </span>
                  <span className="list-sub">
                    {rel(entry.usedAt)}
                    {entry.messagePreview ? ` · ${entry.messagePreview}` : ''}
                  </span>
                </button>
                <div className="list-actions">
                  <IconButton
                    name="send"
                    label={t('إعادة استخدام في الإرسال', 'Reuse in compose')}
                    variant="plain"
                    size={17}
                    onClick={() => reuseEntry(entry)}
                  />
                  <IconButton
                    name="trash"
                    label={t('حذف من السجل', 'Delete from history')}
                    variant="plain"
                    size={17}
                    onClick={() => {
                      void removeEntry(entry.id);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={searching ? 'search' : 'chat'}
          title={searching ? t('لا نتائج مطابقة', 'No matching results') : t('لا سجل بعد', 'No history yet')}
          description={
            searching
              ? t('جرّب رقمًا أو اسمًا آخر.', 'Try another number or name.')
              : t('سجّل كل محادثة تفتحها تلقائياً لتكرّرها بلمسة.', 'Every chat you open is logged here so you can repeat it in one tap.')
          }
          action={
            <Button variant="soft" size="sm" onClick={() => navigate('/compose')}>
              <Icon name="whatsapp" size={16} />
              {t('ابدأ محادثة', 'Start a chat')}
            </Button>
          }
        />
      )}

      <DestinationSheet open={sheetOpen} onClose={() => setSheetOpen(false)} workspaceId={workspace.id} destination={editing} />

      <Sheet
        open={Boolean(menuTarget)}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.label}
        subtitle={
          menuTarget
            ? menuTarget.lastUsedAt
              ? `${t('آخر استخدام', 'Last used')}: ${rel(menuTarget.lastUsedAt)} · ${t('الاستخدامات', 'Uses')}: ${n(menuTarget.useCount)}`
              : t('لم تُستخدم بعد', 'Not used yet')
            : undefined
        }
      >
        {menuTarget ? (
          <div className="list">
            <ActionRow
              icon="whatsapp"
              label={t('مراسلة مباشرة', 'Message now')}
              onClick={() => {
                const target = menuTarget;
                if (!target) return;
                setMenuTarget(null);
                void sendTo(target);
              }}
            />
            <ActionRow
              icon="send"
              label={t('استخدام في الإرسال', 'Use in compose')}
              onClick={() => {
                const target = menuTarget;
                if (!target) return;
                setMenuTarget(null);
                useInCompose(target);
              }}
            />
            <ActionRow
              icon="edit"
              label={t('تعديل', 'Edit')}
              onClick={() => {
                const target = menuTarget;
                if (!target) return;
                setMenuTarget(null);
                openEdit(target);
              }}
            />
            <ActionRow
              icon="star"
              label={menuTarget.favorite ? t('إزالة من المفضلة', 'Remove from favorites') : t('إضافة إلى المفضلة', 'Add to favorites')}
              onClick={() => {
                const target = menuTarget;
                if (!target) return;
                setMenuTarget(null);
                void toggleFavorite(target);
              }}
            />
            <ActionRow
              icon="trash"
              danger
              label={t('حذف', 'Delete')}
              onClick={() => {
                const target = menuTarget;
                if (!target) return;
                setMenuTarget(null);
                setDeleteTarget(target);
              }}
            />
          </div>
        ) : null}
      </Sheet>

      <ConfirmSheet
        open={Boolean(deleteTarget)}
        title={t('حذف الوجهة؟', 'Delete this destination?')}
        description={deleteTarget?.label}
        confirmLabel={t('حذف', 'Delete')}
        danger
        onConfirm={() => {
          if (deleteTarget) void removeDestination(deleteTarget.id);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmSheet
        open={clearHistoryOpen}
        title={t('مسح السجل كاملاً؟', 'Clear the whole history?')}
        description={t(
          'سيُحذف سجل المحادثات فقط، وتبقى الوجهات المحفوظة كما هي.',
          'Only the chat history is removed; saved destinations stay untouched.'
        )}
        confirmLabel={t('مسح', 'Clear')}
        danger
        onConfirm={() => {
          void clearAllHistory();
        }}
        onClose={() => setClearHistoryOpen(false)}
      />
    </div>
  );
}
