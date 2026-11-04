import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/icons';
import { Button, EmptyState, Field, HintCard, ScreenHeader, Segmented, Spinner } from '../../components/ui';
import { useActiveWorkspace, useDestinations } from '../../hooks/useData';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { goBack, navigate } from '../../lib/router';
import { qrDataUrl } from '../../lib/qr';
import { parseTarget } from '../../lib/phone';
import { buildChatUrl } from '../../lib/whatsapp';
import { toast } from '../../lib/toast';
import { hapticError, hapticSuccess } from '../../lib/haptics';
import { destinationToTarget, escapeHtml } from './tools-visual-utils';

type LabelSource = 'saved' | 'manual';
type LabelGrid = '2x4' | '3x8';

interface LabelItem {
  key: string;
  name: string;
  display: string;
  url: string;
}

interface PrintRow {
  name: string;
  display: string;
  qr: string;
}

interface PrintOptions {
  title: string;
  subtitle: string;
  footer: string;
  dir: 'rtl' | 'ltr';
}

const MAX_LABELS = 40;

function buildPrintDocument(rows: PrintRow[], columns: number, options: PrintOptions): string {
  const dense = columns >= 3;
  const gap = dense ? '2.5mm' : '4mm';
  const labelHeight = dense ? '30mm' : '60mm';
  const qrSize = dense ? '15mm' : '38mm';
  const nameSize = dense ? '6.4pt' : '10pt';
  const phoneSize = dense ? '5.4pt' : '8pt';
  const padding = dense ? '1.8mm' : '3mm';
  const labels = rows
    .map(
      (row) => `
      <div class="label">
        <img src="${row.qr}" alt="" />
        <div class="lname">${escapeHtml(row.name)}</div>
        <div class="lphone">${escapeHtml(row.display)}</div>
      </div>`
    )
    .join('');

  return `<!doctype html>
<html lang="${options.dir === 'rtl' ? 'ar' : 'en'}" dir="${options.dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title)}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: #0b141a; font-family: 'Cairo Variable', 'Cairo', 'Segoe UI', system-ui, sans-serif; }
  .sheet { width: 100%; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 6mm; border-bottom: 0.4mm solid #d7e2de; padding-bottom: 2.5mm; margin-bottom: ${gap}; }
  .head h1 { font-size: 13pt; margin: 0; font-weight: 800; }
  .head p { font-size: 8pt; margin: 0; color: #5a6f68; }
  .grid { display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${gap}; }
  .label { height: ${labelHeight}; border: 0.3mm dashed #bccbc5; border-radius: 3mm; padding: ${padding}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm; text-align: center; break-inside: avoid; page-break-inside: avoid; overflow: hidden; }
  .label img { width: ${qrSize}; height: ${qrSize}; display: block; image-rendering: pixelated; }
  .lname { font-size: ${nameSize}; font-weight: 800; line-height: 1.3; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lphone { font-size: ${phoneSize}; color: #3f5a52; direction: ltr; }
  .foot { margin-top: 4mm; text-align: center; font-size: 7pt; color: #7a918a; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <main class="sheet">
    <div class="head"><h1>${escapeHtml(options.title)}</h1><p>${escapeHtml(options.subtitle)}</p></div>
    <div class="grid">${labels}</div>
    <div class="foot">${escapeHtml(options.footer)}</div>
  </main>
</body>
</html>`;
}

