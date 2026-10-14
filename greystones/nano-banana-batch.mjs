#!/usr/bin/env node
// ============================================================================
// nano-banana-batch.mjs — Sonor batch renderer for Nano Banana (Gemini image)
// RUNNER 2.0.0 (2026-10-14, B-542 step 1 — geometry-aware attachment contract)
// ----------------------------------------------------------------------------
// Parses a Sonor render-prompts markdown file (the `nano-banana-prompts-*.md`
// format: STYLE BLOCK section + numbered `## N · TITLE  → slot` sections),
// prepends the style block to every prompt, attaches the reference images in
// a FIXED, LABELLED order, calls the Gemini image-generation API, and saves
// each render to --out.
//
// Zero dependencies — needs Node 18+ (built-in fetch). Runs on the Mac.
//
// USAGE
//   export GEMINI_API_KEY=...            # or put it in ./.env (git-ignored)
//   cd "APP - Cinema Aesthetic/greystones"
//   node nano-banana-batch.mjs --dry-run       # parse + print the attachment plan, no API calls
//   node nano-banana-batch.mjs --only 1,3      # just these prompt numbers
//   node nano-banana-batch.mjs --variants      # also render no-halo siblings
//   node nano-banana-batch.mjs --model gemini-3-pro-image-preview   # NB Pro
//
// TWO MODES
//   LEGACY (no --structref) — as before: [0] style-ref · site photos (where the
//     section asks) · --layoutref (if given) last. No openers are added.
//   GEOMETRY (--structref <dir>) — the B-542 handoff contract (exchange 004/005):
//     [0] --styleref  (hero prompt: site/mood/finish ref · other slots: the APPROVED HERO)
//     [1] <structref>/<slot>/geometry.png   (slot parsed from the heading's `→ slot`)
//     [2…] site photos (only where the section asks; exact copies of [0] omitted)
//     last  --layoutref <file>  (explicit; there is NO implicit runner-side layout)
//     Both [0] and [1] are REQUIRED — missing/unreadable → the run plan stops
//     before any API call. A verbatim opener is prepended per stage (see OPENERS).
//     Every image is preceded by a one-line text label naming its role + path.
//
// FLAGS (all optional unless stated)
//   --file      <md>    prompts file                 (default ./nano-banana-prompts-dark-grey.md)
//   --styleref  <img>   [0] image. LEGACY default "../15 harrop/andy original cinema mood.png";
//                       GEOMETRY mode: REQUIRED, no default.
//   --structref <dir>   geometry dir — <dir>/<slot>/geometry.png  (normally handoff views/)
//   --layoutref <file>  plan image appended LAST (overall adjacency/orientation)
//   --photos    <dir>   site photos folder           (default ./site-photos)
//   --out       <dir>   renders output               (default ./renders)
//   --model     <id>    default gemini-2.5-flash-image (NB Pro = gemini-3-pro-image-preview)
//   --aspect    <r>     default 16:9 (sections saying "portrait" render 3:4)
//   --only      1,3     prompt numbers (also the only way to run DO NOT RE-RENDER canon prompts)
//   --variants          add a `--no-halo` sibling for sections whose body says "halo glowing"
//   --dry-run           print the plan (roles + paths per image) and exit
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUNNER_VERSION = '2.0.0';
const HERE = path.dirname(fileURLToPath(import.meta.url));

