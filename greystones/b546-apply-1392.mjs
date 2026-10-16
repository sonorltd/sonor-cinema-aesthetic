#!/usr/bin/env node
// b546-apply-1392.mjs — put the APPROVED Greystones (1392) render canon into the apps' own data (B-546, 2026-10-16).
// Drives the hosted Cinema Design + its embedded Cinema Takeoff headlessly (cdp.mjs — no npm packages) and saves through
// THEIR save paths (CD scheduleSave/flushSaveImmediate, CT saveState → autosave) — the same writes a person makes in the UI.
// Values = v6 OBJECT CANON as confirmed by Bryn: U-sofa silver-grey fabric, 3.2 × 1.8 m screen @ 500, flat ceiling, no stars,
// projector on the rear wall on the screen centreline ("always centre line of screen"), partition opening to the games room,
// no cinema door.
//   node b546-apply-1392.mjs [--pid a76fc4c2-3253-4ce7-9bf6-55ec2d34e666] [--chrome /path] [--dry]
import { launch } from './cdp.mjs';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PID = opt('pid', 'a76fc4c2-3253-4ce7-9bf6-55ec2d34e666');
const APP = 'https://sonorltd.github.io/sonor-cinema/dashboard/sonor-cinema.html';
const DRY = argv.includes('--dry');

const CANON = {
  screen: { w: 3200, h: 1800, bottomFromFloor: 500 },
  // rear wall, just below the 2700 ceiling, centred on the screen centreline (x = 2000 of 4000)
  projector: { enabled: true, x: 2000, y: 5850, z: 2450, throwMm: 5850, throwRatio: 1.83 },
  // partition passage on the LEFT wall (cinema↔games), centred on the 6000 wall; CT left-wall x: 0 = rear end (v1.1.0). 2400 wide assumed — Bryn to confirm.
  opening: { type: 'opening', layer: 'openings', wall: 'left', x: 1800, y: 0, w: 2400, h: 2300 },
  seating: { seatType: 'sofa-u', seatRows: 1, seatColour: 'silver-grey', seatMaterial: 'fabric', SEAT: { count: 5, totalW: 3200, depth: 900, seatH: 450, eyeH: 1050, recline: 0, perW: 640 } },
};
const CT = /\/ct\/index\.html/;

const browser = await launch({ chrome: opt('chrome', '') });
try {
  const page = await browser.page(null, { viewport: { width: 1600, height: 1000 } });
  page.onConsole = (t) => { if (/save|flush|switchProject|error|CAS/i.test(t) && !/GoTrue/.test(t)) console.log('  [page]', t.slice(0, 160)); };
  await page.goto(`${APP}?pid=${PID}`);
  await page.waitFor(`(function(){ try { var p = window.SonorProjectBar && SonorProjectBar.getProject(); return !!(p && p.ref && typeof currentDesignId !== 'undefined' && currentDesignId); } catch (_) { return false; } })()`, { timeout: 120000 });
  // the embedded Takeoff: `const CD` is lexical in the iframe realm — evaluate INSIDE that frame
  await page.waitFor(`(function(){ try { return !!(CD && CD.STATE && CD.DB && CD.DB.currentProjectId); } catch (_) { return false; } })()`, { frame: CT, timeout: 120000 });
  await page.sleep(3000);

  const cdBefore = await page.eval(`({ ref: SonorProjectBar.getProject().ref, design: currentDesignId, dv: window.__cdDesignVersion, seatType, seatRows })`);
  const ctBefore = await page.eval(`({ pid: CD.DB.currentProjectId, screen: CD.STATE.metadata && CD.STATE.metadata.screen, projector: CD.STATE.projector, rear: (CD.STATE.placements.rear || []).filter(e => e.layer === 'openings'), left: (CD.STATE.placements.left || []).filter(e => e.layer === 'openings') })`, { frame: CT });
  console.log('before:', JSON.stringify({ ...cdBefore, ...ctBefore }));
  if (DRY) process.exit(0);

  const cdAfter = await page.eval(`async function (C) {
    seatType = C.seating.seatType; seatRows = C.seating.seatRows; seatColour = C.seating.seatColour; seatMaterial = C.seating.seatMaterial;
    Object.assign(SEAT, C.seating.SEAT);
    try { starConfig.areaW = 0; starConfig.areaD = 0; } catch (_) {}
    scheduleSave(); await flushSaveImmediate();
    return { seatType, seatRows, seatColour, seatMaterial, SEAT };
  }`, { arg: CANON });
  const ctAfter = await page.eval(`async function (C) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); } };
    set('slScreen', 'custom'); set('slScrW', C.screen.w); set('slScrH', C.screen.h); set('slScrBot', C.screen.bottomFromFloor);
    CD.STATE.metadata = CD.STATE.metadata || {}; CD.STATE.metadata.screen = Object.assign({}, C.screen);
    CD.STATE.projector = Object.assign({}, C.projector);
    CD.STATE.riser = null;
    CD.STATE.placements.rear = (CD.STATE.placements.rear || []).filter(e => e.layer !== 'openings');
    CD.STATE.placements.left = (CD.STATE.placements.left || []).filter(e => e.layer !== 'openings').concat([Object.assign({ id: 'b546-opening-' + Date.now() }, C.opening)]);
    if (CD.STATE.coffer) CD.STATE.coffer.enabled = false;
    try { if (typeof SL !== 'undefined' && SL && typeof SL.recalc === 'function') SL.recalc(); } catch (_) {}
    CD.saveState();
    await CD.DB._flushToSupabase(true);
    await new Promise(r => setTimeout(r, 1500));
    return { screen: CD.STATE.metadata.screen, projector: CD.STATE.projector, rear: CD.STATE.placements.rear.filter(e => e.layer === 'openings'), left: CD.STATE.placements.left.filter(e => e.layer === 'openings') };
  }`, { frame: CT, arg: CANON });
  console.log('after :', JSON.stringify({ ...cdAfter, ...ctAfter }));
  await page.sleep(2000);
  console.log('✓ B-546 values written through the apps for', cdBefore.ref);
} finally { await browser.close(); }
