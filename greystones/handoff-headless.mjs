#!/usr/bin/env node
// handoff-headless.mjs — build a Cinema Design render handoff package with NO clicks (B-542, 2026-10-14).
//
// Opens the hosted Cinema Design on a project (?pid=<uuid>) in headless Chromium, waits for the design +
// Cinema Takeoff state to load, runs SonorCdRenderHandoff.build() — the SAME code path as the 📦 Handoff
// pill — and writes the package to <out>/hN/. hN = next free revision in <out> (append-only).
//
//   node handoff-headless.mjs --pid <project uuid> --out "<…>/greystones/handoff" [--module path/to/28-render-handoff.js]
//     [--app https://sonorltd.github.io/sonor-cinema/dashboard/sonor-cinema.html] [--facts "retained: …;removed: …"]
//     [--chrome /path/to/chrome]
//
// --module injects a local copy of the module AFTER the page loads (lets a newer module run against the
// deployed app; the IIFE re-registers window.SonorCdRenderHandoff). Omit to use the deployed module.
// Needs: node 18+, playwright (`npm i playwright` next to this file — on the Mac it drives the installed Google Chrome,
// no browser download). Cloud container: --chrome /opt/pw-browsers/chromium.
// Mac one-liner (Greystones):  cd "$HOME/Code/Sonor/APP - Cinema Aesthetic/greystones" && node handoff-headless.mjs --pid a76fc4c2-3253-4ce7-9bf6-55ec2d34e666 --out ./handoff
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PID = opt('pid', ''), OUT = path.resolve(opt('out', './handoff')), MODULE = opt('module', ''), FACTS = opt('facts', '');
const APP = opt('app', 'https://sonorltd.github.io/sonor-cinema/dashboard/sonor-cinema.html');
const CHROME = opt('chrome', process.env.CHROME || '');
if (!PID) { console.error('--pid <project uuid> required'); process.exit(2); }

fs.mkdirSync(OUT, { recursive: true });
const existing = fs.readdirSync(OUT).filter(n => /^h\d+$/.test(n)).map(n => Number(n.slice(1)));
const hN = 'h' + ((existing.length ? Math.max(...existing) : 0) + 1);

const launch = { args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], ignoreDefaultArgs: ['--headless=old'] };
if (CHROME) launch.executablePath = CHROME; else if (process.platform === 'darwin') launch.channel = 'chrome'; // Mac: use installed Google Chrome, no browser download
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const log = [];
page.on('console', m => { const t = m.text(); log.push(t); if (/handoff|switchProject|SonorCT|error/i.test(t)) console.log('  [page]', t.slice(0, 160)); });
page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 200)));

console.log(`▶ ${APP}?pid=${PID}`);
await page.goto(`${APP}?pid=${PID}`, { waitUntil: 'load', timeout: 90000 });
// wait for the design row + a live CT state for THIS project
await page.waitForFunction(() => {
  try {
    const p = window.SonorProjectBar && SonorProjectBar.getProject();
    const ct = window.SonorCT && typeof SonorCT.getState === 'function' ? SonorCT.getState() : null;
    return !!(p && p.ref && ct && ct.room && typeof currentDesignId !== 'undefined' && currentDesignId);
  } catch (_) { return false; }
}, null, { timeout: 120000 });
await page.waitForTimeout(2500); // let the embedded Takeoff settle (iframe render + setProject)
if (MODULE) { await page.addScriptTag({ content: fs.readFileSync(path.resolve(MODULE), 'utf8') }); console.log('  injected', path.basename(MODULE)); }

const facts = FACTS ? FACTS.split(';').map(s => s.trim()).filter(Boolean) : [];
const result = await page.evaluate(async ({ facts, hN }) => {
  const H = window.SonorCdRenderHandoff;
  if (!H || !H.build) throw new Error('SonorCdRenderHandoff.build missing — module too old');
  const pkg = await H.build(facts, hN);
  const files = [];
  for (const f of pkg.files) {
    const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(f.blob); });
    files.push({ path: f.path, b64 });
  }
  return { pn: pkg.pn, files, design: pkg.spec.design_revision, ref: (SonorProjectBar.getProject() || {}).ref };
}, { facts, hN });
await browser.close();

const dir = path.join(OUT, hN);
for (const f of result.files) {
  const fp = path.join(dir, f.path); fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, Buffer.from(f.b64, 'base64'));
}
console.log(`✓ ${result.pn} ${hN} — ${result.files.length} files → ${dir}  (design v${result.design.design_version} / CT v${result.design.ct_version})`);
