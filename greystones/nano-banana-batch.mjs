#!/usr/bin/env node
// ============================================================================
// nano-banana-batch.mjs — Sonor batch renderer for Nano Banana (Gemini image)
// ----------------------------------------------------------------------------
// Parses a Sonor render-prompts markdown file (the `nano-banana-prompts-*.md`
// format: STYLE BLOCK section + numbered `## N · TITLE` prompt sections),
// prepends the style block to every prompt, attaches the style-reference image
// (and any site photos, when a section asks for them), calls the Gemini
// image-generation API, and saves each render to ./renders/.
//
// Zero dependencies — needs Node 18+ (built-in fetch). Runs on the Mac.
//
// USAGE
//   export GEMINI_API_KEY=...            # from Google AI Studio
//   cd "APP - Cinema Aesthetic/greystones"
//   node nano-banana-batch.mjs                 # run all prompts
//   node nano-banana-batch.mjs --dry-run       # parse + show plan, no API calls
//   node nano-banana-batch.mjs --only 1,3      # just these prompt numbers
//   node nano-banana-batch.mjs --variants      # also render no-halo variants
//   node nano-banana-batch.mjs --model gemini-3-pro-image-preview   # NB Pro
//
// DEFAULTS (all overridable)
//   --file     ./nano-banana-prompts-dark-grey.md
//   --styleref "../15 harrop/andy original cinema mood.png"
//   --photos   ./site-photos          (folder; attached only where the md
//                                      section carries an "attach ... site
//                                      photo" note, and only if files exist)
//   --out      ./renders
//   --model    gemini-2.5-flash-image (= Nano Banana; NB Pro =
//              gemini-3-pro-image-preview — sharper detail, costs more)
//   --aspect   16:9
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Auto-load a .env sitting next to this script (GEMINI_API_KEY=...) so the
// key doesn't need exporting every session. NEVER commit the .env — it is
// git-ignored; this repo deploys to public GitHub Pages.
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

