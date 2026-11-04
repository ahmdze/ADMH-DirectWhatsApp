import { useEffect, useState } from 'react';
import { Field, Sheet } from '../../components/ui';
import { Icon } from '../../components/icons';
import { useI18n } from '../../lib/i18n';
import { COUNTRIES, countryByIso } from '../../lib/phone';

interface CountrySheetProps {
  open: boolean;
  selected: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

/** Searchable list of `COUNTRIES` used to pick the default country. */
export function CountrySheet({ open, selected, onSelect, onClose }: CountrySheetProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const current = countryByIso(selected);
  const term = query.trim().toLowerCase();
  const rows = term
    ? COUNTRIES.filter(
        (country) =>
          country.ar.includes(query.trim()) ||
          country.en.toLowerCase().includes(term) ||
          t(country.ar, country.en).toLowerCase().includes(term) ||
          country.iso.toLowerCase().includes(term) ||
          country.dial.includes(term)
      )
    : COUNTRIES;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('الدولة الافتراضية', 'Default country')}
      subtitle={
        current
          ? `${t('الدولة الحالية', 'Current country')}: ${t(current.ar, current.en)}`
          : t('اختر الدولة الافتراضية للأرقام المحلية.', 'Choose the default country for local numbers.')
      }
    >
      <Field label={t('بحث', 'Search')} hint={t('اختر الدولة لتطبيقها فوراً.', 'Pick a country to apply it instantly.')}>
        <input
          className="control"
          type="search"
          value={query}
          placeholder={t('ابحث باسم الدولة أو المفتاح…', 'Search by country or dial code…')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>

      {rows.length === 0 ? (
        <p className="page-sub" style={{ textAlign: 'center', margin: '6px 0' }}>
          {t('لا توجد نتائج مطابقة.', 'No matching results.')}
        </p>
      ) : (
        <div className="list" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {rows.map((country) => {
            const isSelected = country.iso === selected;
            return (
              <button
                key={country.iso}
                type="button"
                className="list-row"
                style={{ width: '100%', textAlign: 'start', background: isSelected ? 'var(--accent-soft)' : undefined }}
                onClick={() => {
                  onSelect(country.iso);
                  onClose();
                }}
              >
                <span className="avatar" style={{ fontSize: 18 }} aria-hidden="true">
                  {country.flag}
                </span>
                <span className="list-main">
                  <span className="list-title">{t(country.ar, country.en)}</span>
                  <span className="list-sub" dir="ltr">
                    +{country.dial}
                  </span>
                </span>
                {isSelected ? <Icon name="check" size={18} style={{ color: 'var(--accent)' }} /> : null}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
