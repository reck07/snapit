/* Headless Edge smoke test: loads the web app and reports console errors/exceptions. */
const { spawn } = require('child_process');
const WebSocket = require('ws');
const os = require('os');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const userDataDir = path.join(os.tmpdir(), `snapit-edge-${Date.now()}`);

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
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, label, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  await waitFor(async () => {
    const r = await fetch(APP_URL);
    return r.ok;
  }, 'Metro server');

  const target = await waitFor(async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const list = await r.json();
    return list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  }, 'Edge target');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const events = [];

  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      events.push(msg);
    }
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const send = (method, params = {}) =>
    new Promise(resolve => {
      const msgId = ++id;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: APP_URL });
  await sleep(20000);

  if (process.env.CLICK_TEXT) {
    const clickResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const els = [...document.querySelectorAll('[role="button"], button, [tabindex]')];
        const target = els.find(e => (e.innerText || '').trim() === ${JSON.stringify(
          process.env.CLICK_TEXT
        )});
        if (!target) return 'NOT FOUND';
        target.click();
        return 'CLICKED';
      })()`,
      returnByValue: true,
    });
    console.log(`=== CLICK "${process.env.CLICK_TEXT}" ===`);
    console.log(clickResult.result?.result?.value);
    await sleep(6000);
  }

  const body = await send('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true,
  });

  console.log('=== PAGE TEXT ===');
  console.log((body.result?.result?.value || '(empty)').slice(0, 2500));

  const issues = [];
  for (const e of events) {
    if (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type)) {
      const text = e.params.args
        .map(a => a.value ?? a.description ?? a.preview?.description ?? '')
        .join(' ');
      issues.push(`[console.${e.params.type}] ${text}`);
    }
    if (e.method === 'Runtime.exceptionThrown') {
      const d = e.params.exceptionDetails;
      issues.push(`[exception] ${d?.text} ${d?.exception?.description || ''}`);
    }
    if (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)) {
      issues.push(`[log.${e.params.entry.level}] ${e.params.entry.text}`);
    }
    if (e.method === 'Network.loadingFailed') {
      issues.push(`[network] ${e.params.errorText} ${e.params.blockedReason || ''}`);
    }
  }

  console.log('\n=== CONSOLE ISSUES ===');
  if (issues.length === 0) {
    console.log('none');
  } else {
    const seen = new Set();
    for (const issue of issues) {
      if (seen.has(issue)) continue;
      seen.add(issue);
      console.log(issue.slice(0, 1200));
    }
  }

  const fatal = issues.filter(i => i.includes('Unexpected text node') || i.includes('[exception]'));
  console.log(`\n=== RESULT ===\nissues=${issues.length} fatal=${fatal.length}`);

  ws.close();
}

main()
  .catch(e => {
    console.error('SMOKE FAILED:', e.message);
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
