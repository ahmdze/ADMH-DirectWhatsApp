import { useMemo, useState } from 'react';
import { Icon } from '../../components/icons';
import { EmptyState, Sheet } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { COUNTRIES, countryByIso } from '../../lib/phone';

export interface CountryPickerProps {
  open: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}

/** Bottom sheet with a searchable country list. */
export function CountryPicker({ open, selected, onClose, onSelect }: CountryPickerProps) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return COUNTRIES;
    const dial = term.replace(/^\+/, '');
    return COUNTRIES.filter((country) => {
      const name = locale === 'en' ? country.en.toLowerCase() : country.ar;
      return (
        name.includes(term) ||
        country.en.toLowerCase().includes(term) ||
        country.iso.toLowerCase().includes(term) ||
        country.dial.startsWith(dial)
      );
    });
  }, [query, locale]);

  const current = countryByIso(selected) ?? COUNTRIES[0];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('اختر الدولة', 'Choose country')}
      subtitle={`${t('الدولة الحالية', 'Current')}: ${locale === 'en' ? current.en : current.ar} · +${current.dial}`}
    >
      <input
        className="control"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('ابحث باسم الدولة أو المفتاح', 'Search by name or dial code')}
        aria-label={t('بحث الدول', 'Search countries')}
        inputMode="search"
        autoComplete="off"
      />
      {results.length ? (
        <div className="list" style={{ maxHeight: '52dvh', overflowY: 'auto' }}>
          {results.map((country) => (
            <button
              key={country.iso}
              type="button"
              className="list-row"
              onClick={() => {
                onSelect(country.iso);
                setQuery('');
              }}
              style={{ width: '100%', textAlign: 'start', minHeight: 46 }}
            >
              <span aria-hidden="true" style={{ fontSize: 19, lineHeight: 1 }}>
                {country.flag}
              </span>
              <span className="list-main">
                <span className="list-title">{locale === 'en' ? country.en : country.ar}</span>
                <span className="list-sub" dir="ltr">
                  +{country.dial}
                </span>
              </span>
              {country.iso === selected ? <Icon name="check" size={17} /> : null}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="globe"
          title={t('لا دولة مطابقة', 'No matching country')}
          description={t('جرّب اسم الدولة بالإنجليزية أو مفتاحها الدولي.', 'Try the English country name or its dial code.')}
        />
      )}
    </Sheet>
  );
}
