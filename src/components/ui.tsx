import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './icons';
import { getToasts, subscribeToasts } from '../lib/toast';
import { useI18n } from '../lib/i18n';

/* ------------------------------------------------------------------ Button */

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  block,
  loading,
  disabled,
  type = 'button',
  onClick,
  className = '',
  ariaLabel
}: ButtonProps) {
  const classes = [
    'btn',
    variant === 'primary' ? 'btn-primary' : '',
    variant === 'soft' ? 'btn-soft' : '',
    variant === 'ghost' ? 'btn-ghost' : '',
    variant === 'danger' ? 'btn-danger' : '',
    size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled || loading} aria-label={ariaLabel} aria-busy={loading || undefined}>
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- IconButton */

interface IconButtonProps {
  name: IconName;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'plain' | 'accent';
  size?: number;
  className?: string;
}

export function IconButton({ name, label, onClick, variant = 'default', size = 19, className = '' }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${variant === 'plain' ? 'plain' : ''} ${variant === 'accent' ? 'accent' : ''} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name={name} size={size} />
    </button>
  );
}

/* ------------------------------------------------------------------- Sheet */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}

export function Sheet({ open, onClose, title, subtitle, children, footer, closeLabel }: SheetProps) {
  const { t } = useI18n();
  const [offset, setOffset] = useState(0);
  const startY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setOffset(0);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => sheetRef.current?.focus());
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (event: ReactPointerEvent) => {
    startY.current = event.clientY;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    if (startY.current == null) return;
    setOffset(Math.max(0, event.clientY - startY.current));
  };
  const onPointerUp = () => {
    if (startY.current == null) return;
    startY.current = null;
    if (offset > 110) onClose();
    else setOffset(0);
  };

  return createPortal(
    <div className="sheet-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ transform: offset ? `translateY(${offset}px)` : undefined, transition: startY.current ? 'none' : undefined }}
      >
        <div className="sheet-handle" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
        {(title || subtitle) && (
          <div className="sheet-head">
            <div>
              {title ? <h2 className="sheet-title">{title}</h2> : null}
              {subtitle ? <p className="page-sub" style={{ marginTop: 3 }}>{subtitle}</p> : null}
            </div>
            <IconButton name="x" label={closeLabel || t('إغلاق', 'Close')} onClick={onClose} variant="plain" />
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------ ConfirmSheet */

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({ open, title, description, confirmLabel, cancelLabel, danger, onConfirm, onClose }: ConfirmSheetProps) {
  const { t } = useI18n();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel || t('إلغاء', 'Cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel || t('تأكيد', 'Confirm')}
          </Button>
        </>
      }
    >
      {description ? <p className="page-sub" style={{ margin: 0 }}>{description}</p> : null}
    </Sheet>
  );
}

/* ------------------------------------------------------------------- Field */

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, counter, children }: FieldProps) {
  return (
    <div className="field">
      {label || counter ? (
        <div className="field-label">
          <span>{label}</span>
          {counter ? <span className="control-counter">{counter}</span> : null}
        </div>
      ) : null}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Switch */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label className="switch" aria-disabled={disabled}>
      <span className="switch-text">
        <b>{label}</b>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}

/* -------------------------------------------------------------- Segmented */

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="seg" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Chips */

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export function Chip({ children, active, onClick, className = '', title }: ChipProps) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''} ${className}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- EmptyState */

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <b>{title}</b>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- ScreenHeader */

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, action }: ScreenHeaderProps) {
  const { t, isRTL } = useI18n();
  return (
    <div className="row-between" style={{ paddingBlock: 4 }}>
      <div className="row" style={{ minWidth: 0 }}>
        {onBack ? <IconButton name={isRTL ? 'arrowRight' : 'arrowLeft'} label={t('رجوع', 'Back')} onClick={onBack} variant="plain" /> : null}
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ fontSize: 21 }}>
            {title}
          </h1>
          {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------- ToastHost */

export function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  return (
    <div className="toast-host" aria-live="polite" role="status">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.kind === 'default' ? '' : item.kind}`}>
          {item.kind === 'success' ? <Icon name="check" size={15} /> : item.kind === 'error' ? <Icon name="alert" size={15} /> : null}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Spinner */

export function Spinner({ size = 22 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="loading" />;
}

/* --------------------------------------------------------------- HintCard */

export function HintCard({ children, icon = 'info' }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="hint-card">
      <Icon name={icon} size={17} />
      <span>{children}</span>
    </div>
  );
}
