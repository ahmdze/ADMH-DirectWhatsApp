/* Production smoke test over CDP: routes, share target, offline, console errors. */
const PORT = process.argv[2] || '9422';
const BASE = process.argv[3] || 'http://127.0.0.1:4173/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let id = 0;
await new Promise((resolve) => (ws.onopen = resolve));
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    errors.push('exception: ' + (message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text));
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push('console: ' + message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    errors.push('log: ' + message.params.entry.text);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
const evaluate = async (expression, awaitPromise = true) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  return result.result?.result?.value;
};

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

await send('Page.navigate', { url: BASE });
await sleep(6000);
const initial = await evaluate(`JSON.stringify({
  children: document.getElementById('root')?.children.length,
  title: document.querySelector('.page-title')?.textContent,
  sw: await navigator.serviceWorker?.getRegistration().then(r => Boolean(r)).catch(() => false)
})`);
console.log('initial:', initial);

const routes = ['#/targets', '#/templates', '#/tools', '#/tools/qr', '#/tools/scan', '#/tools/card', '#/tools/labels', '#/tools/vcard', '#/tools/backup', '#/tools/stats', '#/tools/import', '#/tools/campaigns', '#/tools/reminders', '#/settings', '#/compose'];
for (const route of routes) {
  await evaluate(`location.hash = ${JSON.stringify(route)}`);
  await sleep(900);
  const state = await evaluate(`JSON.stringify({ route: location.hash, title: document.querySelector('.page-title')?.textContent, len: document.body.innerText.length })`);
  console.log(state);
}
console.log('errors after routes:', JSON.stringify(errors));

// Share target simulation
await send('Page.navigate', { url: `${BASE}?share=1&text=${encodeURIComponent('راسلني https://wa.me/9647701234567')}` });
await sleep(5000);
console.log(
  'share target:',
  await evaluate(`JSON.stringify({ raw: document.querySelector('input[dir="ltr"]')?.value, href: location.href })`)
);

// Offline reload
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send('Page.reload');
await sleep(5000);
console.log(
  'offline:',
  await evaluate(`JSON.stringify({ children: document.getElementById('root')?.children.length, text: document.body.innerText.slice(0, 80) })`)
);

await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
console.log('final errors:', JSON.stringify(errors));
ws.close();