// Auto-load a .env sitting next to this script (GEMINI_API_KEY=...). NEVER
// commit the .env — it is git-ignored; this repo deploys to public GitHub Pages.
try {
  const envFile = path.join(HERE, '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* no .env — fall back to exported env */ }

// ---------- args ------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const resolveOpt = (name, dflt) => { const v = opt(name, dflt); return v ? path.resolve(HERE, v) : null; };

const CFG = {
  file: resolveOpt('file', './nano-banana-prompts-dark-grey.md'),
  structref: resolveOpt('structref', null),
  layoutref: resolveOpt('layoutref', null),
  photosDir: resolveOpt('photos', './site-photos'),
  outDir: resolveOpt('out', './renders'),
  model: opt('model', 'gemini-2.5-flash-image'),
  aspect: opt('aspect', '16:9'),
  only: opt('only', '').split(',').map(s => s.trim()).filter(Boolean).map(Number),
  dryRun: flag('dry-run'),
  variants: flag('variants'),
  apiKey: process.env.GEMINI_API_KEY || '',
};
CFG.geometry = !!CFG.structref;
// LEGACY keeps the historic default style-ref; GEOMETRY mode must name it explicitly.
CFG.styleref = resolveOpt('styleref', CFG.geometry ? null : '../15 harrop/andy original cinema mood.png');

// ---------- openers (verbatim — exchange 004 contract, accepted in 005) ------
const OPENERS = {
  hero: 'Use the FIRST image for the retained appearance permitted by the ROOM CANON, and the SECOND for this view\'s camera, geometry, openings and object positions; finish without relocating anything.',
  slot: 'The FIRST image is this room\'s approved hero—match its materials, colours and lighting while preserving the SECOND image\'s camera, geometry, openings and object positions rather than copying the hero\'s viewpoint.',
  noHalo: 'Use the FIRST image for canon appearance and the SECOND for fixed geometry, matching the parent design except that the screen-perimeter halo is OFF with no glow or spill; all other specified lights remain unchanged.',
};
// LEGACY no-halo sibling text (unchanged from 1.x)
const LEGACY_NO_HALO = '\n\nVARIANT: OMIT the LED halo around the screen entirely — plain ' +
  'fabric wall and framed screen only, no glow around the screen edges.';

// ---------- md parsing ------------------------------------------------------
function parsePromptsMd(mdPath) {
  const md = fs.readFileSync(mdPath, 'utf8');
  const sections = md.split(/^## /m).slice(1); // drop preamble
  let styleBlock = null;
  const prompts = [];
  for (const sec of sections) {
    const nl = sec.indexOf('\n');
    const heading = sec.slice(0, nl).trim();
    let body = sec.slice(nl + 1);
    // "### (...)" note lines are directives for the runner, not prompt text
    const notes = [...body.matchAll(/^###\s*\((.*?)\)\s*$/gm)].map(m => m[1]);
    body = body.replace(/^###.*$/gm, '').trim();
    if (/^STYLE BLOCK/i.test(heading)) { styleBlock = body; continue; }
    const m = heading.match(/^(\d+)\s*·\s*(.+?)(?:→(.*))?$/);
    if (!m) continue; // Board note etc.
    const num = Number(m[1]);
    const skipByDefault = /DO NOT RE-RENDER/i.test(heading); // canon prompts — only run when named in --only
    const title = m[2].replace(/\s+$/, '').replace(/·+.*$/, '').trim();
    // `→ wallRear slot` / `→ wallRear` — first token after the arrow, trailing " slot(s)" allowed
    const slotM = (m[3] || '').trim().match(/^([A-Za-z0-9_-]+)(?:\s+slots?)?/);
    const slot = slotM ? slotM[1] : null;
    const slug = title.toLowerCase().replace(/[—·/]+/g, ' ').replace(/[^a-z0-9 ]+/g, '')
      .trim().replace(/\s+/g, '-').slice(0, 40);
    const wantsSitePhoto = notes.some(n => /site photo/i.test(n)) || /attach.*site photo/i.test(body);
    prompts.push({ num, title, slot, slug, body, wantsSitePhoto, skipByDefault, portrait: /portrait/i.test(heading + body) });
  }
  if (!styleBlock) throw new Error('No STYLE BLOCK section found in ' + mdPath);
  return { styleBlock, prompts };
}

// ---------- helpers ---------------------------------------------------------
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const isImage = (p) => !!MIME[path.extname(p).toLowerCase()];
const readable = (p) => { try { return !!p && fs.statSync(p).isFile(); } catch { return false; } };
function listImages(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(isImage).map(f => path.join(dir, f)).sort();
}
const rel = (p) => path.relative(process.cwd(), p) || p;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sameFile = (a, b) => {
  if (!a || !b) return false;
  if (path.resolve(a) === path.resolve(b)) return true;
  try { return fs.readFileSync(a).equals(fs.readFileSync(b)); } catch { return false; }
};

// Build the Gemini parts for one job: prompt text, then for every image a
// one-line text label ("[image N] role: path") immediately followed by the image.
// Gemini has no per-image labels, so the label text part IS the label.
function buildParts(prompt, attachments) {
  const parts = [{ text: prompt }];
  attachments.forEach((a, i) => {
    parts.push({ text: `[image ${i}] ${a.role}: ${rel(a.path)}` });
    parts.push({ inline_data: { mime_type: MIME[path.extname(a.path).toLowerCase()], data: fs.readFileSync(a.path).toString('base64') } });
  });
  return parts;
}

// ---------- attachment plan (the contract) ----------------------------------
// Returns { attachments:[{role,path}], opener, errors:[] } for one job.
function planAttachments(job, sitePhotos) {
  const errors = [];
  const att = [];
  const need = (p, role, what) => {
    if (!readable(p) || !isImage(p)) errors.push(`${what} missing/unreadable: ${p || '(not given)'}`);
    att.push({ role, path: p || '(missing)' });
  };

  if (CFG.geometry) {
    const isHero = job.slot === 'hero';
    // [0] — hero prompt: explicit site/mood/finish ref · other slots: the approved hero
    need(CFG.styleref, isHero ? 'style-ref (site/mood/finish reference)' : 'approved hero of this room', '--styleref');
    // [1] — this slot's geometry
    if (!job.slot) errors.push(`prompt ${job.num} has no "→ slot" in its heading — geometry cannot be resolved`);
    const geo = job.slot ? path.join(CFG.structref, job.slot, 'geometry.png') : null;
    need(geo, `geometry for slot ${job.slot || '?'} (camera, openings, object positions)`, `geometry for slot "${job.slot}"`);
    // [2…] site photos where the section asks — exact copies of [0] omitted from THIS group only
    if (job.wantsSitePhoto) {
      for (const p of sitePhotos) {
        if (sameFile(p, CFG.styleref)) continue;
        att.push({ role: 'site photo (retained conditions only)', path: p });
      }
    }
    // last — explicit layout plan
    if (CFG.layoutref) need(CFG.layoutref, 'layout plan (overall adjacency + orientation only)', '--layoutref');
    const opener = job.noHalo ? OPENERS.noHalo : (isHero ? OPENERS.hero : OPENERS.slot);
    return { attachments: att, opener, errors };
  }

  // LEGACY — [0] style-ref (warn if missing, never shift), photos where asked, explicit layout last.
  // No implicit layout-canon.png beside the runner any more (the 1.x fallback is REMOVED).
  if (readable(CFG.styleref)) att.push({ role: 'style-ref', path: CFG.styleref });
  if (job.wantsSitePhoto) for (const p of sitePhotos) att.push({ role: 'site photo', path: p });
  // a DO NOT RE-RENDER canon prompt never gets the layout it defines
  if (CFG.layoutref && !job.skipByDefault) need(CFG.layoutref, 'layout plan (overall adjacency + orientation only)', '--layoutref');
  return { attachments: att, opener: null, errors };
}

// ---------- gemini call -----------------------------------------------------
async function generate({ parts, aspect }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CFG.model}:generateContent`;
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CFG.apiKey },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = attempt * 15000;
      console.log(`   rate-limited/server error (${res.status}) — retry ${attempt}/3 in ${wait / 1000}s`);
      await sleep(wait); continue;
    }
    const json = await res.json();
    if (!res.ok) throw new Error(`API ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    const rparts = json.candidates?.[0]?.content?.parts || [];
    const img = rparts.find(p => p.inlineData?.data || p.inline_data?.data);
    if (!img) throw new Error('No image in response: ' + JSON.stringify(json).slice(0, 300));
    const d = img.inlineData || img.inline_data;
    return { buf: Buffer.from(d.data, 'base64'), mime: d.mimeType || d.mime_type || 'image/png' };
  }
  throw new Error('Gave up after retries');
}

// ---------- main ------------------------------------------------------------
(async () => {
  const { styleBlock, prompts } = parsePromptsMd(CFG.file);
  // canon prompts (heading marked DO NOT RE-RENDER) only run when named in --only
  const run = prompts.filter(p => CFG.only.length ? CFG.only.includes(p.num) : !p.skipByDefault);
  const sitePhotos = listImages(CFG.photosDir);

  // Job list — a `--no-halo` sibling is byte-identical in images/order to its parent;
  // only the halo instruction differs (trigger: body says "halo glowing").
  const jobs = [];
  for (const p of run) {
    jobs.push({ ...p, name: `${String(p.num).padStart(2, '0')}-${p.slug}`, noHalo: false });
    if (CFG.variants && /halo\s+glowing/i.test(p.body)) {
      jobs.push({ ...p, name: `${String(p.num).padStart(2, '0')}-${p.slug}--no-halo`, noHalo: true });
    }
  }
  for (const j of jobs) {
    Object.assign(j, planAttachments(j, sitePhotos));
    const opener = j.opener ? j.opener + '\n\n' : '';
    const extra = (!CFG.geometry && j.noHalo) ? LEGACY_NO_HALO : '';
    j.prompt = opener + styleBlock + '\n\n' + j.body + extra;
  }

  console.log(`Nano Banana batch ${RUNNER_VERSION} — ${CFG.model} @ ${CFG.aspect} — mode: ${CFG.geometry ? 'GEOMETRY (handoff contract)' : 'LEGACY'}`);
  console.log(`Prompts file : ${rel(CFG.file)}`);
  console.log(`Style ref [0]: ${CFG.styleref ? rel(CFG.styleref) + (readable(CFG.styleref) ? '' : '  ✖ MISSING') : '(none given)'}`);
  if (CFG.geometry) console.log(`Geometry [1] : ${rel(CFG.structref)}/<slot>/geometry.png`);
  console.log(`Site photos  : ${sitePhotos.length ? sitePhotos.length + ' found in ' + rel(CFG.photosDir) : 'none (' + rel(CFG.photosDir) + ')'}`);
  console.log(`Layout ref   : ${CFG.layoutref ? rel(CFG.layoutref) + ' (appended last)' : 'none — no implicit layout'}`);
  console.log(`Jobs         : ${jobs.map(j => j.name).join(', ')}\n`);

  // Run plan — always printed; it IS the dry-run output and the pre-flight check.
  const allErrors = [];
  for (const j of jobs) {
    console.log(`— ${j.name}${j.slot ? '  (slot ' + j.slot + ')' : ''}`);
    j.attachments.forEach((a, i) => console.log(`    [image ${i}] ${a.role} — ${rel(a.path)}`));
    if (j.opener) console.log(`    opener: ${j.opener.slice(0, 70)}…`);
    console.log(`    prompt: ${j.prompt.length} chars${j.portrait ? ' · portrait 3:4' : ''}`);
    for (const e of j.errors) { console.log(`    ✖ ${e}`); allErrors.push(`${j.name}: ${e}`); }
  }

  if (!CFG.geometry && !readable(CFG.styleref)) console.warn('\n⚠ style reference image missing — renders will drift off-scheme');
  if (allErrors.length) {
    console.error(`\n✖ Run plan stopped — ${allErrors.length} attachment problem(s). Nothing was sent.`);
    process.exit(2);
  }
  if (CFG.dryRun) { console.log('\nDry run only — no API calls made.'); return; }
  if (!CFG.apiKey) { console.error('✖ GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey'); process.exit(1); }

  fs.mkdirSync(CFG.outDir, { recursive: true });
  let ok = 0, fail = 0;
  for (const j of jobs) {
    const outBase = path.join(CFG.outDir, j.name);
    process.stdout.write(`▶ ${j.name} ... `);
    try {
      const aspect = j.portrait ? '3:4' : CFG.aspect;
      const { buf, mime } = await generate({ parts: buildParts(j.prompt, j.attachments), aspect });
      const ext = mime.includes('jpeg') ? '.jpg' : '.png';
      fs.writeFileSync(outBase + ext, buf);
      console.log(`saved (${(buf.length / 1024).toFixed(0)} KB${aspect !== CFG.aspect ? ', ' + aspect : ''})`);
      ok++;
    } catch (e) {
      console.log('FAILED — ' + e.message); fail++;
    }
    await sleep(3000); // be gentle with rate limits
  }
  console.log(`\nDone: ${ok} saved, ${fail} failed → ${rel(CFG.outDir)}`);
  if (fail) process.exit(1);
})();
