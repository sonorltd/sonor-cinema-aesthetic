#!/usr/bin/env node
// lab-renders-ingest.mjs — put the lab's finished renders (GPT, method v1) into the app: Supabase bucket `seating-assets`
// + projects.metadata.design_renders[] through Cinema Design's OWN Renders tab code (SonorCdRenders.upload / setHero),
// driven headlessly (cdp.mjs). Runs on the Mac (Supabase writes are refused from the cloud session). B-564.
//
//   node lab-renders-ingest.mjs --pid <project uuid> --dir "<LAB - Seam>/_from-drive/review/1392/r5" [--set "lab r5"] [--cover 07-cover] [--dry]
//
// • every *.png / *.jpg in --dir goes up (names without "--gpt"/"--nb" suffix = the primary set; others skipped unless --all)
// • the file whose name contains --cover (default "cover") is marked ★ Cover (design_renders[].hero = true → the spec PDF cover)
// • the cover is upscaled 2× on a canvas before upload (GPT's tool tops out ~1055×1491; the PDF cover wants ≥ 1240×1754) — labelled in the caption
// • already-ingested files (same set label + caption) are skipped, so re-runs are safe
import fs from 'node:fs'; import path from 'node:path'; import { launch } from './cdp.mjs';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PID = opt('pid', ''), DIR = path.resolve(opt('dir', '')), SET = opt('set', 'lab ' + path.basename(DIR)), COVER = opt('cover', 'cover').toLowerCase();
const DRY = argv.includes('--dry'), ALL = argv.includes('--all');
const APP = 'https://sonorltd.github.io/sonor-cinema/dashboard/sonor-cinema.html';
if (!PID || !DIR) { console.error('--pid and --dir required'); process.exit(2); }
const files = fs.readdirSync(DIR).filter(n => /\.(png|jpe?g)$/i.test(n) && (ALL || !/--(gpt|nb)\./i.test(n)) && !/plan-styled/i.test(n)).sort();
if (!files.length) { console.error('no renders in', DIR); process.exit(2); }
console.log('renders:', files.join(', '));
const browser = await launch({ chrome: opt('chrome', '') });
try {
  const page = await browser.page(null, { viewport: { width: 1600, height: 1000 } });
  page.onConsole = t => { if (/render|upload|error/i.test(t) && !/GoTrue/.test(t)) console.log('  [page]', t.slice(0, 160)); };
  await page.goto(`${APP}?pid=${PID}`);
  await page.waitFor(`(function(){ try { var p = SonorProjectBar.getProject(); return !!(p && p.ref && window.SonorCdRenders && typeof currentProjectId !== 'undefined' && currentProjectId); } catch (_) { return false; } })()`, { timeout: 120000 });
  await page.sleep(2500);
  const before = await page.eval(`(async function(){ var l = await SonorCdRenders.load(); return { ref: SonorProjectBar.getProject().ref, n: l.length, existing: l.map(function (r) { return (r.set || '') + '|' + (r.caption || ''); }) }; })()`);
  console.log('before:', before.ref, before.n, 'renders in the gallery');
  const payload = files.map(n => ({ name: n, b64: fs.readFileSync(path.join(DIR, n)).toString('base64'), isCover: n.toLowerCase().includes(COVER) }));
  if (DRY) { console.log('dry run — would upload', payload.length, 'files; cover =', payload.filter(p => p.isCover).map(p => p.name)); process.exit(0); }
  const result = await page.eval(`async function (a) {
    const list0 = await SonorCdRenders.load(); const have = new Set(list0.map(r => (r.set || '') + '|' + (r.caption || '')));
    const caption = n => n.replace(/\\.[a-z0-9]+$/i, '').replace(/^\\d+-/, '').replace(/-/g, ' ');
    const toFile = async (p) => {
      const bin = atob(p.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      let blob = new Blob([u8], { type: 'image/png' });
      if (p.isCover) { // 2× canvas upscale so the A4 cover is not soft in print
        const im = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = im.width * 2; c.height = im.height * 2;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
        blob = await new Promise(r => c.toBlob(r, 'image/png'));
      }
      return new File([blob], p.name, { type: 'image/png' });
    };
    const todo = a.files.filter(p => !have.has(a.set + '|' + caption(p.name)));
    const fl = []; for (const p of todo) fl.push(await toFile(p));
    if (fl.length) await SonorCdRenders.upload(fl, a.set);
    const list = await SonorCdRenders.load();
    const ci = list.findIndex(r => (r.set || '') === a.set && /cover/i.test(r.caption || ''));
    if (ci >= 0 && !list[ci].hero) await SonorCdRenders.setHero(ci);
    const final = await SonorCdRenders.load();
    return { uploaded: fl.map(f => f.name), skipped: a.files.length - fl.length, total: final.length, hero: (final.find(r => r.hero) || {}).url || null };
  }`, { arg: { files: payload, set: SET } });
  console.log('after :', JSON.stringify(result, null, 1));
  console.log('✓ lab renders ingested for', before.ref, '— set "' + SET + '"; ★ Cover =', result.hero ? 'set' : 'NOT set (no file matched "' + COVER + '")');
} finally { await browser.close(); }