export function LabelsScreen() {
  const { t, n, locale, isRTL } = useI18n();
  const settings = useSettings();
  const workspace = useActiveWorkspace();
  const destinations = useDestinations(workspace?.id);
  const initialized = useRef(false);

  const [source, setSource] = useState<LabelSource>('saved');
  const [grid, setGrid] = useState<LabelGrid>('2x4');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualText, setManualText] = useState('');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [qrBusy, setQrBusy] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (initialized.current || !destinations.length) return;
    initialized.current = true;
    const favorites = destinations.filter((item) => item.favorite);
    const initial = (favorites.length ? favorites : destinations).slice(0, 24);
    setSelectedIds(initial.map((item) => item.id));
  }, [destinations]);

  const savedItems = useMemo<LabelItem[]>(() => {
    const chosen = new Set(selectedIds);
    const items: LabelItem[] = [];
    for (const destination of destinations) {
      if (!chosen.has(destination.id)) continue;
      const target = destinationToTarget(destination);
      if (!target) continue;
      items.push({ key: destination.id, name: destination.label, display: target.display, url: buildChatUrl(target) });
    }
    return items;
  }, [destinations, selectedIds]);

  const manualParsed = useMemo(() => {
    const lines = manualText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_LABELS);
    const items: LabelItem[] = [];
    const invalid: string[] = [];
    lines.forEach((line, index) => {
      const parts = line
        .split(/[,،|\t]/)
        .map((part) => part.trim())
        .filter(Boolean);
      const label = parts.length > 1 ? parts[0] : '';
      const raw = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '';
      const parsed = parseTarget(raw, { country: settings.defaultCountry });
      if (!parsed.ok) {
        invalid.push(line);
        return;
      }
      items.push({
        key: `manual-${index}`,
        name: label || parsed.target.display,
        display: parsed.target.display,
        url: buildChatUrl(parsed.target)
      });
    });
    return { items, invalid };
  }, [manualText, settings.defaultCountry]);

  const items = source === 'saved' ? savedItems : manualParsed.items;
  const manualLineCount = manualText.split(/\r?\n/).filter((line) => line.trim()).length;

  useEffect(() => {
    if (!items.length) {
      setQrMap({});
      setQrBusy(false);
      return;
    }
    let cancelled = false;
    setQrBusy(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const entries: Array<[string, string]> = [];
        for (const item of items.slice(0, MAX_LABELS)) {
          try {
            const dataUrl = await qrDataUrl(item.url, { size: 360, dark: '#06231b', light: '#ffffff', margin: 2 });
            entries.push([item.key, dataUrl]);
          } catch {
            /* skip an item that cannot be encoded */
          }
          if (cancelled) return;
        }
        if (!cancelled) {
          setQrMap(Object.fromEntries(entries));
          setQrBusy(false);
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [items]);

  const toggleDestination = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const selectAll = () => setSelectedIds(destinations.slice(0, 24).map((item) => item.id));

  const handlePrint = async () => {
    if (source === 'manual' && manualParsed.invalid.length) {
      toast(t('أصلح الأسطر غير الصالحة قبل الطباعة.', 'Fix the invalid lines before printing.'), 'error');
      hapticError();
      return;
    }
    if (!items.length) {
      toast(t('اختر ملصقاً واحداً على الأقل.', 'Choose at least one label.'), 'error');
      hapticError();
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      toast(
        t(
          'منع المتصفح فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.',
          'The browser blocked the print window. Allow pop-ups and try again.'
        ),
        'error'
      );
      hapticError();
      return;
    }

    setPrinting(true);
    try {
      const loadingHtml = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(
        t('ملصقات واتساب', 'WhatsApp labels')
      )}</title></head><body style="margin:0;height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#3f5a52;background:#fff">${escapeHtml(
        t('جارٍ تجهيز الملصقات…', 'Preparing labels…')
      )}</body></html>`;
      win.document.open();
      win.document.write(loadingHtml);
      win.document.close();

      const rows: PrintRow[] = [];
      for (const item of items.slice(0, MAX_LABELS)) {
        const qr = await qrDataUrl(item.url, { size: 480, dark: '#000000', light: '#ffffff', margin: 2 });
        rows.push({ name: item.name, display: item.display, qr });
      }

      const html = buildPrintDocument(rows, grid === '3x8' ? 3 : 2, {
        title: t('ملصقات واتساب', 'WhatsApp labels'),
        subtitle: workspace ? (locale === 'en' ? workspace.nameEn : workspace.name) : t('ADMH', 'ADMH'),
        footer: 'ADMH · WhatsApp Direct',
        dir: isRTL ? 'rtl' : 'ltr'
      });
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();

      let printed = false;
      const runPrint = () => {
        if (printed || win.closed) return;
        printed = true;
        win.print();
      };
      win.addEventListener('load', () => win.setTimeout(runPrint, 250), { once: true });
      win.setTimeout(runPrint, 1600);

      toast(
        t(
          'جاهز للطباعة — اختر «حفظ كـ PDF» من نافذة الطباعة.',
          'Ready to print — choose “Save as PDF” in the print dialog.'
        ),
        'success'
      );
      hapticSuccess();
    } catch {
      try {
        win.close();
      } catch {
        /* window already closed */
      }
      toast(t('تعذّر تجهيز الطباعة. حاول مرة أخرى.', 'Could not prepare printing. Try again.'), 'error');
      hapticError();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title={t('ملصقات QR', 'QR labels')}
        subtitle={t('ملصقات جاهزة لطاولات المتجر، تُطبع على A4 أو تُحفظ PDF.', 'Table-ready labels, printed on A4 or saved as PDF.')}
        onBack={() => goBack('/tools')}
      />

      <div className="glass card col" style={{ gap: 14 }}>
        <Segmented<LabelSource>
          value={source}
          onChange={setSource}
          options={[
            { value: 'saved', label: t('من الوجهات المحفوظة', 'Saved targets') },
            { value: 'manual', label: t('إدخال يدوي', 'Manual entry') }
          ]}
        />

        {source === 'saved' ? (
          destinations.length ? (
            <div className="col" style={{ gap: 10 }}>
              <div className="row-between">
                <p className="section-title">
                  {t('اختر الوجهات', 'Choose targets')} · <span className="badge accent">{n(selectedIds.length)}</span>
                </p>
                <div className="row" style={{ gap: 6 }}>
                  <Button variant="soft" onClick={selectAll}>
                    {t('الكل', 'All')}
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedIds([])}>
                    {t('إفراغ', 'Clear')}
                  </Button>
                </div>
              </div>
              <div className="glass-soft" style={{ padding: 4 }}>
                <div className="list">
                  {destinations.map((destination) => {
                    const active = selectedIds.includes(destination.id);
                    const target = destinationToTarget(destination);
                    return (
                      <button
                        key={destination.id}
                        type="button"
                        className="list-row"
                        aria-pressed={active}
                        disabled={!target}
                        onClick={() => toggleDestination(destination.id)}
                        style={{ width: '100%', textAlign: 'start', minHeight: 54 }}
                      >
                        <span
                          className="avatar"
                          style={{ background: active ? 'var(--accent-soft)' : 'var(--glass)', color: active ? 'var(--accent)' : 'var(--muted)' }}
                          aria-hidden="true"
                        >
                          <Icon name={active ? 'check' : destination.type === 'username' ? 'user' : 'phone'} size={18} />
                        </span>
                        <span className="list-main">
                          <span className="list-title">{destination.label}</span>
                          <span className="list-sub" dir="ltr" style={{ textAlign: 'start' }}>
                            {target ? target.display : t('بيانات غير صالحة', 'Invalid data')}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="users"
              title={t('لا توجد وجهات محفوظة', 'No saved targets')}
              description={t(
                'أضف وجهات أولاً، أو استخدم الإدخال اليدوي لإدخال الأرقام سطراً سطراً.',
                'Add targets first, or use manual entry to list numbers line by line.'
              )}
              action={
                <Button variant="soft" onClick={() => navigate('/targets')}>
                  {t('إدارة الوجهات', 'Manage targets')}
                </Button>
              }
            />
          )
        ) : (
          <div className="col" style={{ gap: 10 }}>
            <Field
              label={t('قائمة الأرقام', 'Number list')}
              hint={t(
                'سطر لكل ملصق: «اسم، رقم» أو الرقم فقط. مثال: متجر النخيل، +9647701234567',
                'One label per line: “name, number” or just the number. E.g. Al Nakheel, +9647701234567'
              )}
              counter={`${n(manualLineCount)}/${n(MAX_LABELS)}`}
            >
              <textarea
                className="control"
                value={manualText}
                rows={5}
                dir="auto"
                onChange={(event) => setManualText(event.target.value)}
                placeholder={t('متجر النخيل، +9647701234567\nالمقهى، 07701234567', 'Al Nakheel, +9647701234567\nCafe, 07701234567')}
              />
            </Field>
            {manualParsed.invalid.length ? (
              <div className="glass-soft" style={{ padding: '10px 12px', borderColor: 'var(--danger)' }}>
                <p className="text-danger" style={{ fontSize: 11.5, margin: 0, fontWeight: 700 }}>
                  {t('أسطر غير صالحة', 'Invalid lines')} ({n(manualParsed.invalid.length)})
                </p>
                <p className="field-hint" dir="auto" style={{ margin: '4px 0 0', wordBreak: 'break-word' }}>
                  {manualParsed.invalid.slice(0, 3).join(' · ')}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="col" style={{ gap: 9 }}>
          <p className="section-title">{t('قالب الطباعة', 'Print layout')}</p>
          <Segmented<LabelGrid>
            value={grid}
            onChange={setGrid}
            options={[
              { value: '2x4', label: t('٢×٤ — ٨ ملصقات', '2×4 — 8 labels') },
              { value: '3x8', label: t('٣×٨ — ٢٤ ملصقاً', '3×8 — 24 labels') }
            ]}
          />
        </div>
      </div>

      <div className="glass card col" style={{ gap: 12 }}>
        <div className="row-between">
          <p className="section-title">{t('المعاينة', 'Preview')}</p>
          <span className="badge accent">
            {n(items.length)} {t('ملصق', 'labels')}
          </span>
        </div>

        {items.length ? (
          qrBusy ? (
            <div className="row" style={{ justifyContent: 'center', padding: 18 }}>
              <Spinner size={22} />
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: grid === '3x8' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
                gap: 8
              }}
            >
              {items.map((item) => (
                <div
                  key={item.key}
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: grid === '3x8' ? 7 : 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    minWidth: 0
                  }}
                >
                  {qrMap[item.key] ? (
                    <img
                      src={qrMap[item.key]}
                      alt=""
                      style={{ width: '100%', maxWidth: grid === '3x8' ? 64 : 96, height: 'auto', display: 'block' }}
                    />
                  ) : (
                    <div
                      className="skeleton"
                      style={{ width: '100%', maxWidth: grid === '3x8' ? 64 : 96, aspectRatio: '1 / 1', borderRadius: 8 }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: grid === '3x8' ? 8.5 : 11,
                      fontWeight: 800,
                      color: '#0b141a',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                      maxWidth: '100%'
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ fontSize: grid === '3x8' ? 7.5 : 9, color: '#3f5a52', direction: 'ltr' }}>{item.display}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          <EmptyState
            icon="printer"
            title={t('لا ملصقات بعد', 'No labels yet')}
            description={t(
              'اختر وجهة محفوظة أو أدخل أرقاماً يدوياً لعرض المعاينة.',
              'Pick a saved target or enter numbers manually to see the preview.'
            )}
          />
        )}
      </div>

      <Button variant="primary" size="lg" block onClick={() => void handlePrint()} loading={printing} disabled={!items.length || printing}>
        <Icon name="printer" size={18} />
        {t('طباعة / حفظ PDF', 'Print / Save as PDF')}
      </Button>

      <HintCard icon="info">
        {t(
          'يُفتح حوار الطباعة في نافذة جديدة. لحفظ PDF اختر «حفظ كـ PDF» ضمن خيارات الطباعة في المتصفح.',
          'The print dialog opens in a new window. To save a PDF, choose “Save as PDF” in the browser print options.'
        )}
      </HintCard>
    </div>
  );
}
