// cdp.mjs — zero-dependency headless Chrome driver (Chrome DevTools Protocol over Node's built-in WebSocket).
// Why: npm on the Mac is behind a TLS-intercepting proxy (UNABLE_TO_GET_ISSUER_CERT_LOCALLY), so Playwright can't be
// installed there. Chrome is already installed; Node 22 has WebSocket. This gives the three things the handoff tools need:
// open a page, evaluate JS in the page or in a named iframe (own realm — sees top-level `const`/`let`), wait for a condition.
//   import { launch } from './cdp.mjs';
//   const b = await launch({ chrome }); const p = await b.page(url); await p.waitFor('typeof X!=="undefined"'); await p.eval('1+1'); await b.close();
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATHS = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
  linux: ['/opt/pw-browsers/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'],
};
export function findChrome(explicit) {
  const c = [explicit, process.env.CHROME].filter(Boolean).concat(CHROME_PATHS[process.platform] || []);
  for (const p of c) { try { if (p && fs.statSync(p).isFile()) return p; } catch (_) {} }
  throw new Error('Chrome not found — pass --chrome /path/to/chrome');
}

export async function launch({ chrome, port = 0, args = [] } = {}) {
  const bin = findChrome(chrome);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sonor-cdp-'));
  port = port || 9222 + Math.floor(Math.random() * 500);
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : []), '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1600,1000', ...args, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  let errlog = ''; proc.stderr.on('data', d => { errlog += d; });
  // wait for the devtools endpoint
  let version = null;
  for (let i = 0; i < 100 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch (_) { await new Promise(r => setTimeout(r, 200)); }
  }
  if (!version) { proc.kill(); throw new Error('Chrome did not expose DevTools on :' + port + '\n' + errlog.slice(-800)); }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const browser = new Connection(ws);
  return {
    async page(url, { viewport } = {}) {
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
      const p = new Page(browser, sessionId, targetId);
      await p.init();
      if (viewport) await p.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
      if (url) await p.goto(url);
      return p;
    },
    async close() { try { await browser.send('Browser.close'); } catch (_) {} try { proc.kill(); } catch (_) {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {} },
  };
}

class Connection {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message + (m.error.data ? ' ' + m.error.data : ''))) : res(m.result); }
      else if (m.method) { const key = (m.sessionId || '') + ':' + m.method; (this.listeners.get(key) || []).forEach(fn => fn(m.params)); (this.listeners.get(m.sessionId + ':*') || []).forEach(fn => fn(m)); } }; }
  send(method, params = {}, sessionId) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
  on(sessionId, method, fn) { const key = (sessionId || '') + ':' + method; if (!this.listeners.has(key)) this.listeners.set(key, []); this.listeners.get(key).push(fn); }
}

class Page {
  constructor(conn, sessionId, targetId) { this.c = conn; this.sid = sessionId; this.targetId = targetId; this.contexts = []; this.frames = new Map(); this.console = []; }
  send(m, p) { return this.c.send(m, p, this.sid); }
  async init() {
    this.c.on(this.sid, 'Runtime.executionContextCreated', ({ context }) => { this.contexts.push(context); });
    this.c.on(this.sid, 'Runtime.executionContextDestroyed', ({ executionContextId }) => { this.contexts = this.contexts.filter(c => c.id !== executionContextId); });
    this.c.on(this.sid, 'Runtime.executionContextsCleared', () => { this.contexts = []; });
    this.c.on(this.sid, 'Page.frameNavigated', ({ frame }) => { this.frames.set(frame.id, frame); });
    this.c.on(this.sid, 'Runtime.consoleAPICalled', (e) => { const t = (e.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' '); this.console.push(t); if (this.onConsole) this.onConsole(t); });
    await this.send('Page.enable'); await this.send('Runtime.enable');
  }
  async goto(url) { await this.send('Page.navigate', { url }); await this.waitFor('document.readyState === "complete"', { timeout: 90000 }); }
  // context lookup: main frame = the context whose auxData.isDefault && frameId === main; iframe by URL regex
  _ctx(frameUrlRe) {
    if (!frameUrlRe) { const main = [...this.frames.values()].find(f => !f.parentId); const c = this.contexts.filter(c => c.auxData && c.auxData.isDefault && (!main || c.auxData.frameId === main.id)); return c[c.length - 1]; }
    const fr = [...this.frames.values()].find(f => frameUrlRe.test(f.url || ''));
    if (!fr) return null;
    const c = this.contexts.filter(c => c.auxData && c.auxData.isDefault && c.auxData.frameId === fr.id); return c[c.length - 1];
  }
  async eval(expr, { frame, arg } = {}) {
    const ctx = this._ctx(frame);
    if (!ctx) throw new Error('no execution context for ' + (frame || 'main frame'));
    const expression = arg === undefined ? expr : `(${expr})(${JSON.stringify(arg)})`;
    const r = await this.send('Runtime.evaluate', { expression, contextId: ctx.id, awaitPromise: true, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async waitFor(expr, { frame, timeout = 60000, interval = 500 } = {}) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (await this.eval(`!!(${expr})`, { frame })) return true; } catch (_) {}
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error('timeout waiting for: ' + expr.slice(0, 120));
  }
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}
