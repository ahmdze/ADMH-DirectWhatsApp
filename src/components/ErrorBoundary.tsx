import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from './icons';
import { Button } from './ui';
import { useI18n } from '../lib/i18n';

async function repairAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}

function ErrorFallback({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'radial-gradient(120% 80% at 80% 0%, #0f3b33 0%, #081d1a 45%, #050f0d 100%)'
      }}
    >
      <div className="glass card" style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
        <div className="brand-mark" style={{ width: 58, height: 58, borderRadius: 20, margin: 'auto', color: 'var(--danger)' }}>
          <Icon name="alert" size={28} />
        </div>
        <h1 className="page-title" style={{ fontSize: 21 }}>
          {t('حدث خطأ غير متوقع', 'Something went wrong')}
        </h1>
        <p className="page-sub" style={{ margin: 0 }}>
          {t(
            'بياناتك المحفوظة على جهازك بأمان. جرّب إعادة التحميل، أو أصلح نسخة التطبيق المخزّنة.',
            'Your local data is safe on this device. Try reloading, or repair the cached app files.'
          )}
        </p>
        {message ? (
          <code style={{ fontSize: 10, opacity: 0.55, wordBreak: 'break-word', direction: 'ltr' }}>{message.slice(0, 220)}</code>
        ) : null}
        <Button variant="primary" block onClick={() => window.location.reload()}>
          {t('إعادة التحميل', 'Reload')}
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => {
            void repairAndReload();
          }}
        >
          {t('إصلاح نسخة التطبيق', 'Repair cached app')}
        </Button>
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App crash', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) return <ErrorFallback message={this.state.message} />;
    return this.props.children;
  }
}
