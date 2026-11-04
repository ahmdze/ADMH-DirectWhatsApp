const PORT = process.argv[2] || '9490';
const BASE = process.argv[3] || 'http://127.0.0.1:4190/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let id = 0;
await new Promise((resolve) => (ws.onopen = resolve));
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
};
const send = (method, params = {}) => new Promise((resolve) => { const messageId = ++id; pending.set(messageId, resolve); ws.send(JSON.stringify({ id: messageId, method, params })); });
const evaluate = async (expression) => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return result.result?.result?.value; };
const fill = async (selector, value) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return false; const setter=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value').set; setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
const clickText = async (text) => { const ok = await evaluate(`(() => { const el=[...document.querySelectorAll('button')].find((b)=>(b.textContent||'').trim().includes(${JSON.stringify(text)})); if(!el) return false; el.click(); return true; })()`); await sleep(700); return ok; };
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: BASE });
await sleep(5000);
await evaluate(`(() => { const raw=localStorage.getItem('admh2_settings'); const s=raw?JSON.parse(raw):{}; Object.assign(s,{onboarded:true,lastSeenVersion:'2.4.0-alpha.1',locale:'ar'}); localStorage.setItem('admh2_settings',JSON.stringify(s)); location.hash='#/compose'; location.reload(); })()`);
await sleep(4500);
await fill('input[aria-label="رقم الهاتف أو اسم المستخدم"]', '07701234567');
await fill('textarea[aria-label="نص الرسالة"]', 'رسالة مع مرفق تجريبي');
const doc = await send('DOM.getDocument', { depth: -1 });
const query = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
console.log('file input node:', query.result.nodeId);
if (query.result.nodeId) {
  await send('DOM.setFileInputFiles', { nodeId: query.result.nodeId, files: ['D:\\Programming\\ADMH-DirectWhatsApp\\docs\\screenshots\\reminders-v24-ar.png'] });
}
await sleep(2500);
console.log('media visible:', await evaluate(`document.body.innerText.includes('reminders-v24-ar.png') || document.body.innerText.includes('مشاركة المرفقات')`));
console.log('preview visible:', await evaluate(`document.body.innerText.includes('معاينة محلية')`));
await clickText('جدولة');
await sleep(800);
console.log('schedule sheet:', await evaluate(`Boolean(document.querySelector('.sheet')) && document.querySelector('.sheet').innerText.includes('تذكير جديد')`));
console.log('preset:', await evaluate(`document.querySelector('.sheet')?.innerText.includes('رسالة مع مرفق تجريبي')`));
console.log('errors:', JSON.stringify(errors));
ws.close();
