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
      audio: { config: '5.1.4', grade: null, showAllBrands: false, picks: {}, subId: null, subQty: 2, processorId: null, ampId: null },
      // v0.7.0 — PER-ASPECT grades (silver projector + gold speakers is valid).
      // audio.grade kept only as a legacy field for saved-board migration.
      grades: { video: null, speakers: null, electronics: null }
    },
    options: {},                     // v0.7.0 — dynamic Library option groups: cat -> id | {id:true}
    // v0.4.0 — full design scope
    design: {
      ceiling: 'star',               // ceilingTreatments id — MUTUALLY EXCLUSIVE
      riser: 'single',               // riserOptions id
      downlightGrade: 'orluna',      // downlightGrades id
      sconces: false,                // wall lights — TBC when true
      sconcesNotes: '',
      ledZones: { coffer: true, step_nose: true, riser_front: true },
      joineryNotes: '',
      sundries: {},                  // sundryId -> true
      sundriesNotes: ''
    },
    fittings: {},                    // fittingTypeId -> true
    scenes: null,                    // null = defaults / brief-driven
    client: { name: '', project: '' },
    projectId: null,
    _savedId: null,
    _savedLabel: null,               // v0.8.0 — label of the loaded board (scheme publish)
    _seatingSel: null,               // v0.8.0 — chosen seating config {id,label} for the scheme
    _lastRef: null
  };
  var ctx = { room: null, seating: null, brief: null, meta: null, renders: null, palette: null, spec: null, seatCount: null };   // live cross-app context

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
    normalizeDesign();   // v0.7.0 — adopt Library ids for zones / downlight grades
  }
  // v0.7.0 — migrate saved boards: legacy single av.audio.grade → per-aspect grades
  function migrateCfg(c) {
    if (!c) return;
    if (!c.options) c.options = {};
    if (c.av) {
      if (!c.av.grades) c.av.grades = { video: null, speakers: null, electronics: null };
      var legacy = c.av.audio && c.av.audio.grade;
      if (legacy && !c.av.grades.speakers && !c.av.grades.electronics) {
        c.av.grades.speakers = legacy;
        c.av.grades.electronics = legacy === 'wisdom' ? 'platinum' : legacy;
      }
    }
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
  // v0.7.0 — per-aspect grade resolution
  function gradeDef(aspect) {
    var id = cfg.av.grades && cfg.av.grades[aspect];
    return id ? ((CFG.avGrades || []).find(function (g) { return g.id === id; }) || null) : null;
  }
  function gradesForAspect(aspect) {
    var allow = (CFG.avGradeAspects || {})[aspect];
    return (CFG.avGrades || []).filter(function (g) { return !allow || allow.indexOf(g.id) >= 0; });
  }
  function gradeColour(id) { return (CFG.avGradeColours || {})[id] || '#8a8a8a'; }
  function gradeAspectNote(aspect, id) { var n = (CFG.avGradeAspectNotes || {})[aspect]; return (n && n[id]) || ''; }
  // legacy shim — the receiver soft-filter + Wisdom TBC now key on their aspects
  function avGradeOf() { return gradeDef('electronics'); }
  function wisdomOn() { return (cfg.av.grades && cfg.av.grades.speakers) === 'wisdom'; }
  function gradeChipsHtml(aspect) {
    var cur = cfg.av.grades[aspect];
    var h = '<div class="gr-row">';
    gradesForAspect(aspect).forEach(function (g) {
      var on = cur === g.id;
      h += '<button class="gr-chip' + (on ? ' on' : '') + '" style="--tier:' + gradeColour(g.id) + '" ' +
        'onclick="AestheticApp.setAv(\'grades.' + aspect + '\',' + (on ? 'null' : '\'' + g.id + '\'') + ')">' +
        '<span class="gr-dot"></span>' + esc(g.label) + '</button>';
    });
    h += '</div>';
    var note = cur ? gradeAspectNote(aspect, cur) : '';
    h += '<div class="hint" style="margin-top:7px;min-height:14px">' + (note ? esc(note) : 'Optional — pick the class this aspect is specified to.') + '</div>';
    return h;
  }
  function avLinks(id) { var d = id && E.avItem(id); return d ? { url: d.product_url || null, datasheet: d.datasheet_url || null, img: d.img || null } : {}; }
  function avSelectHtml(cat, path, current, allowNone) {
    var items = E.avByCategory(cat);
    if (!items.length) return '<div class="hint">Library device catalogue unavailable — connect once online.</div>';
    // soft-filter the PROCESSOR picker only to the grade's marques (current pick kept).
    // Amps are always a free manual choice (Sonance / Triad / others) — never grade-locked.
    var g = avGradeOf();
    if (g && !cfg.av.audio.showAllBrands && cat === 'receiver' && g.brands[cat] && g.brands[cat].length) {
      var keep = g.brands[cat];
      var filtered = items.filter(function (d) { return keep.indexOf(d.make) >= 0 || d.model_id === current; });
      if (filtered.length) items = filtered;
    }
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
    if (path === 'video.type' || path === 'audio.config' || path.indexOf('grades.') === 0) renderStep(); else updateAvLive();
  }
  function updateAvLive() { var el = $('avLive'); if (el) el.innerHTML = avSummaryHtml(); }

  // ── v0.7.0 — dynamic Library option groups ──────────────────────────────
  // Rows carrying metadata.select_mode are OPTION rows (one|multi|toggle|grade);
  // rows without stay finish/swatch entries. Menus filter on this so the new
  // Library data lands in the right place — and legacy/new duplicates dedupe
  // by normalised name, preferring the Library's new opt-* rows.
  function normName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function dedupePreferOpt(items) {
    var byName = {};
    items.forEach(function (it) {
      var k = normName(it.name), prev = byName[k];
      if (!prev) { byName[k] = it; return; }
      var newOpt = String(it.id).indexOf('opt-') === 0, oldOpt = String(prev.id).indexOf('opt-') === 0;
      if (newOpt && !oldOpt) byName[k] = it;   // Library's curated opt-* row wins
    });
    return items.filter(function (it) { return byName[normName(it.name)] === it; });
  }
  function selectMode(it) { return (it.metadata && it.metadata.select_mode) || null; }
  function libOpts(cat) { return dedupePreferOpt(E.byCategory(cat).filter(function (it) { return !!selectMode(it); })); }
  function libFinishes(cat) { return dedupePreferOpt(E.byCategory(cat).filter(function (it) { return !selectMode(it); })); }

  function optionGroupHtml(gr) {
    var items = libOpts(gr.cat);
    if (!items.length) return '';
    var mode = selectMode(items[0]) || 'one';
    var h = '<div class="panel" style="margin-bottom:14px"><div class="ptt">' + esc(gr.label) + ' <span class="opt-tag">· ' + esc(gr.hint || '') + '</span></div>';
    if (mode === 'one') {
      h += '<div class="mat-grid">';
      items.forEach(function (it) {
        var on = cfg.options[gr.cat] === it.id;
        h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.setOption(\'' + gr.cat + '\',' + (on ? 'null' : '\'' + it.id + '\'') + ')">' +
          '<div class="mc-name">' + esc(it.name) + '</div>' +
          (it.note ? '<div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(it.note) + '</div>' : '') + '</button>';
      });
      h += '</div>';
    } else {   // multi / toggle → checklist
      items.forEach(function (it) {
        var sel = cfg.options[gr.cat];
        var on = !!(sel && typeof sel === 'object' && sel[it.id]);
        h += '<label class="fin"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="AestheticApp.toggleOption(\'' + gr.cat + '\',\'' + it.id + '\',this.checked)">' +
          '<span class="fin-b"><span class="fin-n">' + esc(it.name) + '</span><span class="fin-d">' + esc(it.note || '') + '</span></span></label>';
      });
    }
    return h + '</div>';
  }
  function optionGroupsFor(step) {
    return (CFG.optionGroups || []).filter(function (g) { return g.step === step; }).map(optionGroupHtml).join('');
  }
  function setOption(cat, id) { if (id == null) delete cfg.options[cat]; else cfg.options[cat] = id; renderStep(); }
  function toggleOption(cat, id, on) {
    var sel = cfg.options[cat];
    if (!sel || typeof sel !== 'object') sel = cfg.options[cat] = {};
    if (on) sel[id] = true; else delete sel[id];
    if (!Object.keys(sel).length) delete cfg.options[cat];
  }
  // selections resolved to library items — for summary/PDF
  function optionSelections() {
    var out = [];
    (CFG.optionGroups || []).forEach(function (gr) {
      var sel = cfg.options[gr.cat];
      if (!sel) return;
      var ids = typeof sel === 'object' ? Object.keys(sel) : [sel];
      var names = ids.map(function (id) { var it = E.item(id); return it ? it.name : null; }).filter(Boolean);
      if (names.length) out.push({ cat: gr.cat, label: gr.label, names: names });
    });
    return out;
  }

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
    // v0.7.0 — per-aspect video grade (a Silver projector can sit with Gold speakers)
    h += '<div class="panel"><div class="ptt">Video grade <span class="opt-tag">· the class this aspect is specified to</span></div>' + gradeChipsHtml('video') + '</div>';
    h += optionGroupsFor('video');
    h += '</div>';
    h += '<div class="panel sticky"><div class="ptt">Your AV selection</div><div id="avLive">' + avSummaryHtml() + '</div></div>';
    h += '</div>';
    return h;
  }

  // ── step 3 · audio ───────────────────────────────────────────────────────
  function renderAudio() {
    var a = cfg.av.audio, ac = atmosCfg();
    var h = '<div class="lead"><h2>Audio system.</h2><p>Pick the system grade and immersive layout, then each channel group by manufacturer — fronts, centre, surrounds, heights and subs are chosen separately.</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    // v0.7.0 — loudspeaker grade (per-aspect; Wisdom = 5th tier, speakers only)
    h += '<div class="panel"><div class="ptt">Loudspeaker grade <span class="opt-tag">· bronze to wisdom — the speaker package class</span></div>' + gradeChipsHtml('speakers') + '</div>';
    h += '<div class="panel"><div class="ptt">Immersive layout</div><div class="opts">';
    (CFG.atmosConfigs || []).forEach(function (c) {
      h += '<button class="opt' + (a.config === c.id ? ' on' : '') + '" onclick="AestheticApp.setAv(\'audio.config\',\'' + c.id + '\')">' + c.id + '</button>';
    });
    h += '</div><div class="hint" style="margin-top:8px">' + esc(ac.id) + ' — ' + (3 + ac.surrounds + ac.rears) + ' bed channels · ' + ac.heights + ' heights · LFE</div></div>';
    if (wisdomOn()) {
      var wg = (CFG.avGrades || []).find(function (g) { return g.id === 'wisdom'; });
      h += '<div class="fitwarn tight" style="border-radius:11px;padding:12px 15px;font-size:12px;background:rgba(224,160,90,.1);border:1px solid rgba(224,160,90,.4);color:#e8c9a0;margin-bottom:2px">' + esc((wg && wg.tbc) || 'Wisdom Audio system TBC') + ' — speaker picks below stay provisional.</div>';
    }
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
    h += '<div class="panel"><div class="ptt">Electronics <span class="opt-tag">· grade soft-filters the processor picker — amps stay a free choice</span></div>' +
      gradeChipsHtml('electronics') +
      (cfg.av.grades.electronics ? '<label class="toggle" style="margin:8px 0 2px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" ' + (a.showAllBrands ? 'checked' : '') + ' onchange="AestheticApp.setAv(\'audio.showAllBrands\', this.checked); AestheticApp.jumpRefresh()"> Show all brands in the electronics pickers</label>' : '') +
      '<div class="lbl">AV receiver / processor</div>' + avSelectHtml('receiver', 'audio.processorId', a.processorId, true) +
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
    var h = rows.map(function (r) {
      return '<div style="padding:7px 0;border-bottom:1px solid var(--brd2)"><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">' + esc(r[0]) + '</div><div style="font-size:12.5px;color:var(--cream);margin-top:2px">' + esc(r[1] || '—') + '</div></div>';
    }).join('');
    // v0.7.0 — per-aspect grade badges
    var chips = (CFG.gradeAspects || []).map(function (asp) {
      var g = gradeDef(asp.id);
      if (!g) return '';
      return '<span class="gr-chip mini on" style="--tier:' + gradeColour(g.id) + '"><span class="gr-dot"></span>' + esc(asp.label.replace(' grade', '')) + ' · ' + esc(g.label) + (g.id === 'wisdom' ? ' (TBC)' : '') + '</span>';
    }).filter(Boolean).join('');
    if (chips) h += '<div style="padding:8px 0 3px"><div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Grades</div><div class="gr-row">' + chips + '</div></div>';
    return h;
  }

  // ── step 1 · scheme ──────────────────────────────────────────────────────
  function renderScheme() {
    var d = cfg.design;
    var h = '<div class="lead"><h2>Set the scheme.</h2><p>Design direction, ceiling treatment and tiered seating. The live room and seating below come straight from your cinema design — nothing is retyped.</p></div>';
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
    // ceiling treatment — mutually exclusive
    h += '<div class="panel" style="margin-top:14px"><div class="ptt">Ceiling treatment <span class="opt-tag">· one route — star ceiling excludes painted / panels</span></div><div class="mat-grid">';
    (CFG.ceilingTreatments || []).forEach(function (t) {
      var on = d.ceiling === t.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.setDesign(\'ceiling\',\'' + t.id + '\')">' +
        '<div class="mc-name">' + esc(t.label) + '</div><div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(t.note) + '</div></button>';
    });
    h += '</div></div>';
    // tiered seating
    h += '<div class="panel" style="margin-top:14px"><div class="ptt">Tiered seating <span class="opt-tag">· design intent — riser geometry stays in the Cinema Takeoff</span></div><div class="mat-grid">';
    (CFG.riserOptions || []).forEach(function (r) {
      var on = d.riser === r.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.setDesign(\'riser\',\'' + r.id + '\')">' +
        '<div class="mc-name">' + esc(r.label) + '</div><div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(r.note) + '</div></button>';
    });
    h += '</div></div>';
    h += '<div style="margin-top:14px">' + optionGroupsFor('scheme') + '</div>';
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

  // ── materials (+ joinery notes + sundries) ───────────────────────────────
  var PSEUDO_ITEMS = {
    _none:    { id: '_none',    name: 'None / Existing', note: 'Retain the existing finish — nothing supplied' },
    _painted: { id: '_painted', name: 'Painted Finish',  note: 'Decorated — colour from the scheme palette' }
  };
  function slotVisible(sl) {
    if (sl.when === 'ceilingMaterial') {
      // ceiling finish pick only applies to panel / stretched-fabric treatments
      return cfg.design.ceiling === 'panels' || cfg.design.ceiling === 'fabric';
    }
    return true;
  }
  function renderMaterials() {
    var h = '<div class="lead"><h2>Fabrics &amp; finishes.</h2><p>One pick per surface — or none / painted where that is the right answer. Swatches come from the Sonor aesthetic library; physical samples follow before anything is ordered.</p></div>';
    (CFG.slots || []).forEach(function (sl) {
      if (!slotVisible(sl)) return;
      var items = libFinishes(sl.cat);   // v0.7.0 — option rows (select_mode) stay out of finish menus
      h += '<div class="panel" style="margin-bottom:14px"><div class="ptt">' + esc(sl.label) + ' <span class="opt-tag">· ' + esc(sl.hint || '') + '</span></div>';
      if (!items.length && !sl.optional) { h += '<div class="hint">No library entries yet for this surface.</div></div>'; return; }
      h += '<div class="mat-grid">';
      if (sl.optional) {
        ['_none', '_painted'].forEach(function (pid) {
          var p = PSEUDO_ITEMS[pid], on = cfg.picks[sl.id] === pid;
          h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.pick(\'' + sl.id + '\',\'' + pid + '\')">' +
            '<div class="mc-top"><span class="mc-name">' + esc(p.name) + '</span></div>' +
            '<div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(p.note) + '</div></button>';
        });
      }
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
    // v0.7.0 — dynamic Library option groups (wall treatment, acoustics, cabinetry)
    h += optionGroupsFor('materials');
    // joinery & cabinetry notes
    h += '<div class="panel" style="margin-bottom:14px"><div class="ptt">Joinery &amp; cabinetry notes <span class="opt-tag">· media wall, shelving, counters — free notes for the design pack</span></div>' +
      '<textarea rows="3" style="width:100%;background:var(--bg3);border:1px solid var(--brd2);border-radius:7px;color:var(--cream);padding:10px 12px;font-size:12.5px;font-family:inherit;resize:vertical" ' +
      'placeholder="e.g. full-height media wall in charcoal oak, shelf recesses with LED, hidden equipment cupboard…" ' +
      'onchange="AestheticApp.setDesign(\'joineryNotes\', this.value)">' + esc(cfg.design.joineryNotes || '') + '</textarea></div>';
    // sundries & accessories — Library 'sundry' category when curated, config fallback
    // (v0.7.0: legacy su-* rows dedupe against the Library's new opt-* rows)
    var sundries = dedupePreferOpt(E.byCategory('sundry'));
    var list = sundries.length ? sundries.map(function (it) { return { id: it.id, label: it.name, hint: it.note || '' }; }) : (CFG.sundries || []);
    h += '<div class="panel"><div class="ptt">Sundries &amp; accessories <span class="opt-tag">· the finishing kit — tick everything in scope</span></div>';
    list.forEach(function (s) {
      var on = !!cfg.design.sundries[s.id];
      h += '<label class="fin"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="AestheticApp.toggleSundry(\'' + s.id + '\',this.checked)">' +
        '<span class="fin-b"><span class="fin-n">' + esc(s.label) + '</span><span class="fin-d">' + esc(s.hint || '') + '</span></span></label>';
    });
    h += '<textarea rows="2" style="width:100%;margin-top:10px;background:var(--bg3);border:1px solid var(--brd2);border-radius:7px;color:var(--cream);padding:10px 12px;font-size:12.5px;font-family:inherit;resize:vertical" ' +
      'placeholder="Other sundries / notes…" onchange="AestheticApp.setDesign(\'sundriesNotes\', this.value)">' + esc(cfg.design.sundriesNotes || '') + '</textarea></div>';
    return h;
  }

  // ── lighting ─────────────────────────────────────────────────────────────
  // v0.7.0 — downlight grades + LED zones PREFER the Library's curated rows
  // (downlight_grade / led_zone categories); config lists stay as fallback.
  function dlSrc() {
    var lib = E.byCategory('downlight_grade').filter(function (it) { return !!selectMode(it); });
    if (!lib.length) return CFG.downlightGrades || [];
    return lib.slice().sort(function (a, b) { return (a.tier || 0) - (b.tier || 0); }).map(function (it) {
      var mch = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(it.name || '');
      var tierTxt = mch ? (mch[2].charAt(0).toUpperCase() + mch[2].slice(1)) : (it.tier ? 'Tier ' + it.tier : '');
      return { id: it.id, label: mch ? mch[1] : it.name, tier: tierTxt, note: it.note || '' };
    });
  }
  function zonesSrc() {
    var lib = libOpts('led_zone');
    if (!lib.length) return CFG.ledZones || [];
    return lib.map(function (it) { return { id: it.id, label: it.name, hint: it.note || '' }; });
  }
  function normalizeDesign() {
    // remap config-era default ids onto Library ids once the curated rows exist
    var zs = zonesSrc();
    if (zs.length && !zs.some(function (z) { return cfg.design.ledZones[z.id]; })) {
      var map = { coffer: /cove|coffer/i, pilaster: /pilaster/i, step_nose: /step/i, accent: /accent|wash/i, backlit_poster: /poster/i, shelf: /shelf|display/i, riser_front: /riser/i };
      var nz = {};
      Object.keys(cfg.design.ledZones).forEach(function (k) {
        var re = map[k]; if (!re) return;
        var hit = zs.find(function (z) { return re.test(z.label); });
        if (hit) nz[hit.id] = true;
      });
      if (Object.keys(nz).length) cfg.design.ledZones = nz;
    }
    var dg = dlSrc();
    if (dg.length && !dg.some(function (g) { return g.id === cfg.design.downlightGrade; })) {
      var hitG = dg.find(function (g) { return /orluna/i.test(g.label); }) || dg[dg.length - 1];
      cfg.design.downlightGrade = hitG.id;
    }
  }
  function renderLighting() {
    var d = cfg.design;
    var h = '<div class="lead"><h2>Lighting.</h2><p>Downlight grade, LED zones, fittings and scenes — warm, calm and dimmable throughout. ' + esc(CFG.colourTemp || '') + '</p></div>';
    h += '<div class="cfg-grid"><div class="cfg-left">';
    // downlight grade ladder
    h += '<div class="panel"><div class="ptt">Downlight grade <span class="opt-tag">· essential to bespoke</span></div><div class="mat-grid">';
    dlSrc().forEach(function (g) {
      var on = d.downlightGrade === g.id;
      h += '<button class="mcard' + (on ? ' on' : '') + '" onclick="AestheticApp.setDesign(\'downlightGrade\',\'' + g.id + '\')">' +
        '<div class="mc-name">' + esc(g.label) + '</div><div class="mc-meta">' + esc(g.tier) + '</div>' +
        '<div class="mc-price" style="font-size:10.5px;line-height:1.45">' + esc(g.note) + '</div></button>';
    });
    h += '</div></div>';
    // LED zones checklist
    h += '<div class="panel"><div class="ptt">LED zones <span class="opt-tag">· concealed linear runs — tick all in scope</span></div>';
    zonesSrc().forEach(function (z) {
      var on = !!d.ledZones[z.id];
      h += '<label class="fin"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="AestheticApp.toggleZone(\'' + z.id + '\',this.checked)">' +
        '<span class="fin-b"><span class="fin-n">' + esc(z.label) + '</span><span class="fin-d">' + esc(z.hint || '') + '</span></span></label>';
    });
    h += '</div>';
    // wall lights / sconces — TBC by nature
    h += '<div class="panel"><div class="ptt">Wall lights / sconces <span class="opt-tag">· endless options — held as TBC for design development</span></div>' +
      '<label class="fin"><input type="checkbox" ' + (d.sconces ? 'checked' : '') + ' onchange="AestheticApp.setDesign(\'sconces\', this.checked); AestheticApp.jumpRefresh()">' +
      '<span class="fin-b"><span class="fin-n">Include wall lights / sconces</span><span class="fin-d">Carried in the proposal as TBC — shortlist agreed at design development</span></span></label>' +
      (d.sconces ? '<textarea rows="2" style="width:100%;margin-top:8px;background:var(--bg3);border:1px solid var(--brd2);border-radius:7px;color:var(--cream);padding:10px 12px;font-size:12.5px;font-family:inherit;resize:vertical" placeholder="Direction of travel — e.g. brass half-moon, fabric shade, art deco fin…" onchange="AestheticApp.setDesign(\'sconcesNotes\', this.value)">' + esc(d.sconcesNotes || '') + '</textarea>' : '') +
      '</div>';
    // other fittings
    h += '<div class="panel"><div class="ptt">Fittings</div>';
    (CFG.fittingTypes || []).forEach(function (ft) {
      var on = !!cfg.fittings[ft.id];
      h += '<label class="fin"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="AestheticApp.toggleFitting(\'' + ft.id + '\',this.checked)">' +
        '<span class="fin-b"><span class="fin-n">' + esc(ft.label) + '</span><span class="fin-d">' + esc(ft.hint || '') + '</span></span></label>';
    });
    h += '</div>';
    h += optionGroupsFor('lighting');   // v0.7.0 — control system etc.
    h += '</div>';
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
    // v0.7.1 — project palette (devised from the client concept render)
    if (ctx.palette) {
      h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Project palette <span class="opt-tag">· ' + esc(ctx.palette.source || 'from the client concept') + '</span></div><div class="pal-row">';
      (ctx.palette.swatches || []).forEach(function (p) {
        h += '<div class="pal-chip"><span class="pal-sw" style="background:' + esc(p.hex) + '"></span><span class="pal-n">' + esc(p.name) + '</span><span class="pal-x">' + esc(p.hex) + '</span></div>';
      });
      h += '</div></div>';
    }
    // board strip — every surface pick as a swatch cell
    h += '<div class="strip">';
    (CFG.slots || []).filter(slotVisible).forEach(function (sl) {
      var it = itemOf(cfg.picks[sl.id]);
      if (!it || it.id === '_none') return;
      var hasSw = !!(it.swatch_img || it.hex);
      var sw = it.swatch_img ? 'background-image:url(\'' + esc(it.swatch_img) + '\');background-size:cover' : 'background:' + (it.hex || '#444');
      h += '<div class="cellx"><div class="cl">' + esc(sl.label) + '</div><div style="display:flex;align-items:center;gap:9px;margin-top:6px">' + (hasSw ? '<span class="mc-sw" style="' + sw + ';width:22px;height:22px"></span>' : '') + '<span class="cv" style="font-size:13.5px;margin:0">' + esc(it.name) + '</span></div>' + (it.manufacturer ? '<div class="cn">' + esc(it.manufacturer) + '</div>' : '') + '</div>';
    });
    h += '</div>';
    // design scope summary
    var ct = (CFG.ceilingTreatments || []).find(function (t) { return t.id === cfg.design.ceiling; });
    var ro = (CFG.riserOptions || []).find(function (r) { return r.id === cfg.design.riser; });
    var g = gradeOf(), zn = zonesList(), sn = sundriesList();
    h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Design scope</div><div style="font-size:12.5px;line-height:1.9">' +
      (ct ? '<div><span style="color:var(--muted)">Ceiling · </span>' + esc(ct.label) + '</div>' : '') +
      (ro ? '<div><span style="color:var(--muted)">Seating tiers · </span>' + esc(ro.label) + '</div>' : '') +
      (g ? '<div><span style="color:var(--muted)">Downlights · </span>' + esc(g.label + ' (' + g.tier + ')') + '</div>' : '') +
      (zn.length ? '<div><span style="color:var(--muted)">LED zones · </span>' + esc(zn.map(function (z) { return z.label; }).join(', ')) + '</div>' : '') +
      (cfg.design.sconces ? '<div><span style="color:var(--muted)">Sconces · </span>Included — TBC at design development</div>' : '') +
      (sn.length ? '<div><span style="color:var(--muted)">Sundries · </span>' + esc(sn.map(function (s) { return s.label; }).join(', ')) + '</div>' : '') +
      (cfg.design.joineryNotes ? '<div><span style="color:var(--muted)">Joinery · </span>' + esc(cfg.design.joineryNotes) + '</div>' : '') +
      optionSelections().map(function (o) { return '<div><span style="color:var(--muted)">' + esc(o.label) + ' · </span>' + esc(o.names.join(', ')) + '</div>'; }).join('') +
      '</div></div>';
    // AV summary
    h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Video &amp; audio</div>' + avSummaryHtml() + '</div>';
    // lighting summary
    var fits = (CFG.fittingTypes || []).filter(function (f) { return cfg.fittings[f.id]; }).map(function (f) { return f.label; });
    h += '<div class="panel" style="margin-bottom:18px"><div class="ptt">Lighting</div><div style="font-size:13px;line-height:1.7">' + esc(fits.join(' · ') || '—') + '</div>' +
      '<div class="hint">' + scenes().map(function (s) { return esc(s.label); }).join(' · ') + ' scenes · ' + esc(CFG.colourTemp || '') + '</div></div>';
    h += '<div class="actions">' +
      (!CLIENT ? '<button class="btn ghost" onclick="AestheticApp.saveConfig()">Save board</button>' : '') +
      (!CLIENT ? '<button class="btn ghost" onclick="AestheticApp.openMoodBoard()">Bespoke Cinema Design Concept</button>' : '') +
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
  function setDesign(k, v) { cfg.design[k] = v; if (k === 'ceiling' || k === 'riser' || k === 'downlightGrade') renderStep(); }
  function toggleZone(id, on) { if (on) cfg.design.ledZones[id] = true; else delete cfg.design.ledZones[id]; }
  function toggleSundry(id, on) { if (on) cfg.design.sundries[id] = true; else delete cfg.design.sundries[id]; }
  function jumpRefresh() { renderStep(); }
  function setClient(k, v) { cfg.client[k] = v; }
  function styleOf() { return (CFG.styles || []).find(function (s) { return s.id === cfg.scheme.style; }) || null; }
  function itemOf(id) { return (id && PSEUDO_ITEMS[id]) || E.item(id); }
  function gradeOf() { return dlSrc().find(function (g) { return g.id === cfg.design.downlightGrade; }) || null; }
  function zonesList() { return zonesSrc().filter(function (z) { return cfg.design.ledZones[z.id]; }); }
  function sundriesList() {
    var lib = dedupePreferOpt(E.byCategory('sundry'));
    var src = lib.length ? lib.map(function (it) { return { id: it.id, label: it.name }; }) : (CFG.sundries || []);
    return src.filter(function (s) { return cfg.design.sundries[s.id]; });
  }

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
    ctx.room = null; ctx.seating = null; ctx.brief = null; ctx.meta = null; ctx.renders = null; ctx.palette = null; cfg.scenes = null;
    var p = detail && detail.project;
    if (p) {
      cfg.client.name = p.client_name || cfg.client.name;
      cfg.client.project = (p.address || p.name || '').split('\n')[0].split(',')[0] || cfg.client.project;
    }
    cfg._seatingSel = null;   // re-adopted from the incoming project's spec
    await pullContext();
    loadSavedList();
    loadOverview();           // v0.8.0 — landing overview
    renderStep();
  }
  async function pullContext() {
    var db = dbc(); if (!db || !cfg.projectId) return;
    try {   // room + full technical metadata from Cinema Design / Cinema Takeoff
      var r = await db.from('cinema_designs').select('room_width,room_depth,room_height,seat_count,meta:ct_state->metadata').eq('project_id', cfg.projectId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (r.data) {
        ctx.room = { w: r.data.room_width, d: r.data.room_depth, h: r.data.room_height };
        ctx.seatCount = r.data.seat_count || null;
        ctx.meta = r.data.meta || null;   // ct_state.metadata — video/audio/coffer/seating spec
      }
    } catch (e) {}
    try {   // active seating config (range + label) — the seat fabric context
      var s = await db.from('seating_configs').select('label,range_id,updated_at').eq('project_id', cfg.projectId).eq('archived', false).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (s.data) ctx.seating = (s.data.label || s.data.range_id || '').toString();
    } catch (e) {}
    try {   // client brief + design renders
      var b = await db.from('projects').select('metadata').eq('id', cfg.projectId).maybeSingle();
      var md = (b.data && b.data.metadata) || {};
      if (md.brief) ctx.brief = md.brief;
      ctx.renders = Array.isArray(md.design_renders) ? md.design_renders : null;   // [{url, caption}]
      // v0.7.1 — project palette devised from the client concept (design_palette
      // {source, swatches:[{name,hex,note}]}) — drives the board page + app chips
      ctx.palette = (md.design_palette && Array.isArray(md.design_palette.swatches) && md.design_palette.swatches.length) ? md.design_palette : null;
      // v0.8.0 — the published spec (read back for the landing overview + scheme marks)
      ctx.spec = md.design_spec || null;
      if (ctx.spec && ctx.spec.scheme && ctx.spec.scheme.seating_config_id && !cfg._seatingSel) {
        cfg._seatingSel = { id: ctx.spec.scheme.seating_config_id, label: ctx.spec.scheme.seating_label || null };
      }
    } catch (e) {}
  }

  // ── v0.8.0 — landing overview: saved boards + seating configs, scheme pick ──
  // The front page lists every saved design board and seating config for the
  // active project; one board (+ one seating config) is chosen as THE scheme.
  // Choosing publishes design_spec.scheme so the master design PDF (Cinema
  // Designer) can state which design scheme it is based on. Flick freely —
  // each pick republishes.
  function fmtDate(s) { try { return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  async function loadOverview() {
    var sec = $('ovw');
    if (!sec) return;
    var db = dbc();
    if (CLIENT || !db || !cfg.projectId) { sec.style.display = 'none'; return; }
    var boards = [], seats = [];
    try {
      var rb = await db.from('aesthetic_configs').select('id,label,app_version,updated_at,config').eq('project_id', cfg.projectId).eq('archived', false).order('updated_at', { ascending: false }).limit(20);
      boards = rb.data || [];
    } catch (e) {}
    try {
      var rs = await db.from('seating_configs').select('id,label,range_id,updated_at').eq('project_id', cfg.projectId).eq('archived', false).order('updated_at', { ascending: false }).limit(20);
      seats = rs.data || [];
    } catch (e) {}
    renderOverview(boards, seats);
  }
  function renderOverview(boards, seats) {
    var sec = $('ovw');
    if (!sec) return;
    if (CLIENT || !cfg.projectId) { sec.style.display = 'none'; return; }
    sec.style.display = 'block';
    var spec = ctx.spec || {};
    var schemeId = (spec.scheme && spec.scheme.config_id) || spec.config_id || null;
    var seatSel = (cfg._seatingSel && cfg._seatingSel.id) || (spec.scheme && spec.scheme.seating_config_id) || null;
    var tt = $('ovwTitle');
    if (tt) tt.innerHTML = esc(cfg.client.project || 'This project') + ' — <span class="lt">saved schemes</span>.';
    var sm = $('ovwSummary');
    if (sm) {
      var bits = [];
      if (ctx.room && (ctx.room.w || ctx.room.d)) bits.push('Room ' + (ctx.room.w || '?') + ' × ' + (ctx.room.d || '?') + ' mm');
      if (ctx.seatCount) bits.push(ctx.seatCount + ' seats');
      if (ctx.seating) bits.push('Seating: ' + ctx.seating);
      if (spec.updated_at) {
        var schemeBoard = (boards || []).find(function (r) { return r.id === schemeId; });
        bits.push('Published scheme: ' + (schemeBoard ? (schemeBoard.label || 'board') : (spec.style || 'saved board')) + ' · ' + fmtDate(spec.updated_at) + ' · v' + (spec.app_version || '?'));
      } else {
        bits.push('No scheme published yet — choose a board below.');
      }
      sm.textContent = bits.join('  ·  ');
    }
    var bo = $('ovwBoards');
    if (bo) {
      bo.innerHTML = (boards && boards.length) ? boards.map(function (r) {
        var st = r.config && r.config.scheme && (CFG.styles || []).find(function (s) { return s.id === r.config.scheme.style; });
        var cur = r.id === schemeId;
        return '<div class="ovw-row' + (cur ? ' cur' : '') + '">' +
          '<div class="ovw-b"><div class="ovw-n">' + esc(r.label || 'Board') + (cur ? ' <span class="ovw-badge">✓ Scheme in use</span>' : '') + '</div>' +
          '<div class="ovw-d">' + esc(st ? st.label : '—') + ' · ' + fmtDate(r.updated_at) + ' · v' + esc(r.app_version || '') + '</div></div>' +
          '<button class="ovw-btn" onclick="AestheticApp.openFromOverview(\'' + r.id + '\')">Open</button>' +
          (cur ? '' : '<button class="ovw-btn gold" onclick="AestheticApp.useScheme(\'' + r.id + '\')">Use as scheme</button>') +
          '</div>';
      }).join('') : '<div class="ovw-hint">No boards yet for this project — start one below.</div>';
    }
    var se = $('ovwSeating');
    if (se) {
      se.innerHTML = (seats && seats.length) ? seats.map(function (r, i) {
        var cur = seatSel ? r.id === seatSel : false;
        var latest = !seatSel && i === 0;
        return '<div class="ovw-row' + (cur ? ' cur' : '') + '">' +
          '<div class="ovw-b"><div class="ovw-n">' + esc(r.label || r.range_id || 'Seating') + (cur ? ' <span class="ovw-badge">✓ With scheme</span>' : '') + '</div>' +
          '<div class="ovw-d">' + esc(r.range_id || '') + ' · ' + fmtDate(r.updated_at) + (latest ? ' · latest' : '') + '</div></div>' +
          (cur ? '' : '<button class="ovw-btn" onclick="AestheticApp.useSeating(\'' + r.id + '\',\'' + esc(String(r.label || r.range_id || '')).replace(/'/g, '') + '\')">Use with scheme</button>') +
          '</div>';
      }).join('') : '<div class="ovw-hint">No seating configs for this project — build one in the Seating Configurator.</div>';
    }
    var nt = $('ovwNote');
    if (nt) nt.textContent = 'The chosen scheme is published as the project’s confirmed design spec — Cinema Designer and the master design PDF reference the scheme it is based on.';
  }
  // load a board's config and make it THE project scheme (stays on the landing)
  async function useScheme(id) {
    var db = dbc(); if (!db || CLIENT) return;
    try {
      var res = await db.from('aesthetic_configs').select('id,label,config').eq('id', id).single();
      if (res.data && res.data.config) {
        var c = res.data.config;
        ['scheme', 'picks', 'av', 'design', 'fittings', 'scenes', 'client', 'options', 'moodboard'].forEach(function (k) { if (c[k] != null) cfg[k] = c[k]; });
        migrateCfg(cfg);
        normalizeDesign();
        cfg._savedId = res.data.id;
        cfg._savedLabel = res.data.label || null;
        await publishDesignSpec();
        await pullContext();      // re-read the published spec for the marks
        loadOverview();
      }
    } catch (e) { console.warn('[aesthetic] useScheme failed', e); }
  }
  async function useSeating(id, label) {
    if (CLIENT) return;
    cfg._seatingSel = { id: id, label: label || null };
    await publishDesignSpec();
    await pullContext();
    loadOverview();
  }
  function openFromOverview(id) { enter(); openSaved(id); }

  // ── saved boards (aesthetic_configs — this app's ONLY table writes) ──────
  async function saveConfig() {
    var db = dbc(); if (!db || CLIENT) return;
    var label = cfg.client.project || 'Mood board';
    var body = { project_name: cfg.client.project || null, project_id: cfg.projectId, label: label, config: cfg, app_version: CFG.version, updated_at: new Date().toISOString() };
    try {
      var res;
      if (cfg._savedId) res = await db.from('aesthetic_configs').update(body).eq('id', cfg._savedId).select('id').single();
      else res = await db.from('aesthetic_configs').insert(body).select('id').single();
      if (res.data) { cfg._savedId = res.data.id; cfg._savedLabel = label; }
      loadSavedList();
      publishDesignSpec();   // ONE SOURCE: confirmed settings → projects.metadata.design_spec
      loadOverview();        // v0.8.0 — landing list stays current
    } catch (e) { console.warn('[aesthetic] save failed', e); }
  }

  // ── ONE SOURCE OF CONFIRMED SETTINGS ─────────────────────────────────────
  // This app is the confirming source for the design + AV spec summary; Cinema
  // Designer and the Takeoff CONSUME projects.metadata.design_spec (read-only).
  // Written ONLY here, atomically via sonor_merge_project_metadata (single-key
  // merge — the RPC that ended the cross-project metadata leak class).
  async function publishDesignSpec() {
    var db = dbc(); if (!db || CLIENT || !cfg.projectId) return;
    try {
      var pid = cfg.projectId;                 // captured once (leak-class guard)
      var st = styleOf(), gr = avGradeOf(), ac = atmosCfg();
      var av = cfg.av, d = cfg.design;
      var channels = {};
      (CFG.channelGroups || []).forEach(function (g) {
        var qty = g.qty(ac);
        if (qty && av.audio.picks[g.id]) channels[g.id] = { qty: qty, model_id: av.audio.picks[g.id], name: avName(av.audio.picks[g.id]) };
      });
      var spec = {
        source: 'cinema-aesthetic', app_version: CFG.version,
        config_id: cfg._savedId || null, updated_at: new Date().toISOString(),
        // v0.8.0 — THE chosen scheme: which saved board (and seating config)
        // this project's design is based on. The master design PDF (Cinema
        // Designer) states: "Based on design scheme: {label} ({style_label})".
        scheme: {
          config_id: cfg._savedId || null,
          label: cfg._savedLabel || null,
          style: st ? st.id : null,
          style_label: st ? st.label : null,
          seating_config_id: (cfg._seatingSel && cfg._seatingSel.id) || null,
          seating_label: (cfg._seatingSel && cfg._seatingSel.label) || null,
          chosen_at: new Date().toISOString()
        },
        style: st ? st.id : null,
        ceiling: d.ceiling, riser: d.riser,
        downlight_grade: d.downlightGrade,
        led_zones: Object.keys(d.ledZones || {}),
        sconces: !!d.sconces,
        materials: (CFG.slots || []).filter(slotVisible).reduce(function (o, sl) { o[sl.id] = cfg.picks[sl.id] || null; return o; }, {}),
        // v0.7.0 — per-aspect grades + dynamic Library options are the spec now;
        // av.grade stays as a legacy alias (= electronics) for early consumers.
        grades: {
          video: av.grades.video || null,
          speakers: av.grades.speakers || null,
          electronics: av.grades.electronics || null
        },
        options: optionSelections().map(function (o) { return { category: o.cat, label: o.label, names: o.names }; }),
        av: {
          grade: av.grades.electronics || null,
          grade_tbc: wisdomOn() ? 'Wisdom Audio system TBC — pending Habitech experience centre visit' : null,
          video_type: av.video.type,
          tv: av.video.tvId ? { model_id: av.video.tvId, name: avName(av.video.tvId), size_in: av.video.tvSizeIn } : null,
          projector: av.video.projectorId ? { model_id: av.video.projectorId, name: avName(av.video.projectorId) } : null,
          atmos: av.audio.config,
          channels: channels,
          sub: av.audio.subId ? { model_id: av.audio.subId, name: avName(av.audio.subId), qty: av.audio.subQty } : null,
          processor: av.audio.processorId ? { model_id: av.audio.processorId, name: avName(av.audio.processorId) } : null,
          amplifier: av.audio.ampId ? { model_id: av.audio.ampId, name: avName(av.audio.ampId) } : null
        },
        sundries: Object.keys(d.sundries || {})
      };
      var res = await db.rpc('sonor_merge_project_metadata', { p_project_id: pid, p_patch: { design_spec: spec } });
      if (res.error) console.warn('[aesthetic] design_spec publish failed', res.error);
    } catch (e) { console.warn('[aesthetic] design_spec publish error', e); }
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
      var res = await db.from('aesthetic_configs').select('id,label,config').eq('id', id).single();
      if (res.data && res.data.config) {
        var c = res.data.config;
        ['scheme', 'picks', 'av', 'design', 'fittings', 'scenes', 'client', 'options', 'moodboard'].forEach(function (k) { if (c[k] != null) cfg[k] = c[k]; });
        migrateCfg(cfg);        // v0.7.0 — legacy single grade → per-aspect
        normalizeDesign();
        cfg._savedId = res.data.id;
        cfg._savedLabel = res.data.label || null;
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
  // v0.7.0 — the Library now feeds dynamic names into the PDF ("Coffer",
  // "Coffered bulkhead", "Side / coffee tables"…), so every string in the PDF
  // model runs through a safe-name pass: dictionary rewrites first, then a
  // last-resort 'ff' → 'f f' split so a broken glyph can never ship.
  function caseKeep(to) { return function (mch) { return mch.charAt(0) === mch.charAt(0).toUpperCase() ? to.charAt(0).toUpperCase() + to.slice(1) : to; }; }
  var PDF_SAFE = [
    [/ceiling\s+coffer/gi, caseKeep('ceiling cove')],
    [/coffered/gi, caseKeep('recessed')],
    [/coffer/gi, caseKeep('cove')],
    [/coffee/gi, caseKeep('lounge')],
    [/baffle\s*wall/gi, caseKeep('speaker wall')],
    [/baffle/gi, caseKeep('speaker wall')],
    [/″/g, '"']
  ];
  function pdfSafe(s) {
    var out = String(s);
    PDF_SAFE.forEach(function (r) { out = out.replace(r[0], r[1]); });
    return out.replace(/ff/g, 'f f').replace(/FF/g, 'F F').replace(/Ff/g, 'F f');
  }
  var SAFE_SKIP_KEYS = /url|img|image|filename|hex|datasheet|swatch/i;
  function deepSafe(o) {
    if (o == null) return o;
    if (typeof o === 'string') return pdfSafe(o);
    if (Array.isArray(o)) return o.map(deepSafe);
    if (typeof o === 'object') {
      Object.keys(o).forEach(function (k) {
        if (SAFE_SKIP_KEYS.test(k)) return;                 // links + assets untouched
        o[k] = deepSafe(o[k]);
      });
    }
    return o;
  }
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
    // star ceiling: the DESIGN choice rules (mutually exclusive with painted/panels);
    // CT coffer star data enriches the section when present
    var starOn = cfg.design.ceiling === 'star';
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
      renders: ctx.renders || null,
      palette: ctx.palette || null,   // v0.7.1 — {source, swatches:[{name,hex,note}]}
      // v0.7.0 — per-aspect grade badges (rendered in the app AND the PDF)
      grades: (function () {
        var o = {};
        (CFG.gradeAspects || []).forEach(function (asp) {
          var g = gradeDef(asp.id);
          if (g) o[asp.id] = { id: g.id, label: g.label, badgeHex: gradeColour(g.id), note: gradeAspectNote(asp.id, g.id), tbc: g.id === 'wisdom' };
        });
        return o;
      })(),
      // dynamic Library option selections → Design Scope section
      optionGroups: optionSelections().map(function (o) { return { label: o.label, names: o.names.slice() }; }),
      // conditional brand pages — ONLY when that system is actually selected
      brandPages: (function () {
        var spk = [], elec = [];
        Object.keys(av.audio.picks || {}).forEach(function (k) { var d = av.audio.picks[k] && E.avItem(av.audio.picks[k]); if (d) spk.push(d.make); });
        var ds = av.audio.subId && E.avItem(av.audio.subId); if (ds) spk.push(ds.make);
        [av.audio.processorId, av.audio.ampId].forEach(function (id) { var d = id && E.avItem(id); if (d) elec.push(d.make); });
        var all = spk.concat(elec), out = [];
        if (spk.some(function (mk) { return /m\s*&\s*k|mk\s*sound|miller/i.test(mk || ''); })) out.push('mk');
        if (all.some(function (mk) { return /sonance/i.test(mk || ''); })) out.push('sonance');
        if (wisdomOn() || all.some(function (mk) { return /wisdom/i.test(mk || ''); })) out.push('wisdom');
        return out;
      })(),
      video: (av.video.type || mv.viewingDistance || ms.w || meta.videoType) ? {
        display: (av.video.type === 'tv' && avName(av.video.tvId))
          ? avName(av.video.tvId) + (av.video.tvSizeIn ? ' · ' + av.video.tvSizeIn + '" reference TV' : ' reference TV')
          : (VIDEO_TYPE_LABEL[av.video.type || meta.videoType] || (meta.videoType || null)),
        displayLinks: av.video.type === 'tv' ? avLinks(av.video.tvId) : avLinks(av.video.projectorId),
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
        grade: (function () { var g = avGradeOf(); return g ? { label: g.label, note: g.note + (g.tbc ? ' (' + g.tbc + ')' : '') } : null; })(),
        // channel maths — bed = LCR + surrounds (+ rears); heights on top; LFE separate
        channelSummary: (function () {
          var ac = atmosCfg();
          var bed = 3 + (ac.surrounds || 0) + (ac.rears || 0);
          var total = bed + (ac.heights || 0);
          return total + ' amplified speaker channels (' + bed + ' bed + ' + (ac.heights || 0) + ' height) + LFE — processing and amplification sized for ' + ac.id + ' or larger';
        })(),
        channels: (function () {
          var ac = atmosCfg(), out = [];
          (CFG.channelGroups || []).forEach(function (g) {
            var qty = g.qty(ac);
            if (qty && av.audio.picks[g.id]) out.push(Object.assign({ label: g.label, qty: qty, model: avName(av.audio.picks[g.id]) }, avLinks(av.audio.picks[g.id])));
          });
          if (av.audio.subId) out.push(Object.assign({ label: 'Subwoofers', qty: av.audio.subQty || 1, model: avName(av.audio.subId) }, avLinks(av.audio.subId)));
          return out;
        })(),
        processor: av.audio.processorId ? Object.assign({ model: avName(av.audio.processorId) }, avLinks(av.audio.processorId)) : null,
        amplifier: av.audio.ampId ? Object.assign({ model: avName(av.audio.ampId) }, avLinks(av.audio.ampId)) : null
      } : null,
      lightingHeadline: (function () {
        var g = gradeOf(), bits = [];
        if (cfg.fittings.downlight) bits.push((g ? g.label + ' ' : '') + 'downlights');
        var zn = zonesList(); if (zn.length) bits.push(zn.length + ' LED zones');
        if (cfg.design.sconces) bits.push('sconces (TBC)');
        return bits.length ? bits.join(' · ') : null;
      })(),
      downlightGrade: gradeOf(),
      ledZonesList: zonesList().map(function (z) { return { label: z.label, hint: z.hint }; }),
      sconces: cfg.design.sconces ? { notes: cfg.design.sconcesNotes || null } : null,
      ceilingTreatment: (CFG.ceilingTreatments || []).find(function (t) { return t.id === cfg.design.ceiling; }) || null,
      riser: (CFG.riserOptions || []).find(function (r) { return r.id === cfg.design.riser; }) || null,
      joineryNotes: cfg.design.joineryNotes || null,
      sundries: sundriesList().map(function (s) { return s.label; }),
      sundriesNotes: cfg.design.sundriesNotes || null,
      led: (function () {
        var zn = zonesList();
        return zn.length ? { zones: zn.map(function (z) { return { label: z.label, hint: z.hint }; }), covePower: (mc.ledCove && mc.ledCove.powerWPerM) || null } : null;
      })(),
      star: starOn ? {
        panelMode: (mc.star && mc.star.panelMode) || null,
        dropHeight: mc.dropHeight || null,
        ring: (mc.ring && mc.ring.front) || null,
        downlights: dl || null
      } : null,
      slots: (CFG.slots || []).filter(slotVisible).map(function (sl) {
        var id = cfg.picks[sl.id];
        if (id === '_none') return null;   // nothing supplied — off the board
        if (id === '_painted') return { slot: sl.label, name: 'Painted Finish', manufacturer: null, hex: null, painted: true, note: 'Colour from the scheme palette' };
        var it = E.item(id);
        return it ? { slot: sl.label, name: it.name, manufacturer: it.manufacturer, hex: it.hex, swatchImg: it.swatch_img, note: it.note, tier: it.tier, colourways: (it.metadata && it.metadata.colours_available) || null } : null;
      }).filter(Boolean),
      fittings: fits.map(function (f) {
        var g = gradeOf();
        return { label: f.label, hint: (f.id === 'downlight' && g) ? (g.label + ' · ' + g.tier) : f.hint, qty: (f.id === 'downlight' && dl) ? dl + ' fittings' : null };
      }),
      scenes: scenes(),
      colourTemp: CFG.colourTemp,
      termsLines: CFG.termsLines || [],
      dateText: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    deepSafe(m);   // v0.7.0 — ligature-safe pass over every dynamic string
    m.filename = 'sonor-cinema-proposal-' + (m.quoteRef || 'draft') + '.pdf';
    return m;
  }
  // ── v0.9.0 — Bespoke Cinema Design Concept (Claude Design handoff) ────────
  // Editable A3 mood board beside the proposal PDF. Module: aesthetic-moodboard.js.
  // Board state rides in aesthetic_configs.config.moodboard — per-project +
  // versioned via the standard saveConfig() path (whole cfg is the payload).
  async function openMoodBoard() {
    if (!global.AestheticMoodBoard) { console.warn('[aesthetic] moodboard module not loaded'); return; }
    global.AestheticMoodBoard.open({
      model: pdfModel(),                 // same data that drives the proposal PDF
      board: cfg.moodboard || {},        // persisted board state (images + text + sections + ref)
      db: dbc(),                         // enables Supabase storage image upload
      projectId: cfg.projectId,
      appVersion: CFG.version,
      onSave: async function (board) {
        cfg.moodboard = board;
        await saveConfig();              // same save path + app_version stamp as everything else
      }
    });
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
    setDesign: setDesign, toggleZone: toggleZone, toggleSundry: toggleSundry, jumpRefresh: jumpRefresh,
    setOption: setOption, toggleOption: toggleOption,
    useScheme: useScheme, useSeating: useSeating, openFromOverview: openFromOverview,
    openMoodBoard: openMoodBoard,
    _renderOverview: renderOverview,   // harness hook (headless overview render)
    _debug: function () { return { cfg: cfg, ctx: ctx }; }   // harness hook (headless render tests)
  };
})(window);
