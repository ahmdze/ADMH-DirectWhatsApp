import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button, EmptyState, HintCard, ScreenHeader, Segmented } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { goBack } from '../../lib/router';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { useActiveWorkspace, useDestinations } from '../../hooks/useData';
import { addDestination } from '../../lib/db';
import { parseContactsCsv } from '../../lib/csv';
import { parseVCards } from '../../lib/vcard';
import { formatPhone, parseTarget, type PhoneErrorCode } from '../../lib/phone';
import { initials, uid } from '../../lib/format';
import { readFileAsText } from '../../lib/image';
import { useSettings } from '../../lib/settings';
import type { Destination, Target } from '../../types';

type SourceFormat = 'csv' | 'vcard';

interface Candidate {
  id: string;
  name: string;
  raw: string;
  target: Target | null;
  errorCode: PhoneErrorCode | null;
}

interface ImportSummary {
  added: number;
  duplicates: number;
  invalid: number;
}

interface ContactRecord {
  name?: string[];
  tel?: string[];
}

interface ContactsManagerLike {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactRecord[]>;
}

function getContactsManager(): ContactsManagerLike | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as { contacts?: ContactsManagerLike };
  if (!nav.contacts || typeof nav.contacts.select !== 'function') return null;
  return nav.contacts;
}

function destinationKey(destination: Destination): string {
  return destination.type === 'phone' ? `phone:${destination.phone || ''}` : `username:${destination.username || ''}`;
}

function targetKey(target: Target): string {
  return `${target.type}:${target.value}`;
}

function displayTarget(target: Target): string {
  return target.type === 'phone' ? formatPhone(target.value) : '@' + target.value;
}

