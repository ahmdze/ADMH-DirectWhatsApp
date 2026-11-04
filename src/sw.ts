/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const SHARE_CACHE = 'admh-share-target';
const SHARE_KEY = '__shared-image';
const MAX_SHARED_IMAGE = 12 * 1024 * 1024;

// App shell precache (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * Web Share Target (POST) — Android can share an image into the app, and we
 * keep it in a cache so the page can read it after the redirect.
 */
async function handleShareTarget(request: Request): Promise<Response> {
  let title = '';
  let text = '';
  let sharedUrl = '';
  let imageStored = false;
  try {
    const form = await request.formData();
    title = String(form.get('title') || '');
    text = String(form.get('text') || '');
    sharedUrl = String(form.get('url') || '');
    const file = form.get('image');
    if (file instanceof File && file.size > 0 && file.size <= MAX_SHARED_IMAGE) {
      const cache = await caches.open(SHARE_CACHE);
      const key = new URL(SHARE_KEY, self.registration.scope).href;
      await cache.put(
        key,
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'image/png',
            'X-File-Name': encodeURIComponent(file.name || 'shared-image')
          }
        })
      );
      imageStored = true;
    }
  } catch {
    /* fall through to the normal app */
  }
  const target = new URL(imageStored ? '?share=image' : '?share=1', self.registration.scope);
  if (!imageStored) {
    if (title) target.searchParams.set('title', title);
    if (text) target.searchParams.set('text', text);
    if (sharedUrl) target.searchParams.set('url', sharedUrl);
  }
  return Response.redirect(target.href, 303);
}

registerRoute(
  ({ url }) => url.pathname.endsWith('/share-target'),
  ({ request }) => handleShareTarget(request),
  'POST'
);

// SPA navigation fallback (hash routing)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\/share-target$/]
  })
);

// Offline-first fonts and generated images.
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\.(?:woff2|png|svg)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'admh-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 })]
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL((event.notification.data as { url?: string } | undefined)?.url || './', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await (client as WindowClient).navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
