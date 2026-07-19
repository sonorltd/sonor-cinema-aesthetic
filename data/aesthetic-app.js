/* Sonor Cinema Aesthetic — wizard UI (v0.1.0)
   AestheticApp — clones the Seating Configurator app pattern (SeatingApp):
   Intro → Scheme → Materials → Lighting → Summary. No pricing (aesthetics are
   priced on the main cinema proposal). Writes ONLY aesthetic_configs; reads
   project context live: cinema_designs (room), seating_configs (seat pick),
   projects.metadata.brief (client lighting concept).
   Client-build gate: window.__AESTHETIC_CLIENT__ strips project bar + saves.
*/
(function (global) {
  'use strict';

  var CFG = global.__AESTHETIC_CONFIG__ || {};
  var E = null;                      // SonorAesthetic
  var STEPS = CFG.steps || ['Scheme', 'Materials', 'Lighting', 'Summary'];
  var CLIENT = !!global.__AESTHETIC_CLIENT__;

  var cfg = {
    step: 1,
    scheme: { style: 'dark-classic', notes: '' },
    picks: {},                       // slotId -> itemId
    // v0.3.0 — AV configuration (in-house). Hardware ids = device_catalogue model_id.
    av: {
      video: { type: 'projection-baffle', tvId: null, tvSizeIn: null, projectorId: null },
      audio: { config: '5.1.4', picks: {}, subId: null, subQty: 2, processorId: null, ampId: null }
    },
    fittings: {},                    // fittingTypeId -> true
    scenes: null,                    // null = defaults / brief-driven
    client: { name: '', project: '' },
    projectId: null,
    _savedId: null,
    _lastRef: null
  };
  var ctx = { room: null, seating: null, brief: null, meta: null };   // live cross-app context

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dbc() { try { return (global.__AESTHETIC_DB__ && global.__AESTHETIC_DB__.client) || (global.db && global.db.client) || null; } catch (e) { return null; } }

  // ── boot ─────────────────────────────────────────────────────────────────
  async function boot() {
    E = global.SonorAesthetic;
    await E.load();
    E.avLoad().then(function () { if (cfg.step === 2 || cfg.step === 3) renderStep(); });   // AV hardware in background
    var note = $('sourceNote');
    if (note) {
      var s = E.source;
      note.textContent = (s === 'supabase' ? 'Live library' : s === 'cache' ? 'Cached library' : s === 'seed' ? 'Offline snapshot' : 'No data') + ' · v' + (CFG.version || '?');
      note.className = 'src-note src-' + s;
    }
    seedDefaults();
    renderStep();
    if (!CLIENT) initProjectBar();
    bootDeepLink();
    try { global.SonorShell && global.SonorShell.selfTest && global.SonorShell.selfTest(); } catch (e) {}
  }

  function seedDefaults() {
    // default picks: first item of each slot category (keeps the board never-empty)
    (CFG.slots || []).forEach(function (sl) {
      if (!cfg.picks[sl.id]) { var it = E.byCategory(sl.cat)[0]; if (it) cfg.picks[sl.id] = it.id; }
    });
    if (!Object.keys(cfg.fittings).length) { cfg.fittings = { downlight: true, led_perimeter: true, riser_light: true }; }
  }

  // ── wizard nav ───────────────────────────────────────────────────────────
  function enter() { $('intro').style.display = 'none'; $('wizard').style.display = 'flex'; cfg.step = 1; renderStep(); }
  function backToIntro() { $('wizard').style.display = 'none'; $('intro').style.display = 'block'; }
  function goBack() { if (cfg.step > 1) { cfg.step--; renderStep(); } }
  function goNext() { if (cfg.step < STEPS.length) { cfg.step++; renderStep(); } }
  function jumpTo(n) { if (n < cfg.step) { cfg.step = n; renderStep(); } }

  function renderStep() {
    var pills = $('stepPills');
    if (pills) pills.innerHTML = STEPS.map(function (s, i) {
      var n = i + 1, cls = n === cfg.step ? 'pill active' : n < cfg.step ? 'pill done' : 'pill';
      return '<span class="' + cls + '" onclick="AestheticApp.jumpTo(' + n + ')"><span class="pn">' + n + '</span>' + s + '</span>' + (n < STEPS.length ? '<span class="parr">›</span>' : '');
    }).join('');
    var back = $('btnBack'); if (back) back.style.visibility = cfg.step > 1 ? 'visible' : 'hidden';
    var next = $('btnNext');
    if (next) {
      next.disabled = false;
      next.textContent = cfg.step === STEPS.length ? 'Download proposal ↓' : 'Continue →';
      next.onclick = cfg.step === STEPS.length ? savePdf : goNext;
    }
    var body = $('stepBody'); if (!body) return;
    body.innerHTML = [renderScheme, renderVideo, renderAudio, renderMaterials, renderLighting, renderSummary][cfg.step - 1]();
  }

  // ── AV helpers ───────────────────────────────────────────────────────────
  function atmosCfg() { return (CFG.atmosConfigs || []).find(function (a) { return a.id === cfg.av.audio.config; }) || { id: cfg.av.audio.config, surrounds: 2, rears: 0, heights: 4 }; }
  function avName(id) { var d = id && E.avItem(id); return d ? (d.make + ' ' + d.model) : null; }
  function avSelectHtml(cat, path, current, allowNone) {
    var items = E.avByCategory(cat);
    if (!items.length) return '<div class="hint">Library device catalogue unavailable — connect once online.</div>';
    var byMake = {};
    items.forEach(function (d) { (byMake[d.make] = byMake[d.make] || []).push(d); });
    var h = '<select onchange="AestheticApp.setAv(\'' + path + '\', this.value || null)" style="width:100%;background:var(--bg3);border:1px solid var(--brd2);border-radius:7px;color:var(--cream);padding:9px 10px;font-size:12.5px;font-family:inherit">';
    h += '<option value=""' + (!current ? ' selected' : '') + '>' + (allowNone ? '— none / TBC —' : '— choose —') + '</option>';
    Object.keys(byMake).sort().forEach(function (mk) {
      h += '<optgroup label="' + esc(mk) + '">';
      byMake[mk].forEach(function (d) {
        h += '<option value="' + esc(d.model_id) + '"' + (current === d.model_id ? ' selected' : '') + '>' + esc(d.model) + '</option>';
      });
      h += '</optgroup>';
    });
    return h + '</select>';
  }
  function setAv(path, val) {
    var parts = path.split('.'), o = cfg.av;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = (val === '' ? null : val);
    if (path === 'video.type' || path === 'audio.config') renderStep(); else updateAvLive();
  }
  function updateAvLive() { var el = $('avLive'); if (el) el.innerHTML = avSummaryHtml(); }

  // ── step 2 · video ───────────────────────────────────────────────────────
  function renderVideo() {
    var v = cfg.av.video;
    var h = '<div class="lead"><h2>Video system.</h2><p>Choose the display route, then the hardware by manufacturer — options come live from the Sonor device library. Screen geometry stays owned by the Cinema Takeoff.</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    h += '<div class="panel"><div class="ptt">Display type</div><div class="mat-grid">';
    (CFG.videoTypes || []).forEach(function (t) {
      var on = v.type === t.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.setAv(\'video.type\',\'' + t.id + '\')"><div class="mc-name">' + esc(t.label) + '</div><div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(t.note) + '</div></button>';
    });
    h += '</div></div>';
    if (v.type === 'tv') {
      h += '<div class="panel"><div class="ptt">Television <span class="opt-tag">· by manufacturer</span></div>' + avSelectHtml('tv', 'video.tvId', v.tvId) +
        '<div class="lbl">Screen size</div><div class="opts">';
      (CFG.tvSizes || []).forEach(function (s) {
        h += '<button class="opt' + (v.tvSizeIn === s ? ' on' : '') + '" onclick="AestheticApp.setAv(\'video.tvSizeIn\',' + s + ')">' + s + '&quot;</button>';
      });
      h += '</div></div>';
    } else {
      h += '<div class="panel"><div class="ptt">Projector <span class="opt-tag">· by manufacturer</span></div>' + avSelectHtml('projector', 'video.projectorId', v.projectorId) +
        '<div class="hint" style="margin-top:10px">' + (ctx.meta && ctx.meta.screen && ctx.meta.screen.w ? 'Screen from the takeoff: ' + ctx.meta.screen.w + ' × ' + ctx.meta.screen.h + ' mm' + (v.type === 'projection-baffle' ? ' · acoustically transparent, speakers behind' : '') : 'Screen size is set in the Cinema Takeoff for the active project.') + '</div></div>';
    }
    h += '</div>';
    h += '<div class="panel sticky"><div class="ptt">Your AV selection</div><div id="avLive">' + avSummaryHtml() + '</div></div>';
    h += '</div>';
    return h;
  }

  // ── step 3 · audio ───────────────────────────────────────────────────────
  function renderAudio() {
    var a = cfg.av.audio, ac = atmosCfg();
    var h = '<div class="lead"><h2>Audio system.</h2><p>Pick the immersive layout, then each channel group by manufacturer — fronts, centre, surrounds, heights and subs are chosen separately.</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    h += '<div class="panel"><div class="ptt">Immersive layout</div><div class="opts">';
    (CFG.atmosConfigs || []).forEach(function (c) {
      h += '<button class="opt' + (a.config === c.id ? ' on' : '') + '" onclick="AestheticApp.setAv(\'audio.config\',\'' + c.id + '\')">' + c.id + '</button>';
    });
    h += '</div><div class="hint" style="margin-top:8px">' + esc(ac.id) + ' — ' + (3 + ac.surrounds + ac.rears) + ' bed channels · ' + ac.heights + ' heights · LFE</div></div>';
    (CFG.channelGroups || []).forEach(function (g) {
      var qty = g.qty(ac);
      if (!qty) return;
      h += '<div class="panel"><div class="ptt">' + esc(g.label) + ' <span class="opt-tag">· ' + qty + '× · ' + esc(g.hint) + '</span></div>' + avSelectHtml(g.cat, 'audio.picks.' + g.id, a.picks[g.id], true) + '</div>';
    });
    h += '<div class="panel"><div class="ptt">Subwoofers <span class="opt-tag">· low-frequency foundation</span></div>' + avSelectHtml('subwoofer', 'audio.subId', a.subId, true) +
      '<div class="lbl">Quantity</div><div class="opts">';
    (CFG.subQtyOptions || []).forEach(function (q) {
      h += '<button class="opt' + (a.subQty === q ? ' on' : '') + '" onclick="AestheticApp.setAv(\'audio.subQty\',' + q + ')">' + q + '</button>';
    });
    h += '</div></div>';
    h += '<div class="panel"><div class="ptt">Electronics</div><div class="lbl">AV receiver / processor</div>' + avSelectHtml('receiver', 'audio.processorId', a.processorId, true) +
      '<div class="lbl">Power amplifier</div>' + avSelectHtml('amplifier', 'audio.ampId', a.ampId, true) + '</div>';
    h += '</div>';
    h += '<div class="panel sticky"><div class="ptt">Your AV selection</div><div id="avLive">' + avSummaryHtml() + '</div></div>';
    h += '</div>';
    return h;
  }

  function avSummaryHtml() {
    var v = cfg.av.video, a = cfg.av.audio, ac = atmosCfg();
    var rows = [];
    var vt = (CFG.videoTypes || []).find(function (t) { return t.id === v.type; });
    rows.push(['Display', (vt ? vt.label : v.type) + (v.type === 'tv' && v.tvSizeIn ? ' · ' + v.tvSizeIn + '"' : '')]);
    if (v.type === 'tv' && v.tvId) rows.push(['TV', avName(v.tvId)]);
    if (v.type !== 'tv' && v.projectorId) rows.push(['Projector', avName(v.projectorId)]);
    rows.push(['Layout', a.config]);
    (CFG.channelGroups || []).forEach(function (g) {
      var qty = g.qty(ac);
      if (qty && a.picks[g.id]) rows.push([g.label, qty + '× ' + avName(a.picks[g.id])]);
    });
    if (a.subId) rows.push(['Subs', a.subQty + '× ' + avName(a.subId)]);
    if (a.processorId) rows.push(['Processor', avName(a.processorId)]);
    if (a.ampId) rows.push(['Amplification', avName(a.ampId)]);
    return rows.map(function (r) {
      return '<div style="padding:7px 0;border-bottom:1px solid var(--brd2)"><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">' + esc(r[0]) + '</div><div style="font-size:12.5px;color:var(--cream);margin-top:2px">' + esc(r[1] || '—') + '</div></div>';
    }).join('');
  }

  // ── step 1 · scheme ──────────────────────────────────────────────────────
  function renderScheme() {
    var h = '<div class="lead"><h2>Set the scheme.</h2><p>Pick the design direction for the room. The live room and seating below come straight from your cinema design — nothing is retyped.</p></div>';
    h += '<div class="layout-grid">';
    h += '<div class="panel" style="grid-column:1/span 2"><div class="ptt">Design direction</div><div class="mat-grid">';
    (CFG.styles || []).forEach(function (st) {
      var on = cfg.scheme.style === st.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.setStyle(\'' + st.id + '\')">' +
        '<div class="mc-name">' + esc(st.label) + '</div><div class="mc-price" style="font-size:11px;line-height:1.5">' + esc(st.note) + '</div></button>';
    });
    h += '</div></div>';
    h += '<div class="panel"><div class="ptt">Live project context</div>' + contextHtml() + '</div>';
    h += '</div>';
    return h;
  }
  function contextHtml() {
    var rows = [];
    if (ctx.room && (ctx.room.w || ctx.room.d)) rows.push(['Room', (ctx.room.w || '?') + ' × ' + (ctx.room.d || '?') + ' mm' + (ctx.room.h ? ' × ' + ctx.room.h + ' h' : '')]);
    if (ctx.seating) rows.push(['Seating', ctx.seating]);
    if (ctx.brief) rows.push(['Client brief', 'Logged — lighting concept applied']);
    if (!rows.length) rows.push(['Project', cfg.projectId ? 'No cinema design found yet' : (CLIENT ? '—' : 'Select a project above to pull the room + seating')]);
    return rows.map(function (r) { return '<div class="fld" style="margin-bottom:8px"><span style="color:var(--muted);font-size:10px;letter-spacing:.09em;text-transform:uppercase">' + esc(r[0]) + '</span><span style="text-align:right;font-size:12.5px">' + esc(r[1]) + '</span></div>'; }).join('') +
      '<div class="hint">Room + seating flow in live from the Cinema Design / Seating apps for the selected project.</div>';
  }

  // ── step 2 · materials ───────────────────────────────────────────────────
  function renderMaterials() {
    var h = '<div class="lead"><h2>Fabrics &amp; finishes.</h2><p>One pick per surface. Swatches come from the Sonor aesthetic library — physical samples follow before anything is ordered.</p></div>';
    (CFG.slots || []).forEach(function (sl) {
      var items = E.byCategory(sl.cat);
      h += '<div class="panel" style="margin-bottom:14px"><div class="ptt">' + esc(sl.label) + ' <span class="opt-tag">· ' + esc(sl.hint || '') + '</span></div>';
      if (!items.length) { h += '<div class="hint">No library entries yet for this surface.</div></div>'; return; }
      h += '<div class="mat-grid">';
      items.forEach(function (it) {
        var on = cfg.picks[sl.id] === it.id;
        var hasSw = !!(it.swatch_img || it.hex);
        var sw = it.swatch_img ? 'background-image:url(\'' + esc(it.swatch_img) + '\');background-size:cover' : 'background:' + (it.hex || '#444');
        var cw = it.metadata && it.metadata.colours_available;
        h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.pick(\'' + sl.id + '\',\'' + it.id + '\')">' +
          '<div class="mc-top">' + (hasSw ? '<span class="mc-sw" style="' + sw + '"></span>' : '') + '<span class="mc-name">' + esc(it.name) + '</span></div>' +
          (it.manufacturer ? '<div class="mc-meta">' + esc(it.manufacturer) + (cw ? ' · ' + cw + ' colourways' : '') + '</div>' : '') +
          (it.note ? '<div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(it.note) + '</div>' : '') +
          '</button>';
      });
      h += '</div></div>';
    });
    return h;
  }

  // ── step 3 · lighting ────────────────────────────────────────────────────
  function renderLighting() {
    var h = '<div class="lead"><h2>Lighting.</h2><p>Fittings and scenes — warm, calm and dimmable throughout. ' + esc(CFG.colourTemp || '') + '</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    h += '<div class="panel"><div class="ptt">Fittings</div>';
    (CFG.fittingTypes || []).forEach(function (ft) {
      var on = !!cfg.fittings[ft.id];
      h += '<label class="fin"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="AestheticApp.toggleFitting(\'' + ft.id + '\',this.checked)">' +
        '<span class="fin-b"><span class="fin-n">' + esc(ft.label) + '</span><span class="fin-d">' + esc(ft.hint || '') + '</span></span></label>';
    });
    h += '</div></div>';
    h += '<div class="panel sticky"><div class="ptt">Scenes' + (ctx.brief ? ' <span class="opt-tag">· from the client brief</span>' : '') + '</div>';
    scenes().forEach(function (sc) {
      h += '<div style="padding:9px 0;border-bottom:1px solid var(--brd2)"><div class="fin-n" style="color:var(--gold)">' + esc(sc.label) + '</div><div class="fin-d">' + esc(sc.note) + '</div></div>';
    });
    h += '<div class="hint" style="margin-top:10px">' + esc(CFG.colourTemp || '') + '</div></div>';
    h += '</div>';
    return h;
  }
  function scenes() { return cfg.scenes || CFG.defaultScenes || []; }

  // ── step 4 · summary ─────────────────────────────────────────────────────
  function renderSummary() {
    var st = styleOf();
    var h = '<div class="summary">';
    h += '<div class="sm-head"><div><div class="sm-mfr">Cinema Aesthetic · ' + esc(st ? st.label : '') + '</div><h2>' + esc(cfg.client.project || 'Mood Board') + '</h2></div><div class="sm-date">' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div>';
    if (!CLIENT) {
      h += '<div class="client-row">' +
        '<div class="cfld"><span>Prepared for</span><input value="' + esc(cfg.client.name) + '" onchange="AestheticApp.setClient(\'name\',this.value)"></div>' +
        '<div class="cfld"><span>Project</span><input value="' + esc(cfg.client.project) + '" onchange="AestheticApp.setClient(\'project\',this.value)"></div></div>';
      h += savedPanelHtml();
    }
    // board strip — every surface pick as a swatch cell
    h += '<div class="strip">';
    (CFG.slots || []).forEach(function (sl) {
      var it = E.item(cfg.picks[sl.id]);
      if (!it) return;
      var hasSw = !!(it.swatch_img || it.hex);
      var sw = it.swatch_img ? 'background-image:url(\'' + esc(it.swatch_img) + '\');background-size:cover' : 'background:' + (it.hex || '#444');
      h += '<div class="cellx"><div class="cl">' + esc(sl.label) + '</div><div style="display:flex;align-items:center;gap:9px;margin-top:6px">' + (hasSw ? '<span class="mc-sw" style="' + sw + ';width:22px;height:22px"></span>' : '') + '<span class="cv" style="font-size:13.5px;margin:0">' + esc(it.name) + '</span></div>' + (it.manufacturer ? '<div class="cn">' + esc(it.manufacturer) + '</div>' : '') + '</div>';
    });
    h += '</div>';
    // AV summary
    h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Video &amp; audio</div>' + avSummaryHtml() + '</div>';
    // lighting summary
    var fits = (CFG.fittingTypes || []).filter(function (f) { return cfg.fittings[f.id]; }).map(function (f) { return f.label; });
    h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Lighting</div><div style="font-size:13px;line-height:1.7">' + esc(fits.join(' · ') || '—') + '</div>' +
      '<div class="hint">' + scenes().map(function (s) { return esc(s.label); }).join(' · ') + ' scenes · ' + esc(CFG.colourTemp || '') + '</div></div>';
    h += '<div class="actions">' +
      (!CLIENT ? '<button class="btn ghost" onclick="AestheticApp.saveConfig()">Save board</button>' : '') +
      '<button class="btn primary" onclick="AestheticApp.savePdf()">Download Cinema Design Proposal</button></div>';
    h += '<div class="disc">' + (CFG.termsLines || []).map(esc).join(' ') + '</div>';
    h += '</div>';
    return h;
  }

  function savedPanelHtml() {
    return '<div class="panel saved-panel" style="margin-bottom:18px"><div class="ptt">Saved boards</div><div id="savedList"><div class="hint">Loading…</div></div></div>';
  }

  // ── mutators ─────────────────────────────────────────────────────────────
  function setStyle(id) { cfg.scheme.style = id; renderStep(); }
  function pick(slot, itemId) { cfg.picks[slot] = itemId; renderStep(); }
  function toggleFitting(id, on) { if (on) cfg.fittings[id] = true; else delete cfg.fittings[id]; }
  function setClient(k, v) { cfg.client[k] = v; }
  function styleOf() { return (CFG.styles || []).find(function (s) { return s.id === cfg.scheme.style; }) || null; }

  // ── project bar + live context (internal builds only) ────────────────────
  function initProjectBar(attempt) {
    attempt = attempt || 0;
    var bar = global.SonorProjectBar, db = dbc();
    if ((!bar || !db) && attempt < 5) { setTimeout(function () { initProjectBar(attempt + 1); }, 1200); return; }
    if (!bar || !db) return;
    try {
      bar.init({ supa: db, appKey: 'cinema-aesthetic', host: $('projectBarHost'), onChange: onProject });
      // the bar restores per-app memory WITHOUT firing onChange — adopt explicitly
      var pid = bar.getActiveId && bar.getActiveId();
      if (pid) onProject({ currentId: pid, project: bar.getProject && bar.getProject(pid) });
    } catch (e) {}
  }
  async function onProject(detail) {
    cfg.projectId = detail && detail.currentId || null;
    ctx.room = null; ctx.seating = null; ctx.brief = null; ctx.meta = null; cfg.scenes = null;
    var p = detail && detail.project;
    if (p) {
      cfg.client.name = p.client_name || cfg.client.name;
      cfg.client.project = (p.address || p.name || '').split('\n')[0].split(',')[0] || cfg.client.project;
    }
    await pullContext();
    loadSavedList();
    renderStep();
  }
  async function pullContext() {
    var db = dbc(); if (!db || !cfg.projectId) return;
    try {   // room + full technical metadata from Cinema Design / Cinema Takeoff
      var r = await db.from('cinema_designs').select('room_width,room_depth,room_height,seat_count,meta:ct_state->metadata').eq('project_id', cfg.projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (r.data) {
        ctx.room = { w: r.data.room_width, d: r.data.room_depth, h: r.data.room_height };
        ctx.meta = r.data.meta || null;   // ct_state.metadata — video/audio/coffer/seating spec
      }
    } catch (e) {}
    try {   // active seating config (range + label) — the seat fabric context
      var s = await db.from('seating_configs').select('label,range_id,updated_at').eq('project_id', cfg.projectId).eq('archived', false).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (s.data) ctx.seating = (s.data.label || s.data.range_id || '').toString();
    } catch (e) {}
    try {   // client brief (lighting concept presence)
      var b = await db.from('projects').select('metadata').eq('id', cfg.projectId).maybeSingle();
      var brief = b.data && b.data.metadata && b.data.metadata.brief;
      if (brief) { ctx.brief = brief; }
    } catch (e) {}
  }

  // ── saved boards (aesthetic_configs — this app's ONLY table writes) ──────
  async function saveConfig() {
    var db = dbc(); if (!db || CLIENT) return;
    var label = cfg.client.project || 'Mood board';
    var body = { project_name: cfg.client.project || null, project_id: cfg.projectId, label: label, config: cfg, app_version: CFG.version, updated_at: new Date().toISOString() };
    try {
      var res;
      if (cfg._savedId) res = await db.from('aesthetic_configs').update(body).eq('id', cfg._savedId).select('id').single();
      else res = await db.from('aesthetic_configs').insert(body).select('id').single();
      if (res.data) cfg._savedId = res.data.id;
      loadSavedList();
    } catch (e) { console.warn('[aesthetic] save failed', e); }
  }
  async function loadSavedList() {
    var el = $('savedList'), db = dbc(); if (!el || !db) return;
    try {
      var q = db.from('aesthetic_configs').select('id,label,app_version,updated_at').eq('archived', false).order('updated_at', { ascending: false }).limit(20);
      if (cfg.projectId) q = q.eq('project_id', cfg.projectId);
      var res = await q;
      var rows = res.data || [];
      el.innerHTML = rows.length ? rows.map(function (r) {
        return '<div class="saved-row' + (r.id === cfg._savedId ? ' cur' : '') + '"><div class="saved-b"><div class="saved-n">' + esc(r.label || 'Board') + '</div><div class="saved-d">' + new Date(r.updated_at).toLocaleDateString('en-GB') + ' · v' + esc(r.app_version || '') + '</div></div>' +
          '<button class="ghost sm" onclick="AestheticApp.openSaved(\'' + r.id + '\')">Open</button></div>';
      }).join('') : '<div class="hint">No saved boards yet for this project.</div>';
    } catch (e) { el.innerHTML = '<div class="hint">Saved boards unavailable.</div>'; }
  }
  async function openSaved(id) {
    var db = dbc(); if (!db) return;
    try {
      var res = await db.from('aesthetic_configs').select('id,config').eq('id', id).single();
      if (res.data && res.data.config) {
        var c = res.data.config;
        ['scheme', 'picks', 'av', 'fittings', 'scenes', 'client'].forEach(function (k) { if (c[k] != null) cfg[k] = c[k]; });
        cfg._savedId = res.data.id;
        cfg.step = STEPS.length; renderStep();
      }
    } catch (e) {}
  }

  function bootDeepLink() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('config')) { enter(); openSaved(q.get('config')); }
      else if (q.get('project')) { cfg.client.project = q.get('project'); }
    } catch (e) {}
  }

  // ── PDF export ───────────────────────────────────────────────────────────
  function makeRef() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var yymmdd = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = '';
    for (var i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return 'SNR-CD-' + yymmdd + '-' + r;
  }
  // NOTE: Gilroy's ff/ffl ligatures render broken in pdf-lib (cinema-pdf-luxury §4)
  // — no "baffle"/"off"/"coffer" in P.text strings destined for the PDF.
  var VIDEO_TYPE_LABEL = {
    'tv': 'Wall-mounted reference TV',
    'projection': 'Projector + fixed-frame screen',
    'projection-baffle': 'Projector · acoustically transparent screen · speakers concealed behind'
  };
  function pdfModel() {
    var st = styleOf();
    var av = cfg.av || { video: {}, audio: { picks: {} } };
    var meta = ctx.meta || {};
    var mv = meta.video || {}, ms = meta.screen || {}, ma = meta.audio || {}, mst = meta.seating || {}, mc = meta.coffer || {};
    var fits = (CFG.fittingTypes || []).filter(function (f) { return cfg.fittings[f.id]; });
    var has = function (id) { return !!cfg.fittings[id]; };
    // total coffer downlights (per-side counts)
    var dl = 0; try { Object.keys(mc.fixtures || {}).forEach(function (k) { dl += (mc.fixtures[k].downlights || 0); }); } catch (e) {}
    var starOn = !!((mc.star && mc.star.enabled) || mc.starCeiling || has('star_ceiling'));
    var m = {
      title: cfg.client.project || 'Your Cinema',
      styleLabel: st ? st.label : '',
      styleNote: st ? st.note : '',
      client: cfg.client.name, project: cfg.client.project,
      quoteRef: cfg._lastRef,
      room: ctx.room, seating: ctx.seating,
      performanceLevel: meta.performanceLevel || null,
      introText: 'A dedicated home cinema, designed as one system — picture, sound, acoustics, lighting and interior finishes engineered together. This proposal sets out the design specification for your room; commercials follow on the formal quotation.',
      heroImage: (CFG.heroImage || null),
      video: (av.video.type || mv.viewingDistance || ms.w || meta.videoType) ? {
        display: (av.video.type === 'tv' && avName(av.video.tvId))
          ? avName(av.video.tvId) + (av.video.tvSizeIn ? ' · ' + av.video.tvSizeIn + '" reference TV' : ' reference TV')
          : (VIDEO_TYPE_LABEL[av.video.type || meta.videoType] || (meta.videoType || null)),
        screenW: ms.w || null, screenH: ms.h || null,
        bottomFromFloor: ms.bottomFromFloor || null,
        viewingDistance: mv.viewingDistance || mst.mlpDist || null,
        contentRes: mv.contentRes || null,
        projector: (av.video.type !== 'tv' ? avName(av.video.projectorId) : null) || meta.projector || null,
        screenGain: mv.screenGain || null
      } : null,
      audio: (av.audio.config || ma.atmosConfig) ? {
        headline: (av.audio.config || ma.atmosConfig) + ' immersive audio',
        recipe: meta.speakerRecipe || null,
        mlpDist: mst.mlpDist || null,
        earHeight: mst.earHeight || null,
        channels: (function () {
          var ac = atmosCfg(), out = [];
          (CFG.channelGroups || []).forEach(function (g) {
            var qty = g.qty(ac);
            if (qty && av.audio.picks[g.id]) out.push({ label: g.label, qty: qty, model: avName(av.audio.picks[g.id]) });
          });
          if (av.audio.subId) out.push({ label: 'Subwoofers', qty: av.audio.subQty || 1, model: avName(av.audio.subId) });
          return out;
        })(),
        processor: avName(av.audio.processorId),
        amplifier: avName(av.audio.ampId)
      } : null,
      lightingHeadline: fits.length ? fits.map(function (f) { return f.label; }).slice(0, 3).join(' · ') + (fits.length > 3 ? ' +' : '') : null,
      led: (has('led_perimeter') || has('riser_light') || has('shelf_light') || (mc.ledCove && mc.ledCove.enabled)) ? {
        cove: has('led_perimeter') || (mc.ledCove && mc.ledCove.enabled),
        covePower: (mc.ledCove && mc.ledCove.powerWPerM) || null,
        riser: has('riser_light'),
        shelf: has('shelf_light'),
        wallWash: has('wall_wash')
      } : null,
      star: starOn ? {
        panelMode: (mc.star && mc.star.panelMode) || null,
        dropHeight: mc.dropHeight || null,
        ring: (mc.ring && mc.ring.front) || null,
        downlights: dl || null
      } : null,
      slots: (CFG.slots || []).map(function (sl) {
        var it = E.item(cfg.picks[sl.id]);
        return it ? { slot: sl.label, name: it.name, manufacturer: it.manufacturer, hex: it.hex, swatchImg: it.swatch_img, note: it.note, tier: it.tier, colourways: (it.metadata && it.metadata.colours_available) || null } : null;
      }).filter(Boolean),
      fittings: fits.map(function (f) { return { label: f.label, hint: f.hint, qty: (f.id === 'downlight' && dl) ? dl + ' fittings' : null }; }),
      scenes: scenes(),
      colourTemp: CFG.colourTemp,
      termsLines: CFG.termsLines || [],
      dateText: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    m.filename = 'sonor-cinema-proposal-' + (m.quoteRef || 'draft') + '.pdf';
    return m;
  }
  async function savePdf() {
    cfg._lastRef = makeRef();
    var m = pdfModel();
    if (global.AestheticPdf && global.AestheticPdf.available()) {
      try { await global.AestheticPdf.generate(m); return; } catch (e) { console.warn('[aesthetic] pdf failed', e); }
    }
    window.print();
  }

  global.AestheticApp = {
    boot: boot, enter: enter, backToIntro: backToIntro, goBack: goBack, jumpTo: jumpTo,
    setStyle: setStyle, pick: pick, toggleFitting: toggleFitting, setClient: setClient,
    saveConfig: saveConfig, openSaved: openSaved, savePdf: savePdf, setAv: setAv,
    _debug: function () { return { cfg: cfg, ctx: ctx }; }   // harness hook (headless render tests)
  };
})(window);
