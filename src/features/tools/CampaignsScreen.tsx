import { useEffect, useState } from 'react';
import { Button, ConfirmSheet, EmptyState, Field, HintCard, IconButton, ScreenHeader, Sheet } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack } from '../../lib/router';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useActiveWorkspace, useCampaigns, useDestinations } from '../../hooks/useData';
import { deleteCampaign, saveCampaign } from '../../lib/db';
import { openChat } from '../../lib/whatsapp';
import { formatPhone, parseTarget } from '../../lib/phone';
import { initials, uid } from '../../lib/format';
import { useSettings } from '../../lib/settings';
import type { Campaign, CampaignItem, CampaignItemStatus, Destination, Target } from '../../types';

function itemTarget(item: CampaignItem): Target | null {
  if (item.phone) return { type: 'phone', value: item.phone, display: item.display };
  if (item.username) return { type: 'username', value: item.username, display: item.display };
  return null;
}

function destinationItem(destination: Destination): CampaignItem {
  return {
    id: uid(),
    label: destination.label,
    display: destination.type === 'phone' ? formatPhone(destination.phone || '') : '@' + (destination.username || ''),
    phone: destination.type === 'phone' ? destination.phone : undefined,
    username: destination.type === 'username' ? destination.username : undefined,
    status: 'pending'
  };
}

function progressOf(campaign: Campaign): number {
  if (!campaign.items.length) return 0;
  const done = campaign.items.filter((item) => item.status !== 'pending').length;
  return Math.round((done / campaign.items.length) * 100);
}