const CFG = {
  file: path.resolve(HERE, opt('file', './nano-banana-prompts-dark-grey.md')),
  styleref: path.resolve(HERE, opt('styleref', '../15 harrop/andy original cinema mood.png')),
  photosDir: path.resolve(HERE, opt('photos', './site-photos')),
  outDir: path.resolve(HERE, opt('out', './renders')),
  model: opt('model', 'gemini-2.5-flash-image'),
  aspect: opt('aspect', '16:9'),
  only: opt('only', '').split(',').map(s => s.trim()).filter(Boolean).map(Number),
  dryRun: flag('dry-run'),
  variants: flag('variants'),
  apiKey: process.env.GEMINI_API_KEY || '',
};

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
    // pull out "### (...)" note lines — they are instructions, not prompt text
    const notes = [...body.matchAll(/^###\s*\((.*?)\)\s*$/gm)].map(m => m[1]);
    body = body.replace(/^###.*$/gm, '').trim();
    if (/^STYLE BLOCK/i.test(heading)) { styleBlock = body; continue; }
    const m = heading.match(/^(\d+)\s*·\s*(.+?)(?:→.*)?$/);
    if (!m) continue; // Board note etc.
    const num = Number(m[1]);
    const skipByDefault = /DO NOT RE-RENDER/i.test(heading); // canon prompts — only run when named in --only
    const title = m[2].replace(/\s+$/, '').replace(/·+.*$/, '').trim();
    const slug = title.toLowerCase().replace(/[—·/]+/g, ' ').replace(/[^a-z0-9 ]+/g, '')
      .trim().replace(/\s+/g, '-').slice(0, 40);
    const wantsSitePhoto = notes.some(n => /site photo/i.test(n)) || /attach.*site photo/i.test(body);
    prompts.push({ num, title, slug, body, wantsSitePhoto, skipByDefault, portrait: /portrait/i.test(heading + body) });
  }
  if (!styleBlock) throw new Error('No STYLE BLOCK section found in ' + mdPath);
  return { styleBlock, prompts };
}

// ---------- helpers ---------------------------------------------------------
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
function imagePart(p) {
  const mime = MIME[path.extname(p).toLowerCase()];
  if (!mime) return null;
  return { inline_data: { mime_type: mime, data: fs.readFileSync(p).toString('base64') } };
}
function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => MIME[path.extname(f).toLowerCase()])
    .map(f => path.join(dir, f)).sort();
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- gemini call -----------------------------------------------------
async function generate({ prompt, images, aspect }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CFG.model}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: prompt }, ...images] }],
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
    const parts = json.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inlineData?.data || p.inline_data?.data);
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

  const stylerefPart = fs.existsSync(CFG.styleref) ? imagePart(CFG.styleref) : null;
  const sitePhotos = listImages(CFG.photosDir);
  // frozen layout plan — attached to every render EXCEPT the canon prompt itself
  const canonPath = path.join(HERE, 'layout-canon.png');
  const canonPart = fs.existsSync(canonPath) ? imagePart(canonPath) : null;

  // Build the job list (halo variants for prompts that mention the LED halo)
  const jobs = [];
  for (const p of run) {
    jobs.push({ ...p, name: `${String(p.num).padStart(2, '0')}-${p.slug}`, extra: '' });
    // no-halo comparison variants only where the halo is the featured element
    // (screen-facing shots — "halo glowing ..."), not every passing mention
    if (CFG.variants && /halo\s+glowing/i.test(p.body)) {
      jobs.push({
        ...p, name: `${String(p.num).padStart(2, '0')}-${p.slug}--no-halo`,
        extra: '\n\nVARIANT: OMIT the LED halo around the screen entirely — plain ' +
               'fabric wall and framed screen only, no glow around the screen edges.',
      });
    }
  }

  console.log(`Nano Banana batch — ${CFG.model} @ ${CFG.aspect}`);
  console.log(`Prompts file : ${CFG.file}`);
  console.log(`Style ref    : ${stylerefPart ? CFG.styleref : 'MISSING — ' + CFG.styleref}`);
  console.log(`Site photos  : ${sitePhotos.length ? sitePhotos.length + ' found' : 'none (folder ' + CFG.photosDir + ')'}`);
  console.log(`Jobs         : ${jobs.map(j => j.name).join(', ')}\n`);

  if (!stylerefPart) console.warn('⚠ style reference image missing — renders will drift off-scheme\n');
  if (CFG.dryRun) {
    for (const j of jobs) {
      const attach = ['style-ref', ...(j.wantsSitePhoto ? sitePhotos.map(p => path.basename(p)) : [])];
      console.log(`— ${j.name}\n  attach: ${attach.join(', ')}\n  prompt: ${(styleBlock + '\n\n' + j.body + j.extra).length} chars`);
    }
    console.log('\nDry run only — no API calls made.');
    return;
  }
  if (!CFG.apiKey) { console.error('✖ GEMINI_API_KEY not set. Get one at https://aistudio.google.com/apikey'); process.exit(1); }

  fs.mkdirSync(CFG.outDir, { recursive: true });
  let ok = 0, fail = 0;
  for (const j of jobs) {
    const outBase = path.join(CFG.outDir, j.name);
    process.stdout.write(`▶ ${j.name} ... `);
    try {
      const images = [stylerefPart, ...(j.skipByDefault ? [] : [canonPart]),
        ...(j.wantsSitePhoto ? sitePhotos.map(imagePart) : [])].filter(Boolean);
      const aspect = j.portrait ? '3:4' : CFG.aspect;
      const { buf, mime } = await generate({ prompt: styleBlock + '\n\n' + j.body + j.extra, images, aspect });
      const ext = mime.includes('jpeg') ? '.jpg' : '.png';
      fs.writeFileSync(outBase + ext, buf);
      console.log(`saved (${(buf.length / 1024).toFixed(0)} KB${aspect !== CFG.aspect ? ', ' + aspect : ''})`);
      ok++;
    } catch (e) {
      console.log('FAILED — ' + e.message); fail++;
    }
    await sleep(3000); // be gentle with rate limits
  }
  console.log(`\nDone: ${ok} saved, ${fail} failed → ${CFG.outDir}`);
})();