export function ImportScreen() {
  const { t, n, phoneError } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);

  const [format, setFormat] = useState<SourceFormat>('csv');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<'read' | 'import' | 'contacts' | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [contactsSupported] = useState(() => getContactsManager() !== null);

  const fileRef = useRef<HTMLInputElement>(null);

  const buildCandidates = (contacts: Array<{ name: string; phone: string }>): Candidate[] =>
    contacts.map((contact) => {
      if (!contact.phone.trim()) {
        return { id: uid(), name: contact.name, raw: '', target: null, errorCode: 'empty' };
      }
      const parsed = parseTarget(contact.phone, { country: settings.defaultCountry });
      if (parsed.ok) {
        const cleanName = contact.name.trim();
        return {
          id: uid(),
          name: cleanName && cleanName !== contact.phone.trim() ? cleanName : parsed.target.display,
          raw: contact.phone,
          target: parsed.target,
          errorCode: null
        };
      }
      return { id: uid(), name: contact.name, raw: contact.phone, target: null, errorCode: parsed.code };
    });

  const analyzed = useMemo(() => {
    const seen = new Set(destinations.map(destinationKey));
    return candidates.map((candidate) => {
      if (!candidate.target) return { candidate, duplicate: false };
      const key = targetKey(candidate.target);
      const duplicate = seen.has(key);
      if (!duplicate) seen.add(key);
      return { candidate, duplicate };
    });
  }, [candidates, destinations]);

  const validCount = analyzed.filter((entry) => entry.candidate.target !== null && !entry.duplicate).length;
  const duplicateCount = analyzed.filter((entry) => entry.candidate.target !== null && entry.duplicate).length;
  const invalidCount = analyzed.filter((entry) => entry.candidate.target === null).length;

  const resetPreview = () => {
    setCandidates([]);
    setFileName('');
    setError('');
  };

  const applyContacts = (contacts: Array<{ name: string; phone: string }>, label: string) => {
    if (!contacts.length) {
      setCandidates([]);
      setFileName('');
      setError(
        t(
          'لم نعثر على أي جهة اتصال صالحة في هذا المصدر. جرّب ملفاً آخر أو أدخل الأرقام يدوياً.',
          'No usable contacts were found in this source. Try another file or add numbers manually.'
        )
      );
      hapticError();
      return;
    }
    setCandidates(buildCandidates(contacts));
    setFileName(label);
    setError('');
    setResult(null);
    hapticSuccess();
  };

  const handleFile = async (file: File) => {
    setBusy('read');
    setError('');
    setResult(null);
    try {
      const text = await readFileAsText(file);
      const inferred: SourceFormat = /\.vcf$/i.test(file.name) || /\.vcard$/i.test(file.name) ? 'vcard' : /\.csv$/i.test(file.name) ? 'csv' : format;
      setFormat(inferred);
      const contacts = inferred === 'csv' ? parseContactsCsv(text) : parseVCards(text).map((card) => ({ name: card.name, phone: card.phone }));
      applyContacts(contacts, file.name);
    } catch {
      setCandidates([]);
      setError(t('تعذّرت قراءة الملف. تأكد أنه ملف نصي غير تالف.', 'Could not read the file. Make sure it is a valid text file.'));
      hapticError();
      toast(t('تعذّرت قراءة الملف', 'Could not read the file'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    void handleFile(file);
  };

  const pickContacts = async () => {
    const manager = getContactsManager();
    if (!manager) return;
    setBusy('contacts');
    setError('');
    setResult(null);
    try {
      const selection = await manager.select(['name', 'tel'], { multiple: true });
      const contacts: Array<{ name: string; phone: string }> = [];
      for (const entry of selection) {
        const name = entry.name?.[0]?.trim() || '';
        const numbers = entry.tel ?? [];
        for (const number of numbers) contacts.push({ name: name || number, phone: number });
      }
      applyContacts(contacts, t('جهات الاتصال', 'Contacts'));
    } catch {
      setError(t('تعذّر الوصول إلى جهات الاتصال أو تم إلغاء الطلب.', 'Contacts access failed or the request was cancelled.'));
      hapticError();
    } finally {
      setBusy(null);
    }
  };

  const addAll = async () => {
    if (!workspace) {
      toast(t('لا توجد مساحة عمل نشطة.', 'No active workspace.'), 'error');
      return;
    }
    setBusy('import');
    try {
      let added = 0;
      let duplicates = 0;
      for (const entry of analyzed) {
        const { candidate, duplicate } = entry;
        if (!candidate.target) continue;
        if (duplicate) {
          duplicates += 1;
          continue;
        }
        const target = candidate.target;
        await addDestination({
          workspaceId: workspace.id,
          type: target.type,
          phone: target.type === 'phone' ? target.value : undefined,
          username: target.type === 'username' ? target.value : undefined,
          label: (candidate.name || displayTarget(target)).slice(0, 80),
          tags: [t('مستورد', 'Imported')],
          favorite: false
        });
        added += 1;
      }
      const summary: ImportSummary = { added, duplicates, invalid: invalidCount };
      setResult(summary);
      setCandidates([]);
      setFileName('');
      hapticSuccess();
      toast(
        added > 0
          ? t(`تمت إضافة ${n(added)} وجهة`, `Added ${n(added)} destination(s)`)
          : t('لم تُضف وجهات جديدة', 'No new destinations added'),
        added > 0 ? 'success' : 'default'
      );
    } catch {
      hapticError();
      toast(t('تعذّرت إضافة الوجهات', 'Could not add the destinations'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t('استيراد جهات', 'Import contacts')}
        subtitle={t('استورد أرقاماً من ملف CSV أو vCard أو من جهات اتصال الهاتف.', 'Import numbers from a CSV or vCard file, or from your phone contacts.')}
        onBack={() => goBack()}
      />

      <HintCard icon="shield">
        {t(
          'تتم قراءة الملف داخل جهازك فقط ولا يُرسل إلى أي خادم. راجع المعاينة قبل الإضافة.',
          'The file is read entirely on your device and is never uploaded. Review the preview before adding.'
        )}
      </HintCard>

      <section className="glass card col" style={{ gap: 12 }}>
        <h2 className="section-title">{t('مصدر الأرقام', 'Number source')}</h2>
        <Segmented
          value={format}
          options={[
            { value: 'csv', label: t('ملف CSV', 'CSV file') },
            { value: 'vcard', label: t('ملف vCard', 'vCard file') }
          ]}
          onChange={(next) => {
            setFormat(next);
            setError('');
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.vcf,.vcard,text/csv,text/vcard,text/x-vcard"
          hidden
          onChange={handleFileChange}
        />
        <Button variant="primary" block loading={busy === 'read'} disabled={busy !== null} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={17} />
          {t('اختيار ملف', 'Choose a file')}
        </Button>
        {contactsSupported ? (
          <Button variant="soft" block loading={busy === 'contacts'} disabled={busy !== null} onClick={() => void pickContacts()}>
            <Icon name="contact" size={17} />
            {t('استيراد من جهات الاتصال', 'Import from contacts')}
          </Button>
        ) : (
          <p className="page-sub" style={{ margin: 0 }}>
            {t(
              'متصفحك لا يدعم منتقي جهات الاتصال. استخدم ملف CSV أو vCard بدلاً منه.',
              'Your browser does not support the contact picker. Use a CSV or vCard file instead.'
            )}
          </p>
        )}
        {busy === 'read' ? (
          <p className="page-sub" style={{ margin: 0 }}>
            {t('جارٍ قراءة الملف…', 'Reading the file…')}
          </p>
        ) : null}
        {error ? (
          <p className="field-error" role="alert" style={{ paddingInline: 2 }}>
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="glass card col" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8, color: 'var(--accent)' }}>
            <Icon name="check" size={17} />
            <h2 className="section-title" style={{ color: 'var(--accent)' }}>
              {t('نتيجة الاستيراد', 'Import result')}
            </h2>
          </div>
          <div className="grid-3">
            <div className="stat-card">
              <small>{t('مضافة', 'Added')}</small>
              <b>{n(result.added)}</b>
            </div>
            <div className="stat-card">
              <small>{t('موجودة مسبقاً', 'Already saved')}</small>
              <b>{n(result.duplicates)}</b>
            </div>
            <div className="stat-card">
              <small>{t('غير صالحة', 'Invalid')}</small>
              <b>{n(result.invalid)}</b>
            </div>
          </div>
        </section>
      ) : null}

      {candidates.length === 0 ? (
        result ? null : (
          <EmptyState
            icon="contact"
            title={t('لا توجد معاينة بعد', 'No preview yet')}
            description={t(
              'اختر ملف CSV أو vCard، أو استورد من جهات اتصال الهاتف. ستظهر الأرقام هنا مع حالة كل رقم قبل إضافتها.',
              'Choose a CSV or vCard file, or import from your phone contacts. Numbers will appear here with their validation status before adding.'
            )}
          />
        )
      ) : (
        <section className="glass card col" style={{ gap: 12 }}>
          <div className="section-head">
            <h2 className="section-title">{t('معاينة الاستيراد', 'Import preview')}</h2>
            <span className="badge" style={{ maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName}
            </span>
          </div>
          <div className="grid-3">
            <div className="stat-card">
              <small style={{ color: 'var(--accent)' }}>{t('صالح', 'Valid')}</small>
              <b>{n(validCount)}</b>
            </div>
            <div className="stat-card">
              <small>{t('موجود مسبقاً', 'Already saved')}</small>
              <b>{n(duplicateCount)}</b>
            </div>
            <div className="stat-card">
              <small style={{ color: 'var(--danger)' }}>{t('غير صالح', 'Invalid')}</small>
              <b>{n(invalidCount)}</b>
            </div>
          </div>

          <div className="list" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {analyzed.slice(0, 60).map(({ candidate, duplicate }) => (
              <div key={candidate.id} className="list-row">
                <span className="avatar">{initials(candidate.name || candidate.raw)}</span>
                <div className="list-main">
                  <span className="list-title">{candidate.name || t('بدون اسم', 'Unnamed')}</span>
                  <span className="list-sub" dir={candidate.target ? 'ltr' : undefined}>
                    {candidate.target ? displayTarget(candidate.target) : candidate.raw || t('لا يوجد رقم', 'No number')}
                  </span>
                  {!candidate.target && candidate.errorCode ? (
                    <span className="list-sub text-danger">{phoneError(candidate.errorCode)}</span>
                  ) : null}
                </div>
                {candidate.target ? (
                  duplicate ? (
                    <span className="badge">{t('موجودة', 'Saved')}</span>
                  ) : (
                    <span className="badge accent">{t('صالحة', 'Valid')}</span>
                  )
                ) : (
                  <span className="badge" style={{ color: 'var(--danger)' }}>
                    {t('غير صالحة', 'Invalid')}
                  </span>
                )}
              </div>
            ))}
          </div>
          {analyzed.length > 60 ? (
            <p className="page-sub" style={{ margin: 0, textAlign: 'center' }}>
              {t(`عرض 60 من ${n(analyzed.length)} — ستُضاف كلها عند المتابعة.`, `Showing 60 of ${n(analyzed.length)} — all will be added when you continue.`)}
            </p>
          ) : null}

          <Button variant="primary" block loading={busy === 'import'} disabled={busy !== null || validCount === 0} onClick={() => void addAll()}>
            <Icon name="plus" size={17} />
            {t(`إضافة ${n(validCount)} وجهة`, `Add ${n(validCount)} destination(s)`)}
          </Button>
          <Button variant="ghost" block disabled={busy !== null} onClick={resetPreview}>
            {t('مسح المعاينة', 'Clear preview')}
          </Button>
        </section>
      )}
    </div>
  );
}