export function CampaignsScreen() {
  const { t, n, rel, phoneError } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const campaigns = useCampaigns(workspace?.id);
  const destinations = useDestinations(workspace?.id);

  const [runId, setRunId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [draftItems, setDraftItems] = useState<CampaignItem[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeCampaign = runId ? campaigns.find((campaign) => campaign.id === runId) ?? null : null;

  useEffect(() => {
    if (runId && !campaigns.some((campaign) => campaign.id === runId)) {
      setRunId(null);
      setPaused(false);
    }
  }, [runId, campaigns]);

  const openEditor = (campaign: Campaign | null) => {
    setEditingId(campaign?.id ?? null);
    setDraftName(campaign?.name ?? '');
    setDraftMessage(campaign?.message ?? '');
    setDraftItems(campaign ? campaign.items.map((item) => ({ ...item })) : []);
    setManualInput('');
    setManualError('');
    setEditorOpen(true);
  };

  const isDestinationSelected = (destination: Destination): boolean =>
    destination.type === 'phone'
      ? draftItems.some((item) => item.phone === destination.phone)
      : draftItems.some((item) => item.username === destination.username);

  const toggleDestination = (destination: Destination) => {
    if (isDestinationSelected(destination)) {
      setDraftItems((items) =>
        items.filter((item) => (destination.type === 'phone' ? item.phone !== destination.phone : item.username !== destination.username))
      );
    } else {
      setDraftItems((items) => [...items, destinationItem(destination)]);
    }
  };

  const removeDraftItem = (id: string) => {
    setDraftItems((items) => items.filter((item) => item.id !== id));
  };

  const addManualItem = () => {
    const value = manualInput.trim();
    if (!value) {
      setManualError(t('أدخل رقماً أو اسم مستخدم أولاً.', 'Enter a number or username first.'));
      return;
    }
    const parsed = parseTarget(value, { country: settings.defaultCountry });
    if (!parsed.ok) {
      setManualError(phoneError(parsed.code));
      hapticError();
      return;
    }
    const target = parsed.target;
    const exists = draftItems.some((item) => (target.type === 'phone' ? item.phone === target.value : item.username === target.value));
    if (exists) {
      setManualError(t('هذا العنصر مضاف مسبقاً إلى الحملة.', 'This item is already in the campaign.'));
      return;
    }
    setDraftItems((items) => [
      ...items,
      {
        id: uid(),
        label: target.display,
        display: target.display,
        phone: target.type === 'phone' ? target.value : undefined,
        username: target.type === 'username' ? target.value : undefined,
        status: 'pending'
      }
    ]);
    setManualInput('');
    setManualError('');
  };

  const saveDraft = async () => {
    if (!workspace) return;
    const name = draftName.trim();
    if (!name) {
      toast(t('أدخل اسم الحملة أولاً.', 'Enter a campaign name first.'), 'error');
      return;
    }
    if (draftItems.length === 0) {
      toast(t('أضف عنصراً واحداً على الأقل إلى الحملة.', 'Add at least one item to the campaign.'), 'error');
      return;
    }
    setSaving(true);
    try {
      const existing = editingId ? campaigns.find((campaign) => campaign.id === editingId) : undefined;
      const now = Date.now();
      const campaign: Campaign = {
        id: editingId ?? uid(),
        workspaceId: workspace.id,
        name,
        message: draftMessage.trim(),
        items: draftItems,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      await saveCampaign(campaign);
      setEditorOpen(false);
      hapticSuccess();
      toast(t('تم حفظ الحملة بنجاح', 'Campaign saved successfully'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر حفظ الحملة', 'Could not save the campaign'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeCampaign = async () => {
    if (!deleteId) return;
    try {
      await deleteCampaign(deleteId);
      if (runId === deleteId) {
        setRunId(null);
        setPaused(false);
      }
      hapticSuccess();
      toast(t('تم حذف الحملة', 'Campaign deleted'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر حذف الحملة', 'Could not delete the campaign'), 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const openCurrentChat = () => {
    if (!activeCampaign) return;
    const current = activeCampaign.items.find((item) => item.status === 'pending');
    if (!current) return;
    const target = itemTarget(current);
    if (!target) {
      toast(t('هذا العنصر لا يحتوي رقماً أو اسماً صالحاً.', 'This item has no valid number or username.'), 'error');
      return;
    }
    hapticSuccess();
    openChat(target, activeCampaign.message);
  };

  const markCurrent = async (status: 'sent' | 'skipped') => {
    if (!activeCampaign || updating) return;
    const current = activeCampaign.items.find((item) => item.status === 'pending');
    if (!current) return;
    setUpdating(true);
    const items = activeCampaign.items.map((item) => (item.id === current.id ? { ...item, status, updatedAt: Date.now() } : item));
    try {
      await saveCampaign({ ...activeCampaign, items, updatedAt: Date.now() });
      hapticSuccess();
      toast(status === 'sent' ? t('تم تعليم العنصر «أُرسلت»', 'Item marked as sent') : t('تم تخطي العنصر', 'Item skipped'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر تحديث حالة الحملة', 'Could not update campaign status'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  const resetRun = async () => {
    if (!activeCampaign || updating) return;
    setUpdating(true);
    const items = activeCampaign.items.map((item) => ({ ...item, status: 'pending' as const, updatedAt: Date.now() }));
    try {
      await saveCampaign({ ...activeCampaign, items, updatedAt: Date.now() });
      setPaused(false);
      hapticSuccess();
      toast(t('أُعيد ضبط تقدم الحملة', 'Campaign progress reset'), 'success');
    } catch {
      hapticError();
      toast(t('تعذّر إعادة ضبط الحملة', 'Could not reset the campaign'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  const statusLabel = (status: CampaignItemStatus): string =>
    status === 'sent' ? t('أُرسلت', 'Sent') : status === 'skipped' ? t('تم التخطي', 'Skipped') : t('قيد الانتظار', 'Pending');

  const items = activeCampaign?.items ?? [];
  const doneCount = items.filter((item) => item.status !== 'pending').length;
  const sentCount = items.filter((item) => item.status === 'sent').length;
  const skippedCount = items.filter((item) => item.status === 'skipped').length;
  const pendingCount = items.length - doneCount;
  const currentItem = items.find((item) => item.status === 'pending') ?? null;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="screen">
      <ScreenHeader
        title={activeCampaign ? activeCampaign.name : t('الحملات', 'Campaigns')}
        subtitle={
          activeCampaign
            ? paused
              ? t('متوقفة مؤقتاً — تقدمك محفوظ تلقائياً.', 'Paused — your progress is saved automatically.')
              : t('افتح كل محادثة يدوياً ثم علّمها. لا إرسال تلقائي.', 'Open each chat manually, then mark it. No automatic sending.')
            : t('قوائم أرقام مع رسالة موحّدة — بفتح المحادثات يدوياً فقط.', 'Number lists with one message — chats are opened manually only.')
        }
        onBack={() => {
          if (activeCampaign) {
            setRunId(null);
            setPaused(false);
          } else {
            goBack();
          }
        }}
        action={
          activeCampaign ? undefined : (
            <IconButton name="plus" label={t('حملة جديدة', 'New campaign')} onClick={() => openEditor(null)} variant="accent" />
          )
        }
      />

      {activeCampaign ? (
        <>
          <HintCard icon="info">
            {t(
              'لا إرسال تلقائي: زر «فتح المحادثة» يفتح واتساب فقط. علّم كل عنصر يدوياً بعد إرسال رسالتك.',
              'No automatic sending: “Open chat” only opens WhatsApp. Mark each item manually after you send your message.'
            )}
          </HintCard>

          <section className="glass card col" style={{ gap: 10 }}>
            <div className="row-between">
              <span className="section-title">{t('التقدم', 'Progress')}</span>
              <span className="badge accent">{n(progress)}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'var(--glass-3)', overflow: 'hidden' }} aria-hidden="true">
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap', fontSize: 11.5 }}>
              <span className="text-muted">
                {t('أُرسلت', 'Sent')}: <b>{n(sentCount)}</b>
              </span>
              <span className="text-muted">
                {t('تخطي', 'Skipped')}: <b>{n(skippedCount)}</b>
              </span>
              <span className="text-muted">
                {t('متبقٍ', 'Left')}: <b>{n(pendingCount)}</b>
              </span>
            </div>
          </section>

          {currentItem ? (
            <section className="glass card col" style={{ gap: 12 }}>
              <div className="row-between">
                <span className="section-title">{t('العنصر الحالي', 'Current item')}</span>
                <span className="badge">{t('قيد الانتظار', 'Pending')}</span>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <span className="avatar">{initials(currentItem.label)}</span>
                <div className="list-main">
                  <span className="list-title">{currentItem.label}</span>
                  <span className="list-sub sensitive" dir="ltr">
                    {currentItem.display}
                  </span>
                </div>
              </div>
              {activeCampaign.message ? (
                <div className="glass-soft" style={{ padding: 12 }}>
                  <p className="page-sub" style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                    {activeCampaign.message}
                  </p>
                </div>
              ) : null}
              <Button variant="primary" block disabled={paused || updating} onClick={openCurrentChat}>
                <Icon name="whatsapp" size={18} />
                {t('فتح المحادثة في واتساب', 'Open chat in WhatsApp')}
              </Button>
              <div className="grid-2">
                <Button variant="soft" disabled={paused || updating} onClick={() => void markCurrent('sent')}>
                  <Icon name="check" size={16} />
                  {t('أُرسلت', 'Sent')}
                </Button>
                <Button variant="ghost" disabled={paused || updating} onClick={() => void markCurrent('skipped')}>
                  <Icon name="x" size={16} />
                  {t('تخطي', 'Skip')}
                </Button>
              </div>
              <Button variant="ghost" block onClick={() => setPaused((value) => !value)}>
                <Icon name={paused ? 'refresh' : 'lock'} size={16} />
                {paused ? t('استئناف', 'Resume') : t('إيقاف مؤقت', 'Pause')}
              </Button>
              {paused ? (
                <p className="page-sub" style={{ margin: 0, textAlign: 'center' }}>
                  {t('التشغيل متوقف مؤقتاً — الحالة محفوظة.', 'The run is paused — progress is saved.')}
                </p>
              ) : null}
            </section>
          ) : (
            <EmptyState
              icon="check"
              title={t('اكتملت الحملة', 'Campaign complete')}
              description={t('تم التعامل مع كل العناصر. يمكنك إعادة ضبط الحالة للبدء من جديد.', 'All items are handled. You can reset progress to start over.')}
              action={
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button variant="soft" disabled={updating} onClick={() => void resetRun()}>
                    <Icon name="refresh" size={16} />
                    {t('إعادة ضبط', 'Reset')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRunId(null);
                      setPaused(false);
                    }}
                  >
                    {t('العودة للقائمة', 'Back to list')}
                  </Button>
                </div>
              }
            />
          )}

          <section className="glass card col" style={{ gap: 8 }}>
            <div className="section-head">
              <h2 className="section-title">{t('عناصر الحملة', 'Campaign items')}</h2>
              <span className="badge">{n(items.length)}</span>
            </div>
            <div className="list">
              {items.map((item) => (
                <div key={item.id} className="list-row">
                  <span className="avatar">
                    <Icon name={item.status === 'sent' ? 'check' : item.status === 'skipped' ? 'x' : 'chat'} size={17} />
                  </span>
                  <div className="list-main">
                    <span className="list-title">{item.label}</span>
                    <span className="list-sub sensitive" dir="ltr">
                      {item.display}
                    </span>
                  </div>
                  <span className={`badge ${item.status === 'sent' ? 'accent' : ''}`}>{statusLabel(item.status)}</span>
                </div>
              ))}
            </div>
          </section>

          <Button variant="danger" block onClick={() => setDeleteId(activeCampaign.id)}>
            <Icon name="trash" size={17} />
            {t('حذف الحملة', 'Delete campaign')}
          </Button>
        </>
      ) : (
        <>
          <HintCard icon="shield">
            {t(
              'الحملات مجرد قائمة مساعدة: تفتح كل محادثة على حدة، وأنت من يضغط الإرسال داخل واتساب. لا بثّ تلقائي ولا تجاوز لسياسة واتساب.',
              'Campaigns are just a helper list: you open each chat yourself and press send inside WhatsApp. No auto-blasting, no policy bypass.'
            )}
          </HintCard>

          {campaigns.length === 0 ? (
            <EmptyState
              icon="send"
              title={t('لا توجد حملات بعد', 'No campaigns yet')}
              description={t('أنشئ حملة من وجهاتك المحفوظة أو بإدخال أرقام يدوياً، ثم تابع تقدمك عنصراً بعنصر.', 'Create a campaign from saved destinations or manual numbers, then track your progress item by item.')}
              action={
                <Button variant="primary" onClick={() => openEditor(null)}>
                  <Icon name="plus" size={16} />
                  {t('حملة جديدة', 'New campaign')}
                </Button>
              }
            />
          ) : (
            <>
              <div className="section-head">
                <h2 className="section-title">{t('حملاتك', 'Your campaigns')}</h2>
                <span className="badge">{n(campaigns.length)}</span>
              </div>
              {campaigns.map((campaign) => {
                const percent = progressOf(campaign);
                return (
                  <section key={campaign.id} className="glass card col" style={{ gap: 10 }}>
                    <div className="row-between">
                      <div className="list-main">
                        <span className="list-title">{campaign.name}</span>
                        <span className="list-sub">
                          {t(`${n(campaign.items.length)} عناصر`, `${n(campaign.items.length)} items`)} · {rel(campaign.updatedAt)}
                        </span>
                      </div>
                      <span className="badge accent">{n(percent)}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: 'var(--glass-3)', overflow: 'hidden' }} aria-hidden="true">
                      <div style={{ height: '100%', width: `${percent}%`, borderRadius: 999, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }} />
                    </div>
                    {campaign.message ? (
                      <p className="list-sub" style={{ margin: 0 }}>
                        {campaign.message}
                      </p>
                    ) : null}
                    <div className="grid-2">
                      <Button
                        variant="primary"
                        onClick={() => {
                          setPaused(false);
                          setRunId(campaign.id);
                        }}
                      >
                        <Icon name="whatsapp" size={17} />
                        {t('تشغيل', 'Run')}
                      </Button>
                      <Button variant="soft" onClick={() => openEditor(campaign)}>
                        <Icon name="edit" size={16} />
                        {t('تعديل', 'Edit')}
                      </Button>
                    </div>
                    <Button variant="ghost" block onClick={() => setDeleteId(campaign.id)}>
                      <Icon name="trash" size={16} />
                      {t('حذف', 'Delete')}
                    </Button>
                  </section>
                );
              })}
              <Button variant="primary" block onClick={() => openEditor(null)}>
                <Icon name="plus" size={17} />
                {t('حملة جديدة', 'New campaign')}
              </Button>
            </>
          )}
        </>
      )}

      <Sheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? t('تعديل الحملة', 'Edit campaign') : t('حملة جديدة', 'New campaign')}
        subtitle={t('اسم، رسالة اختيارية، وقائمة عناصر من وجهاتك أو يدوياً.', 'A name, an optional message, and items from your destinations or manually.')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void saveDraft()}>
              {t('حفظ', 'Save')}
            </Button>
          </>
        }
      >
        <Field label={t('اسم الحملة', 'Campaign name')}>
          <input
            className="control"
            value={draftName}
            maxLength={80}
            aria-label={t('اسم الحملة', 'Campaign name')}
            placeholder={t('مثال: متابعة عملاء الأسبوع', 'Example: Weekly client follow-up')}
            onChange={(event) => setDraftName(event.target.value)}
          />
        </Field>

        <Field
          label={t('الرسالة (اختياري)', 'Message (optional)')}
          hint={t('تُفتح المحادثة بهذه الرسالة جاهزة للكتابة — لا تُرسل تلقائياً.', 'The chat opens with this message ready — it is never sent automatically.')}
          counter={`${n(draftMessage.length)}/2000`}
        >
          <textarea
            className="control"
            value={draftMessage}
            maxLength={2000}
            aria-label={t('الرسالة (اختياري)', 'Message (optional)')}
            placeholder={t('مرحباً، أود المتابعة بخصوص طلبك…', 'Hello, I would like to follow up on your request…')}
            onChange={(event) => setDraftMessage(event.target.value)}
          />
        </Field>

        <div className="section-head">
          <h3 className="section-title">{t('من الوجهات المحفوظة', 'From saved destinations')}</h3>
          <span className="badge">{n(destinations.length)}</span>
        </div>
        {destinations.length === 0 ? (
          <p className="page-sub" style={{ margin: 0 }}>
            {t('لا توجد وجهات محفوظة. أضف عناصر يدوياً من الأسفل.', 'No saved destinations. Add items manually below.')}
          </p>
        ) : (
          <div className="list" style={{ maxHeight: 230, overflowY: 'auto' }}>
            {destinations.map((destination) => {
              const selected = isDestinationSelected(destination);
              return (
                <button
                  key={destination.id}
                  type="button"
                  className="list-row"
                  aria-pressed={selected}
                  style={{ width: '100%', textAlign: 'start', background: selected ? 'var(--accent-soft)' : undefined }}
                  onClick={() => toggleDestination(destination)}
                >
                  <span className="avatar">{initials(destination.label)}</span>
                  <span className="list-main">
                    <span className="list-title">{destination.label}</span>
                    <span className="list-sub sensitive" dir="ltr">
                      {destination.type === 'phone' ? formatPhone(destination.phone || '') : '@' + (destination.username || '')}
                    </span>
                  </span>
                  <Icon name={selected ? 'check' : 'plus'} size={17} style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }} />
                </button>
              );
            })}
          </div>
        )}

        <Field label={t('إدخال يدوي', 'Manual entry')} error={manualError || undefined} hint={t('رقم هاتف (محلي أو دولي) أو @اسم مستخدم.', 'A phone number (local or international) or @username.')}>
          <div className="row" style={{ gap: 8 }}>
            <input
              className={`control grow ${manualError ? 'error' : ''}`}
              dir="ltr"
              value={manualInput}
              aria-label={t('إدخال يدوي', 'Manual entry')}
              placeholder="+964 7XX XXX XXXX"
              onChange={(event) => {
                setManualInput(event.target.value);
                if (manualError) setManualError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addManualItem();
                }
              }}
            />
            <Button variant="soft" onClick={addManualItem}>
              <Icon name="plus" size={16} />
              {t('إضافة', 'Add')}
            </Button>
          </div>
        </Field>

        <div className="section-head">
          <h3 className="section-title">{t('عناصر الحملة', 'Campaign items')}</h3>
          <span className="badge accent">{n(draftItems.length)}</span>
        </div>
        {draftItems.length === 0 ? (
          <p className="page-sub" style={{ margin: 0 }}>
            {t('اختر وجهات محفوظة أو أضف رقماً يدوياً لبدء القائمة.', 'Pick saved destinations or add a number manually to start the list.')}
          </p>
        ) : (
          <div className="list">
            {draftItems.map((item) => (
              <div key={item.id} className="list-row">
                <span className="avatar">{initials(item.label)}</span>
                <span className="list-main">
                  <span className="list-title">{item.label}</span>
                  <span className="list-sub sensitive" dir="ltr">
                    {item.display}
                  </span>
                </span>
                <IconButton name="trash" label={t('إزالة العنصر', 'Remove item')} variant="plain" onClick={() => removeDraftItem(item.id)} />
              </div>
            ))}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={deleteId !== null}
        danger
        title={t('حذف الحملة؟', 'Delete campaign?')}
        description={t('سيُنحذف اسم الحملة وقائمتها وحالة تقدمها. لا يمكن التراجع.', 'The campaign name, list and progress will be deleted. This cannot be undone.')}
        confirmLabel={t('حذف', 'Delete')}
        onConfirm={() => void removeCampaign()}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
