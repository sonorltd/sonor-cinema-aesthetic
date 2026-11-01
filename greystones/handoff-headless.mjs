#!/usr/bin/env node
// handoff-headless.mjs — build a Cinema Design render handoff package with NO clicks and NO npm packages (B-542).
//
// Opens the hosted Cinema Design on a project (?pid=<uuid>) in headless Chrome (via cdp.mjs — Chrome DevTools Protocol,
// zero dependencies), waits for the design + Cinema Takeoff state, runs SonorCdRenderHandoff.build() — the SAME code
// path as the 📦 Handoff pill — and writes the package to <out>/hN/. hN = next free revision in <out> (append-only).
//
//   node handoff-headless.mjs --pid <project uuid> --out "<…>/greystones/handoff" [--module path/to/28-render-handoff.js]
//     [--app https://apps.sonor.co.uk/sonor-cinema/dashboard/sonor-cinema.html] [--facts "retained: …;removed: …"] [--rev h4]
//     [--chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
//
// --module injects a local copy of the module AFTER the page loads (a newer module against the deployed app).
// Mac one-liner (Greystones):
//   cd "$HOME/Code/Sonor/APP - Cinema Aesthetic/greystones" && node handoff-headless.mjs --pid a76fc4c2-3253-4ce7-9bf6-55ec2d34e666 --out ./handoff
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PID = opt('pid', ''), OUT = path.resolve(opt('out', './handoff')), MODULE = opt('module', ''), FACTS = opt('facts', '');
const APP = opt('app', 'https://apps.sonor.co.uk/sonor-cinema/dashboard/sonor-cinema.html');
if (!PID) { console.error('--pid <project uuid> required'); process.exit(2); }

fs.mkdirSync(OUT, { recursive: true });
const existing = fs.readdirSync(OUT).filter(n => /^h\d+$/.test(n)).map(n => Number(n.slice(1)));
const hN = opt('rev', '') || ('h' + ((existing.length ? Math.max(...existing) : 0) + 1)); // --rev h4 when building away from the project folder

const browser = await launch({ chrome: opt('chrome', '') });
try {
  const page = await browser.page(null, { viewport: { width: 1600, height: 1000 } });
  page.onConsole = (t) => { if (/handoff|switchProject|error/i.test(t)) console.log('  [page]', t.slice(0, 160)); };
  console.log(`▶ ${APP}?pid=${PID}`);
  await page.goto(`${APP}?pid=${PID}`);
  await page.waitFor(`(function(){ try { var p = window.SonorProjectBar && SonorProjectBar.getProject(); var ct = window.SonorCT && typeof SonorCT.getState === 'function' ? SonorCT.getState() : null; return !!(p && p.ref && ct && ct.room && typeof currentDesignId !== 'undefined' && currentDesignId); } catch (_) { return false; } })()`, { timeout: 120000 });
  await page.sleep(2500);
  if (MODULE) { await page.eval(fs.readFileSync(path.resolve(MODULE), 'utf8')); console.log('  injected', path.basename(MODULE)); }

  const facts = FACTS ? FACTS.split(';').map(s => s.trim()).filter(Boolean) : [];
  const result = await page.eval(`async function (a) {
    const H = window.SonorCdRenderHandoff;
    if (!H || !H.build) throw new Error('SonorCdRenderHandoff.build missing — deployed app too old');
    const pkg = await H.build(a.facts, a.hN);
    const files = [];
    for (const f of pkg.files) {
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(f.blob); });
      files.push({ path: f.path, b64 });
    }
    return { pn: pkg.pn, files, design: pkg.spec.design_revision, ref: (SonorProjectBar.getProject() || {}).ref };
  }`, { arg: { facts, hN } });

  const dir = path.join(OUT, hN);
  for (const f of result.files) { const fp = path.join(dir, f.path); fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, Buffer.from(f.b64, 'base64')); }
  console.log(`✓ ${result.pn} ${hN} — ${result.files.length} files → ${dir}  (design v${result.design.design_version} / CT v${result.design.ct_version})`);
} finally { await browser.close(); }
