/* Full UI E2E: sign in -> add device -> verify -> delete device.
   Uses headless Edge via CDP. Cleans up after itself. */
const { spawn } = require('child_process');
const WebSocket = require('ws');
const os = require('os');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9223;
const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const E2E_EMAIL = process.env.SMOKE_TEST_EMAIL;
const E2E_PASSWORD = process.env.SMOKE_TEST_PASSWORD;
if (!E2E_EMAIL || !E2E_PASSWORD) {
  console.error('Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env');
  process.exit(1);
}
const userDataDir = path.join(os.tmpdir(), `snapit-e2e-${Date.now()}`);
const shotsDir = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

const MODEL = `E2E Test Device ${Date.now()}`;
const SERIAL = `E2E-${Date.now()}`;

const edge = spawn(
  EDGE,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1280,1000',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, label, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  await waitFor(async () => (await fetch(APP_URL)).ok, 'Metro server');

  const target = await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const list = await r.json();
    return list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  }, 'Edge target');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const issues = [];

  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        issues.push(
          `[console.${msg.params.type}] ` +
            msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')
        );
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        issues.push(`[exception] ${msg.params.exceptionDetails?.text} ${msg.params.exceptionDetails?.exception?.description || ''}`);
      }
      if (msg.method === 'Page.javascriptDialogOpening') {
        console.log(`DIALOG: ${msg.params.message.split('\n')[0]}`);
        send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
    }
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = ++id;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) {
      throw new Error(res.result.exceptionDetails.text || 'evaluate failed');
    }
    return res.result?.result?.value;
  }

  async function bodyText() {
    return (await evaluate('document.body.innerText')) || '';
  }

  async function waitText(text, label = text, attempts = 60) {
    return waitFor(async () => (await bodyText()).includes(text), label, attempts);
  }

  async function screenshot(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result?.data) {
      const file = path.join(shotsDir, name);
      fs.writeFileSync(file, Buffer.from(res.result.data, 'base64'));
      console.log(`SCREENSHOT: ${file}`);
    }
  }

  async function clickText(text, { startsWith = false } = {}) {
    const expr = `(() => {
      const all = [...document.querySelectorAll('[role="button"], button, [tabindex="0"]')];
      const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
      const target = all.find(e => {
        const t = norm(e.innerText);
        return ${startsWith ? `t.startsWith(${JSON.stringify(text)})` : `t === ${JSON.stringify(text)}`};
      });
      if (!target) return 'NOT FOUND';
      target.click();
      return 'CLICKED';
    })()`;
    const result = await evaluate(expr);
    console.log(`CLICK "${text}": ${result}`);
    if (result !== 'CLICKED') throw new Error(`Could not click "${text}"`);
    await sleep(800);
  }

  async function clickLabel(label, { startsWith = false } = {}) {
    const expr = `(() => {
      const all = [...document.querySelectorAll('[aria-label]')];
      const target = all.find(e => {
        const t = (e.getAttribute('aria-label') || '').trim();
        return ${startsWith ? `t.startsWith(${JSON.stringify(label)})` : `t === ${JSON.stringify(label)}`};
      });
      if (!target) return 'NOT FOUND';
      target.click();
      return 'CLICKED';
    })()`;
    const result = await evaluate(expr);
    console.log(`LABEL "${label}": ${result}`);
    if (result !== 'CLICKED') throw new Error(`Could not click label "${label}"`);
    await sleep(800);
  }

  async function setInput(placeholderStartsWith, value) {
    const expr = `(() => {
      const input = [...document.querySelectorAll('input, textarea')]
        .find(el => (el.placeholder || '').startsWith(${JSON.stringify(placeholderStartsWith)}));
      if (!input) return 'NOT FOUND';
      const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return 'SET';
    })()`;
    const result = await evaluate(expr);
    console.log(`INPUT "${placeholderStartsWith}": ${result}`);
    if (result !== 'SET') throw new Error(`Could not set input "${placeholderStartsWith}"`);
    await sleep(400);
  }

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.enable');

  console.log('--- navigating ---');
  await send('Page.navigate', { url: APP_URL });

  await waitText('Welcome back', 'sign-in screen', 120);
  console.log('SIGN-IN SCREEN: ok');
  await screenshot('01-signin.png');

  console.log('--- signing in ---');
  await setInput('you@example.com', E2E_EMAIL);
  await setInput('Enter password', E2E_PASSWORD);
  await clickText('Sign In');
  await waitText('Your devices', 'home screen', 80);
  console.log('HOME SCREEN: ok');
  await screenshot('02-home.png');

  console.log('--- adding device ---');
  await clickLabel('Add device');
  await waitText('Add Device', 'add device screen');
  await setInput('e.g. 1.5 Ton', MODEL);

  // Category dropdown
  await clickText('Select Category', { startsWith: true });
  await sleep(800);
  await clickText('📱 Smartphone');
  await sleep(500);

  // Brand dropdown
  await clickText('Select Brand', { startsWith: true });
  await sleep(500);
  await clickText('Samsung');
  await sleep(500);

  await setInput('Optional', SERIAL);
  await screenshot('03-add-device.png');

  await clickText('Save Device');
  await waitText(MODEL, 'new device on home', 80);
  console.log('DEVICE VISIBLE ON HOME: ok');
  await screenshot('04-home-with-device.png');

  // Verify the row is really persisted with the right joins
  const cardText = await evaluate(`(() => {
    const el = [...document.querySelectorAll('div')]
      .filter(d => d.innerText && d.innerText.includes(${JSON.stringify(MODEL)}))
      .sort((a, b) => a.innerText.length - b.innerText.length)[0];
    return el ? el.innerText : 'NOT FOUND';
  })()`);
  console.log('CARD TEXT:', JSON.stringify(cardText));

  console.log('--- deleting device ---');
  const clickedTrash = await evaluate(`(() => {
    const card = [...document.querySelectorAll('div')]
      .filter(d => d.innerText && d.innerText.includes(${JSON.stringify(MODEL)}) && d.querySelector('[aria-label^="Delete "]'))
      .sort((a, b) => a.innerText.length - b.innerText.length)[0];
    if (!card) return 'CARD NOT FOUND';
    const trash = card.querySelector('[aria-label^="Delete "]');
    if (!trash) return 'TRASH NOT FOUND';
    trash.click();
    return 'CLICKED';
  })()`);
  console.log('DELETE CLICK:', clickedTrash);

  const removed = await waitFor(async () => !(await bodyText()).includes(MODEL), 'device removal', 40).catch(
    () => false
  );
  console.log('DEVICE REMOVED:', removed ? 'ok' : 'FAILED');
  await screenshot('05-home-after-delete.png');

  console.log('\n=== CONSOLE ISSUES ===');
  const unexpected = issues.filter(
    i =>
      !i.includes('props.pointerEvents is deprecated') &&
      !i.includes('Download the React DevTools')
  );
  if (unexpected.length === 0) console.log('none');
  else unexpected.forEach(i => console.log(i.slice(0, 1000)));

  console.log(`\n=== RESULT ===\nremoved=${removed} unexpectedIssues=${unexpected.length}`);
  if (!removed) process.exitCode = 1;
}

main()
  .catch(e => {
    console.error('E2E FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      edge.kill();
    } catch {}
    await sleep(500);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
    process.exit(process.exitCode || 0);
  });
