#!/usr/bin/env node
// b546-apply-1392.mjs — put the APPROVED Greystones (1392) render canon into the apps' own data (B-546, 2026-10-16).
// Drives the hosted Cinema Design + its embedded Cinema Takeoff headlessly and saves through THEIR save paths
// (CD scheduleSave/flushSaveImmediate, CT saveState → autosave) — the same writes a person makes in the UI.
// Values = v6 OBJECT CANON as confirmed by Bryn (U-sofa silver-grey, 3.2 × 1.8 m screen @ 500, flat ceiling, no stars,
// projector on the rear wall on the screen centreline, partition opening to the games room, no cinema door).
//   node b546-apply-1392.mjs [--pid a76fc4c2-3253-4ce7-9bf6-55ec2d34e666] [--chrome /path] [--dry]
import { chromium } from 'playwright';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PID = opt('pid', 'a76fc4c2-3253-4ce7-9bf6-55ec2d34e666');
const APP = 'https://sonorltd.github.io/sonor-cinema/dashboard/sonor-cinema.html';
const DRY = argv.includes('--dry');
const CHROME = opt('chrome', process.env.CHROME || '');

const CANON = {
  screen: { w: 3200, h: 1800, bottomFromFloor: 500 },
  // rear wall, just below the 2700 ceiling, centred on the screen centreline (x = 2000 of 4000). Bryn 2026-10-16: "always centre line of screen".
  projector: { enabled: true, x: 2000, y: 5850, z: 2450, throwMm: 5850, throwRatio: 1.83 },
  // partition passage on the LEFT wall (cinema↔games), centred along the 6000 wall; CT left-wall x: 0 = rear end (v1.1.0). 2400 wide assumed — Bryn to confirm.
  opening: { type: 'opening', layer: 'openings', x: 1800, y: 0, w: 2400, h: 2300 },
  seating: { seatType: 'sofa-u', seatRows: 1, seatColour: 'silver-grey', seatMaterial: 'fabric', SEAT: { count: 5, totalW: 3200, depth: 900, seatH: 450, eyeH: 1050, recline: 0, perW: 640 } },
};

const launch = { args: ['--headless=new'], ignoreDefaultArgs: ['--headless=old'] };
if (CHROME) launch.executablePath = CHROME; else if (process.platform === 'darwin') launch.channel = 'chrome';
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('console', m => { const t = m.text(); if (/save|flush|switchProject|error|CAS|design_version/i.test(t)) console.log('  [page]', t.slice(0, 180)); });
await page.goto(`${APP}?pid=${PID}`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => { try { const p = window.SonorProjectBar && SonorProjectBar.getProject(); return !!(p && p.ref && typeof currentDesignId !== 'undefined' && currentDesignId); } catch (_) { return false; } }, null, { timeout: 120000 });
// the embedded Takeoff: `const CD` is lexical in the iframe realm, so evaluate INSIDE that frame
const ctFrame = () => page.frames().find(f => /\/ct\/index\.html/.test(f.url()));
await page.waitForFunction(() => !!document.getElementById('takeoff-iframe'), null, { timeout: 60000 });
let fr; for (let i = 0; i < 60 && !fr; i++) { fr = ctFrame(); if (!fr) await page.waitForTimeout(1000); }
if (!fr) throw new Error('Takeoff iframe not found');
await fr.waitForFunction(() => { try { return !!(CD && CD.STATE && CD.DB && CD.DB.currentProjectId); } catch (_) { return false; } }, null, { timeout: 120000 });
await page.waitForTimeout(3000);

const cdBefore = await page.evaluate(() => ({ ref: SonorProjectBar.getProject().ref, design: currentDesignId, dv: window.__cdDesignVersion, seatType, seatRows }));
const ctBefore = await fr.evaluate(() => ({ pid: CD.DB.currentProjectId, screen: CD.STATE.metadata && CD.STATE.metadata.screen, projector: CD.STATE.projector, rear: (CD.STATE.placements.rear || []).filter(e => e.layer === 'openings'), left: (CD.STATE.placements.left || []).filter(e => e.layer === 'openings') }));
console.log('before:', JSON.stringify({ ...cdBefore, ...ctBefore }));
if (DRY) { await browser.close(); process.exit(0); }

const cdAfter = await page.evaluate(async (C) => {
  seatType = C.seating.seatType; seatRows = C.seating.seatRows; seatColour = C.seating.seatColour; seatMaterial = C.seating.seatMaterial;
  Object.assign(SEAT, C.seating.SEAT);
  try { starConfig.areaW = 0; starConfig.areaD = 0; } catch (_) {}
  scheduleSave(); await flushSaveImmediate();
  return { seatType, seatRows, seatColour, seatMaterial, SEAT };
}, CANON);
const after = await fr.evaluate(async (C) => {
  const w = window, D = document;
  const set = (id, v) => { const el = D.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); } };
  set('slScreen', 'custom'); set('slScrW', C.screen.w); set('slScrH', C.screen.h); set('slScrBot', C.screen.bottomFromFloor);
  CD.STATE.metadata = CD.STATE.metadata || {}; CD.STATE.metadata.screen = Object.assign({}, C.screen);
  CD.STATE.projector = Object.assign({}, C.projector);
  CD.STATE.riser = null;
  CD.STATE.placements.rear = (CD.STATE.placements.rear || []).filter(e => e.layer !== 'openings');          // no cinema rear door
  CD.STATE.placements.left = (CD.STATE.placements.left || []).filter(e => e.layer !== 'openings').concat([Object.assign({ id: 'b546-opening-' + Date.now() }, C.opening)]);
  if (CD.STATE.coffer) CD.STATE.coffer.enabled = false;
  try { if (typeof SL !== 'undefined' && SL && typeof SL.recalc === 'function') SL.recalc(); } catch (_) {}
  CD.saveState();
  await CD.DB._flushToSupabase(true);
  await new Promise(r => setTimeout(r, 1500));
  return { screen: CD.STATE.metadata.screen, projector: CD.STATE.projector, rear: CD.STATE.placements.rear.filter(e => e.layer === 'openings'), left: CD.STATE.placements.left.filter(e => e.layer === 'openings') };
}, CANON);
console.log('after :', JSON.stringify({ ...cdAfter, ...after }));
await page.waitForTimeout(2000);
await browser.close();
console.log('✓ B-546 values written through the apps for', before.ref);
