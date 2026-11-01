#!/usr/bin/env node
// h5-apply-1392.mjs — put the rules-v1 ceiling (exchange 010, Bryn 2026-10-16 "defaults") into the Greystones 1392 Takeoff data.
// Drives the hosted Cinema Design + embedded Takeoff headlessly (cdp.mjs) and saves through the apps' own save paths — same as b546-apply-1392.mjs.
// Values = Takeoff coffer DEFAULTS, flagged `assumed` in the export: band 600 all round, drop 300, concealed LED cove at the inner
// reveal, 2 recessed spots per side (front band included — confirm), NO stars; projector tight under the rear band on the screen
// centreline: y 5700 (middle of the 600 rear band), lens z 2250 (= 2700 − 300 drop − 150 unit/bracket, assumed until the model is chosen).
//   node h5-apply-1392.mjs [--pid a76fc4c2-3253-4ce7-9bf6-55ec2d34e666] [--chrome /path] [--dry]
import { launch } from './cdp.mjs';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PID = opt('pid', 'a76fc4c2-3253-4ce7-9bf6-55ec2d34e666');
const APP = 'https://apps.sonor.co.uk/sonor-cinema/dashboard/sonor-cinema.html';
const DRY = argv.includes('--dry');
const CANON = {
  coffer: { enabled: true, ring: { front: 600, rear: 600, left: 600, right: 600 }, dropHeight: 300, ledCove: { enabled: true, powerWPerM: 14 }, starCeiling: false, star: { enabled: false },
            fixtures: { front: { downlights: 2, largeCutouts: 0 }, rear: { downlights: 2, largeCutouts: 0 }, left: { downlights: 2, largeCutouts: 0 }, right: { downlights: 2, largeCutouts: 0 } },
            status: 'assumed — Takeoff planning defaults (Bryn 2026-10-16 "defaults"); confirm drop/band/spots on survey' },
  projector: { enabled: true, x: 2000, y: 5700, z: 2250, throwMm: 5700, throwRatio: 1.78, mount: 'under-rear-bulkhead', status: 'assumed — lens z until the projector model is chosen' },
};
const CT = /\/ct\/index\.html/;
const browser = await launch({ chrome: opt('chrome', '') });
try {
  const page = await browser.page(null, { viewport: { width: 1600, height: 1000 } });
  page.onConsole = (t) => { if (/save|flush|error|CAS/i.test(t) && !/GoTrue/.test(t)) console.log('  [page]', t.slice(0, 160)); };
  await page.goto(`${APP}?pid=${PID}`);
  await page.waitFor(`(function(){ try { var p = window.SonorProjectBar && SonorProjectBar.getProject(); return !!(p && p.ref && typeof currentDesignId !== 'undefined' && currentDesignId); } catch (_) { return false; } })()`, { timeout: 120000 });
  await page.waitFor(`(function(){ try { return !!(CD && CD.STATE && CD.DB && CD.DB.currentProjectId); } catch (_) { return false; } })()`, { frame: CT, timeout: 120000 });
  await page.sleep(3000);
  const before = await page.eval(`({ pid: CD.DB.currentProjectId, coffer: CD.STATE.coffer, projector: CD.STATE.projector })`, { frame: CT });
  console.log('before:', JSON.stringify(before));
  if (DRY) process.exit(0);
  const after = await page.eval(`async function (C) {
    CD.STATE.coffer = Object.assign({}, CD.STATE.coffer || {}, C.coffer, { ring: Object.assign({}, C.coffer.ring), ledCove: Object.assign({}, (CD.STATE.coffer || {}).ledCove || {}, C.coffer.ledCove), star: Object.assign({}, (CD.STATE.coffer || {}).star || {}, C.coffer.star), fixtures: C.coffer.fixtures });
    CD.STATE.projector = Object.assign({}, CD.STATE.projector || {}, C.projector);
    CD.saveState();
    await CD.DB._flushToSupabase(true);
    await new Promise(r => setTimeout(r, 1500));
    return { coffer: CD.STATE.coffer, projector: CD.STATE.projector };
  }`, { frame: CT, arg: CANON });
  console.log('after :', JSON.stringify(after));
  await page.sleep(2000);
  console.log('✓ h5 ceiling + projector written through the Takeoff for 1392');
} finally { await browser.close(); }
