import '@fontsource-variable/cairo';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureDatabase } from './lib/db';
import { applyAppearance, getSettings, watchSystemTheme } from './lib/settings';
import { initInstallPrompt, initOnlineWatcher } from './lib/install';
import { initPwa } from './lib/pwa';

async function bootstrap(): Promise<void> {
  applyAppearance(getSettings());
  watchSystemTheme();
  initInstallPrompt();
  initOnlineWatcher();
  initPwa();

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
      <App />
    </StrictMode>
  );
}

void bootstrap();
