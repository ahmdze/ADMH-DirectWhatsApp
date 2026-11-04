import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/monochrome.svg'],
      manifest: {
        id: './v2',
        name: 'واتساب المباشر — ADMH',
        short_name: 'واتساب المباشر',
        description: 'افتح محادثة واتساب مباشرة دون حفظ رقم الهاتف. سريع، خاص، ويعمل دون اتصال.',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        background_color: '#06110f',
        theme_color: '#0b2b2b',
        categories: ['utilities', 'productivity', 'social'],
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        handle_links: 'preferred',
        screenshots: [
          {
            src: 'screenshots/home-narrow.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'شاشة الإرسال — واتساب المباشر'
          },
          {
            src: 'screenshots/home-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'واتساب المباشر على سطح المكتب'
          }
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/monochrome.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'monochrome' }
        ],
        shortcuts: [
          {
            name: 'إرسال سريع',
            short_name: 'إرسال',
            description: 'افتح شاشة إرسال محادثة جديدة',
            url: './?action=compose',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'مسح رمز QR',
            short_name: 'مسح QR',
            description: 'امسح رمز واتساب بالكاميرا',
            url: './?action=scan',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ],
        share_target: {
          action: './share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [{ name: 'image', accept: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] }]
          }
        }
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      },
      devOptions: { enabled: false }
    })
  ],
  server: { host: '127.0.0.1', port: 5173, watch: { ignored: ['**/.*.tmpdir/**', '**/*.tmp'] } },
  build: { target: 'es2022', cssCodeSplit: true }
});
