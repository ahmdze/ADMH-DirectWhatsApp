import '@fontsource-variable/cairo';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/noto-naskh-arabic';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureDatabase } from './lib/db';
import { applyAppearance, getSettings, watchSystemTheme } from './lib/settings';
import { initInstallPrompt, initOnlineWatcher } from './lib/install';
import { initPwa } from './lib/pwa';
import { ensurePersistentStorage } from './lib/storage';
import { isNative } from './lib/native';
import { ErrorBoundary } from './components/ErrorBoundary';

async function bootstrap(): Promise<void> {
  applyAppearance(getSettings());
  watchSystemTheme();
  if (!isNative()) {
    initInstallPrompt();
    initPwa();
  }
  initOnlineWatcher();
  void ensurePersistentStorage();

  try {
    await ensureDatabase();
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
      const { seedDemoData } = await import('./lib/demo');
      await seedDemoData();
    }
  } catch (error) {
    console.error('Database initialization failed', error);
  }

  const container = document.getElementById('root');
  if (!container) return;
  container.innerHTML = '';
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

void bootstrap();
