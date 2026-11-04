/* Dev utility: capture screenshots from a running dev server via Chrome DevTools Protocol. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = process.argv[2] || '9226';
const BASE = process.argv[3] || 'http://127.0.0.1:5174/';
const OUT = resolve('docs/screenshots');

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function connect() {
  const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.json());
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No page target');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  await new Promise((resolveOpen) => (socket.onopen = resolveOpen));
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolveSend) => {
      const messageId = ++id;
      pending.set(messageId, resolveSend);
      socket.send(JSON.stringify({ id: messageId, method, params }));
    });
  return { send, close: () => socket.close() };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { send, close } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: `${BASE}?demo=1#/compose` });
  await sleep(6000);

  const routes = [
    { hash: '#/compose', file: 'compose-dark.png' },
    { hash: '#/targets', file: 'targets-dark.png' },
    { hash: '#/templates', file: 'templates-dark.png' },
    { hash: '#/tools', file: 'tools-dark.png' },
    { hash: '#/tools/qr', file: 'qr-dark.png' },
    { hash: '#/tools/card', file: 'card-dark.png' },
    { hash: '#/settings', file: 'settings-dark.png' }
  ];

  for (const route of routes) {
    await send('Page.navigate', { url: `${BASE}?demo=1${route.hash}` });
    await sleep(3200);
    await send('Page.bringToFront');
    const subtitle = await send('Runtime.evaluate', {
      expression: 'document.querySelector(".page-sub")?.textContent || ""',
      returnByValue: true
    });
    console.log('  title:', subtitle.result?.result?.value);
    // Force a fresh compositor frame (headless sometimes returns a stale surface).
    await send('Emulation.setDeviceMetricsOverride', { width: 392, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(180);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(600);
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    writeFileSync(resolve(OUT, route.file), Buffer.from(result.result.data, 'base64'));
    console.log('captured', route.file);
  }

  // Light theme compose
  await send('Runtime.evaluate', {
    expression: `(() => {
      const raw = localStorage.getItem('admh2_settings');
      const settings = raw ? JSON.parse(raw) : {};
      settings.theme = 'light';
      localStorage.setItem('admh2_settings', JSON.stringify(settings));
    })()`
  });
  await send('Page.navigate', { url: `${BASE}?demo=1#/compose` });
  await sleep(3500);
  await send('Page.bringToFront');
  await sleep(900);
  const light = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  writeFileSync(resolve(OUT, 'compose-light.png'), Buffer.from(light.result.data, 'base64'));
  console.log('captured compose-light.png');

  close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
