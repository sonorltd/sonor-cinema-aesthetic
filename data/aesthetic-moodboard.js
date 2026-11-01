// ═══════════════════════════════════════════════════════════════════════════
// aesthetic-moodboard.js — Bespoke Cinema Design Concept
// ───────────────────────────────────────────────────────────────────────────
// A per-project, versioned, editable single-sheet A3 mood board that accompanies
// the main Cinema Design Proposal PDF. Opened from the Summary step, beside the
// PDF export buttons.
//
//   • Prefills from the app's pdfModel() (room, palette, slots, AV, scope, lighting)
//   • ADAPTIVE per project — each section auto-shows only when the project has that
//     feature (no curtains in the job → no curtain section). A per-project Sections
//     panel overrides each one (Auto / Always show / Hide); overrides are saved.
//   • Every photo is a drag/drop-replaceable slot; every text line is editable
//   • Board state (images + text overrides + section config + ref) is saved into
//     aesthetic_configs.config.moodboard alongside the rest of the board config —
//     so it is per-project and versioned exactly like everything else in the app
//   • Images upload to the shared `seating-assets` bucket (data-URL fallback)
//   • Export = a real pdf-lib PDF of the board (v0.13.0): A3 landscape default, A4 option, gold-framed pictures, rear page
//
// Public API (call from AestheticApp — it owns pdfModel/dbc/cfg closures):
//   AestheticMoodBoard.open({ model, board, db, projectId, appVersion, onSave })
// ═══════════════════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  var GOLD = '#ad9978', CREAM = '#F4F1EC', MUTED = '#8f8574';
  var BUCKET = 'seating-assets';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ── image slots ────────────────────────────────────────────────────────────
  var SLOTS = {
    hero:      { label: 'Main render — front / TV wall' },
    plan:      { label: 'Layout plan · top view' },
    wallFront: { label: 'Front / TV wall' },
    wallLeft:  { label: 'Left wall / acoustic panels' },
    wallRear:  { label: 'Rear wall / door' },
    wallRight: { label: 'Right side / curtain & door' },
    riser:     { label: 'Riser section diagram' },
    seat:      { label: 'Seating / recliner' },
    curtain:   { label: 'Curtain detail' },
    shelf1:    { label: 'Shelving / recess' },
    shelf2:    { label: 'Shelving / recess' }
  };

  // ── adaptive sections (order = registry order in the panel) ────────────────
  var SECTIONS = [
    { id: 'plan',     label: 'Layout plan' },
    { id: 'walls',    label: 'Wall views (4)' },
    { id: 'spec',     label: 'Specification' },
    { id: 'lighting', label: 'Lighting plan' },
    { id: 'scope',    label: 'Design scope' },
    { id: 'riser',    label: 'Riser detail' },
    { id: 'seating',  label: 'Seating detail' },
    { id: 'curtain',  label: 'Curtain detail' },
    { id: 'shelves',  label: 'Shelves / recess' },
    { id: 'palette',  label: 'Colour palette' },
    { id: 'notes',    label: 'Not-specified notes' }
  ];

  var state = null;   // { model, board, db, projectId, appVersion, onSave, _defaults, _auto }

  // ── ref minting ─────────────────────────────────────────────────────────────
  function makeRef() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var ymd = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = '';
    for (var i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return 'SNR-BC-' + ymd + '-' + r;
  }

  // ── adaptive detection — which sections the project actually has ────────────
  function haystack(m) {
    var parts = [];
    // v0.9.1 — NAMES only, not slot labels: a 'Curtain' slot picked as painted/none
    // must not summon a curtain section
    (m.slots || []).forEach(function (s) { if (!s.painted) parts.push(s.name, s.manufacturer); });
    (m.optionGroups || []).forEach(function (o) { parts.push(o.label); (o.names || []).forEach(function (n) { parts.push(n); }); });
    if (m.ceilingTreatment) parts.push(m.ceilingTreatment.label);
    if (m.riser) parts.push(m.riser.label);
    (m.sundries || []).forEach(function (s) { parts.push(s); });
    if (m.joineryNotes) parts.push(m.joineryNotes);
    return parts.filter(Boolean).join(' | ').toLowerCase();
  }
  function curtainOn(m) {
    // a real curtain PICK (not painted/none), or a curtain named in options/sundries
    var pick = (m.slots || []).some(function (s) { return /curtain|drape/i.test(s.slot || '') && !s.painted; });
    return pick || /curtain|drape/.test(haystack(m));
  }
  // features NOT in the spec → compact notes instead of empty sections.
  // Prefers the app's model.notSpecified (one derivation shared with the
  // proposal PDF's Design Scope page); falls back to local detection.
  function notSpecList(m) {
    m = m || {};
    if (Array.isArray(m.notSpecified)) return m.notSpecified;
    var out = [];
    if (!m.star) out.push('Star ceiling');
    if (!curtainOn(m)) out.push('Curtains');
    if (!(m.riser && m.riser.id !== 'none' && m.riser.id !== 'flat')) out.push('Tiered seating');
    if (!m.sconces) out.push('Wall lights / sconces');
    if (!(m.ledZonesList && m.ledZonesList.length)) out.push('LED lighting');
    return out;
  }
  function autoDetect(m) {
    m = m || {};
    var hay = haystack(m);
    var riserOn = !!(m.riser && (m.riser.id ? (m.riser.id !== 'flat' && m.riser.id !== 'none') : !/flat|single tier|no riser/i.test(m.riser.label || '')));
    return {
      plan:     true,
      walls:    true,
      spec:     !!((m.slots && m.slots.length) || (m.fittings && m.fittings.length) || m.audio || m.video),
      lighting: !!(m.downlightGrade || (m.ledZonesList && m.ledZonesList.length) || m.sconces),
      scope:    !!(m.ceilingTreatment || m.riser || (m.sundries && m.sundries.length) || (m.optionGroups && m.optionGroups.length)),
      riser:    riserOn,
      seating:  true,
      curtain:  curtainOn(m),
      shelves:  /shel|joinery|cabinet|recess|niche/.test(hay),
      palette:  !!(m.palette && m.palette.swatches && m.palette.swatches.length),
      notes:    notSpecList(m).length > 0
    };
  }
  // effective visibility = manual override (on/off) else auto-detected result
  function effective(id) {
    var mode = (state.board.sections && state.board.sections[id]) || 'auto';
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return !!state._auto[id];
  }
  function setSection(id, mode) {
    state.board.sections = state.board.sections || {};
    if (mode === 'auto') delete state.board.sections[id];
    else state.board.sections[id] = mode;
    render();
  }

  // ── default text derived from the proposal model ────────────────────────────
  function defaults(m) {
    m = m || {};
    var room = m.room ? [m.room.w, m.room.d, m.room.h].filter(Boolean) : [];
    var roomLine = room.length
      ? room[0] + 'mm (L) × ' + (room[1] || '—') + 'mm (W) × ' + (room[2] || '—') + 'mm (H)'
      : 'Room dimensions — from Cinema Takeoff';

    var spec = [];
    (m.slots || []).forEach(function (s) { spec.push(s.name + (s.manufacturer ? ' · ' + s.manufacturer : '')); });
    (m.fittings || []).forEach(function (f) { spec.push(f.label + (f.hint ? ' · ' + f.hint : '')); });
    if (m.audio && m.audio.headline) spec.push(m.audio.headline);
    if (m.video && m.video.display) spec.push(m.video.display);

    var lighting = [];
    if (m.downlightGrade) lighting.push((m.downlightGrade.label || 'Downlights') + ' · dimmable');
    (m.ledZonesList || []).forEach(function (z) { lighting.push('LED — ' + z.label); });
    if (m.sconces) lighting.push('Wall sconces (TBC at design development)');

    var scope = [];
    if (m.ceilingTreatment) scope.push('Ceiling · ' + m.ceilingTreatment.label);
    if (m.riser) scope.push('Seating tiers · ' + m.riser.label);
    (m.sundries || []).forEach(function (s) { scope.push(s); });

    return {
      heading: 'BESPOKE CINEMA DESIGN CONCEPT',
      subheading: m.styleLabel ? m.styleLabel.toUpperCase() : 'SLEEK · ACOUSTIC · IMMERSIVE',
      room: roomLine,
      client: m.client || '',
      project: m.project || m.title || '',
      spec: spec.length ? spec : ['Specification — complete the design steps to populate'],
      lighting: lighting.length ? lighting : ['Lighting plan — from the Lighting step'],
      scope: scope.length ? scope : [],
      seatNotes: ['Electric recliners', 'Cupholders', 'Cooling & heating', 'Wireless charging'],
      curtainNotes: ['Full height acoustic', 'Ceiling mounted', 'Heavy weft', 'Blackout — dark grey'],
      shelfNotes: ['Built-in shelving with LED strip', 'Space for media / decorative items'],
      notesLine: (function () {
        var ns = notSpecList(m);
        return ns.length ? ns.join('  ·  ') + ' — not specified for this room. Available as design options on request.' : '';
      })(),
      ref: (state && state.board && state.board.ref) || makeRef()
    };
  }

  function text(key) {
    var b = state.board.text || {};
    if (b[key] != null) return b[key];
    return state._defaults[key];
  }
  function setText(key, val) {
    state.board.text = state.board.text || {};
    state.board.text[key] = val;
  }

  // ── image handling ───────────────────────────────────────────────────────────
  function imgUrl(slotId) { return (state.board.images && state.board.images[slotId]) || null; }
  async function setImage(slotId, file) {
    var dataUrl = await fileToDataUrl(file);
    var url = dataUrl;
    if (state.db && state.db.storage && state.projectId) {
      try {
        var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        var path = 'aesthetic/moodboard/' + state.projectId + '/' + slotId + '-' + Date.now() + '.' + ext;
        var up = await state.db.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
        if (!up.error) {
          var pub = state.db.storage.from(BUCKET).getPublicUrl(path);
          if (pub && pub.data && pub.data.publicUrl) url = pub.data.publicUrl;
        }
      } catch (e) { /* keep data URL */ }
    }
    state.board.images = state.board.images || {};
    state.board.images[slotId] = url;
    render();
  }
  function fileToDataUrl(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // ── renderers ────────────────────────────────────────────────────────────────
  function slotHtml(slotId, extraStyle, placeholder) {
    var url = imgUrl(slotId), sl = SLOTS[slotId] || {};
    var inner = url
      ? '<img src="' + esc(url) + '" style="width:100%;height:100%;object-fit:cover;display:block">'
      : '<div class="amb-ph">' + esc(placeholder || sl.label || 'Drop image') + '</div>';
    return '<div class="amb-slot" data-slot="' + slotId + '" style="' + (extraStyle || '') + '">' +
      inner + '<div class="amb-slot-edit">Replace</div></div>';
  }
  function bullets(key, accent) {
    var arr = text(key) || [];
    if (!Array.isArray(arr)) arr = String(arr).split('\n');
    return arr.map(function (t, i) {
      return '<div class="amb-bul"><span style="color:' + (accent || GOLD) + '">•</span>' +
        '<span contenteditable="true" class="amb-ed" data-ed="' + key + ':' + i + '">' + esc(t) + '</span></div>';
    }).join('');
  }
  function paletteHtml() {
    var pal = (state.model && state.model.palette && state.model.palette.swatches) || [];
    if (!pal.length) {
      pal = [{ name: 'Slate Grey', hex: '#4b4d4f' }, { name: 'Cinema Black', hex: '#1c1b1a' },
             { name: 'Warm Taupe', hex: '#8a7d6a' }, { name: 'Stone', hex: '#b8b0a2' }];
    }
    return pal.slice(0, 6).map(function (p) {
      return '<div><div style="height:58px;border-radius:6px;border:1px solid rgba(255,255,255,.09);background:' + esc(p.hex) + '"></div>' +
        '<div style="margin-top:5px;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:' + MUTED + '">' + esc(p.name) + '</div></div>';
    }).join('');
  }

  // ── the A3 board markup (adaptive) ──────────────────────────────────────────
  function boardHtml() {
    var d = state._defaults;

    // header (always)
    var header =
'<div class="amb-header">' +
  '<div>' +
    '<h1 class="amb-ed amb-h1" contenteditable="true" data-ed="heading">' + esc(text('heading')) + '</h1>' +
    '<div class="amb-room">ROOM SIZE: <span class="amb-ed" contenteditable="true" data-ed="room">' + esc(text('room')) + '</span></div>' +
    '<div class="amb-sub amb-ed" contenteditable="true" data-ed="subheading">' + esc(text('subheading')) + '</div>' +
  '</div>' +
  '<div class="amb-brand">' +
    '<div class="amb-word">SONOR</div>' +
    '<div class="amb-est">Smart Homes · Est. 2003</div>' +
    '<div class="amb-dots">' + ['#8058a1','#4bb9d3','#78ba57','#f5d05c','#e37c59','#ec6061','#e67eb1','#ad9978','#b7b1a7','#302f2e'].map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('') + '</div>' +
    '<div class="amb-ref">' + esc(text('ref') || d.ref) + '</div>' +
  '</div>' +
'</div>';

    // hero + (optional) layout plan
    var showPlan = effective('plan');
    var heroRow =
'<div class="amb-herorow" style="grid-template-columns:' + (showPlan ? '1fr 372px' : '1fr') + '">' +
  slotHtml('hero', 'border-radius:10px', 'Drop main render — front / TV wall (16:9)') +
  (showPlan ?
    '<div class="amb-plancol">' +
      '<div class="amb-eyebrow">Layout plan · top view</div>' +
      slotHtml('plan', 'flex:1 1 auto;min-height:0;border-radius:10px;background:#111010', 'Drop top-view layout plan') +
    '</div>' : '') +
'</div>';

    // wall views
    var walls = effective('walls') ?
'<div class="amb-walls">' +
  ['wallFront', 'wallLeft', 'wallRear', 'wallRight'].map(function (w) {
    return '<div class="amb-wall">' + slotHtml(w, 'border-radius:8px', SLOTS[w].label) +
      '<div class="amb-wall-cap">' + esc(SLOTS[w].label) + '</div></div>';
  }).join('') +
'</div>' : '';

    // spec bands row (dynamic column count)
    var bands = [
      ['spec',     function () { return '<div class="amb-eyebrow">Specification</div>' + bullets('spec'); }],
      ['lighting', function () { return '<div class="amb-eyebrow">Lighting plan</div>' + bullets('lighting'); }],
      ['scope',    function () { return '<div class="amb-eyebrow">Design scope</div>' + bullets('scope'); }],
      ['riser',    function () { return '<div class="amb-eyebrow">Riser detail · side view</div>' + slotHtml('riser', 'height:74px;border-radius:8px;background:#111010', 'Drop riser section'); }]
    ].filter(function (b) { return effective(b[0]); });
    var bandsHtml = bands.length ?
      '<div class="amb-bands" style="grid-template-columns:repeat(' + bands.length + ',1fr)">' +
      bands.map(function (b) { return '<div class="amb-band">' + b[1]() + '</div>'; }).join('') + '</div>' : '';

    // detail row (dynamic column count)
    var det = [
      ['seating', function () { return '<div class="amb-eyebrow">Seating detail</div><div class="amb-detrow">' + slotHtml('seat', 'width:96px;height:88px;border-radius:6px', 'Seat') + '<div class="amb-mini">' + bullets('seatNotes') + '</div></div>'; }],
      ['curtain', function () { return '<div class="amb-eyebrow">Curtain detail</div><div class="amb-detrow">' + slotHtml('curtain', 'width:56px;height:88px;border-radius:6px', 'Curtain') + '<div class="amb-mini">' + bullets('curtainNotes') + '</div></div>'; }],
      ['shelves', function () { return '<div class="amb-eyebrow">Shelves / recess</div><div class="amb-detrow">' + slotHtml('shelf1', 'width:50px;height:88px;border-radius:6px', '') + slotHtml('shelf2', 'width:50px;height:88px;border-radius:6px', '') + '<div class="amb-mini">' + bullets('shelfNotes') + '</div></div>'; }],
      ['palette', function () { return '<div class="amb-eyebrow">Colour palette</div><div class="amb-pal">' + paletteHtml() + '</div>'; }]
    ].filter(function (x) { return effective(x[0]); });
    var detHtml = det.length ?
      '<div class="amb-detail" style="grid-template-columns:repeat(' + det.length + ',1fr)">' +
      det.map(function (x) { return '<div>' + x[1]() + '</div>'; }).join('') + '</div>' : '';

    // not-specified notes — one compact line instead of empty sections
    var notesHtml = (effective('notes') && (text('notesLine') || '').length) ?
      '<div class="amb-notes"><span class="amb-notes-h">Not in this specification</span>' +
      '<span contenteditable="true" class="amb-ed" data-ed="notesLine">' + esc(text('notesLine')) + '</span></div>' : '';

    return header + heroRow + walls + bandsHtml + detHtml + notesHtml;
  }

  // ── sections config panel ────────────────────────────────────────────────────
  function sectionsPanelHtml() {
    return '<div class="amb-sp-h">Sections — adaptive per project</div>' +
      SECTIONS.map(function (s) {
        var mode = (state.board.sections && state.board.sections[s.id]) || 'auto';
        var auto = state._auto[s.id] ? 'shown' : 'hidden';
        return '<div class="amb-sp-row"><div class="amb-sp-l">' + esc(s.label) +
          '<span class="amb-sp-auto">auto: ' + auto + '</span></div>' +
          '<select data-sec="' + s.id + '">' +
            '<option value="auto"' + (mode === 'auto' ? ' selected' : '') + '>Auto</option>' +
            '<option value="on"' + (mode === 'on' ? ' selected' : '') + '>Always show</option>' +
            '<option value="off"' + (mode === 'off' ? ' selected' : '') + '>Hide</option>' +
          '</select></div>';
      }).join('') +
      '<div class="amb-sp-note">Auto shows a section only when the project has that feature. Detected from the design steps — override any section here; your choice is saved with the concept.</div>';
  }
  function bindPanel() {
    var panel = document.getElementById('amb-sections');
    if (!panel) return;
    panel.querySelectorAll('select[data-sec]').forEach(function (sel) {
      sel.addEventListener('change', function () { setSection(sel.getAttribute('data-sec'), sel.value); });
    });
  }

  // ── style block ───────────────────────────────────────────────────────────────
  function styleTag() {
    return '<style id="amb-style">' +
'#amb-overlay{position:fixed;inset:0;z-index:99999;background:rgba(5,4,3,.86);backdrop-filter:blur(6px);display:flex;flex-direction:column;font-family:"Gilroy","DM Sans",system-ui,sans-serif}' +
'#amb-bar{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:12px 20px;background:#0b0a0c;border-bottom:1px solid rgba(173,153,120,.22)}' +
'#amb-bar .amb-title{color:' + CREAM + ';font-weight:800;font-size:13px;letter-spacing:.04em}' +
'#amb-bar .amb-spacer{flex:1 1 auto}' +
'#amb-bar button{font-family:inherit;font-weight:800;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:9px 15px;border-radius:2px;cursor:pointer;border:1px solid rgba(173,153,120,.5);background:transparent;color:' + GOLD + ';transition:.2s}' +
'#amb-bar button:hover{background:' + GOLD + ';color:#0b0a0c}' +
'#amb-bar button.amb-primary{background:' + GOLD + ';color:#0b0a0c;border-color:' + GOLD + '}' +
'#amb-bar button.amb-primary:hover{background:#c8b48e}' +
'#amb-sections-wrap{position:absolute;top:52px;right:20px;z-index:6;width:330px}' +
'#amb-sections{background:#0f0e10;border:1px solid rgba(173,153,120,.3);border-radius:6px;padding:14px 16px;box-shadow:0 30px 70px -20px rgba(0,0,0,.85)}' +
'.amb-sp-h{font-weight:800;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:' + GOLD + ';margin-bottom:8px}' +
'.amb-sp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid rgba(255,255,255,.06)}' +
'.amb-sp-l{font-size:12px;color:#e6ddca;display:flex;flex-direction:column;line-height:1.2}' +
'.amb-sp-auto{font-size:9px;color:' + MUTED + ';letter-spacing:.04em;margin-top:3px;text-transform:uppercase}' +
'.amb-sp-row select{font-family:inherit;font-size:11px;background:#1a1917;color:' + CREAM + ';border:1px solid rgba(173,153,120,.35);border-radius:3px;padding:5px 6px;cursor:pointer}' +
'.amb-sp-note{margin-top:10px;font-size:10px;color:' + MUTED + ';line-height:1.55}' +
'#amb-scroll{flex:1 1 auto;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:26px}' +
'#amb-page{width:1587px;height:1122px;flex:0 0 auto;box-sizing:border-box;padding:26px 30px 24px;display:flex;flex-direction:column;gap:16px;color:' + CREAM + ';' +
  'background:radial-gradient(1200px 560px at 50% -180px,rgba(173,153,120,.10),transparent 62%),radial-gradient(1000px 560px at 108% 6%,rgba(128,88,161,.14),transparent 55%),radial-gradient(880px 600px at -6% 98%,rgba(128,88,161,.11),transparent 58%),linear-gradient(#0b0a0c,#090807);' +
  'box-shadow:0 40px 120px -40px rgba(0,0,0,.9)}' +
'#amb-page .amb-eyebrow{font-weight:600;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:' + GOLD + ';display:flex;align-items:center;gap:7px;margin-bottom:10px}' +
'#amb-page .amb-eyebrow::before{content:"";width:14px;height:2px;border-radius:2px;background:linear-gradient(90deg,' + GOLD + ',#8058a1)}' +
'.amb-header{display:flex;justify-content:space-between;align-items:flex-start;flex:0 0 auto}' +
'.amb-h1{margin:0;font-weight:800;font-size:26px;letter-spacing:-.01em;line-height:1;background:linear-gradient(90deg,' + CREAM + ',#c8b48e);-webkit-background-clip:text;background-clip:text;color:transparent}' +
'.amb-room{margin-top:9px;font-weight:600;font-size:13px;letter-spacing:.02em;color:#b8ad99}' +
'.amb-room .amb-ed{color:' + CREAM + '}' +
'.amb-sub{margin-top:6px;font-weight:700;font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:' + MUTED + '}' +
'.amb-brand{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:7px}' +
'.amb-word{font-weight:800;font-size:15px;letter-spacing:.34em}' +
'.amb-est{font-weight:600;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:' + MUTED + '}' +
'.amb-dots{display:flex;gap:5px;margin-top:2px}.amb-dots span{width:9px;height:9px;border-radius:50%}' +
'.amb-ref{font-size:9px;letter-spacing:.14em;color:' + GOLD + ';font-weight:700}' +
'.amb-herorow{display:grid;gap:16px;flex:1 1 auto;min-height:0}' +
'.amb-plancol{display:flex;flex-direction:column;gap:11px;min-height:0}' +
'.amb-walls{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;flex:0 0 158px}' +
'.amb-wall{position:relative}' +
'.amb-wall-cap{position:absolute;left:0;right:0;bottom:0;padding:6px 9px;background:linear-gradient(0deg,rgba(5,4,3,.9),transparent);font-weight:700;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;pointer-events:none}' +
'.amb-bands{display:grid;gap:0;flex:0 0 auto;border-top:1px solid rgba(173,153,120,.22);border-bottom:1px solid rgba(173,153,120,.22)}' +
'.amb-band{padding:14px 16px;border-right:1px solid rgba(255,255,255,.07)}.amb-band:last-child{border-right:0}' +
'.amb-bul{display:flex;gap:7px;font-size:10.5px;line-height:1.35;color:#c9c1b2;margin-bottom:5px}' +
'.amb-detail{display:grid;gap:22px;flex:0 0 auto}' +
'.amb-detrow{display:flex;gap:9px}' +
'.amb-mini{display:flex;flex-direction:column;gap:4px}.amb-mini .amb-bul{font-size:10px;margin-bottom:3px}' +
'.amb-pal{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}' +
'.amb-slot{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#131211;cursor:pointer;min-height:40px}' +
'.amb-slot .amb-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;font-size:9.5px;letter-spacing:.06em;color:' + MUTED + ';text-transform:uppercase}' +
'.amb-slot-edit{position:absolute;top:6px;right:6px;font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 7px;border-radius:2px;background:rgba(11,10,12,.8);color:' + GOLD + ';opacity:0;transition:.15s;pointer-events:none}' +
'.amb-slot:hover .amb-slot-edit{opacity:1}' +
'.amb-slot.amb-drag{outline:2px dashed ' + GOLD + ';outline-offset:-4px}' +
'.amb-ed{outline:none;border-radius:2px;transition:box-shadow .15s}' +
'.amb-ed:hover{box-shadow:inset 0 0 0 1px rgba(173,153,120,.35)}' +
'.amb-ed:focus{box-shadow:inset 0 0 0 1px ' + GOLD + ';background:rgba(173,153,120,.08)}' +
'.amb-notes{flex:0 0 auto;display:flex;align-items:baseline;gap:10px;padding:9px 12px;border:1px solid rgba(255,255,255,.08);border-radius:6px;background:rgba(255,255,255,.02);font-size:9.5px;line-height:1.5;color:' + MUTED + '}' +
'.amb-notes-h{flex:0 0 auto;font-weight:800;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:' + GOLD + '}' +
'@media print{#amb-overlay{position:static;background:#090807}#amb-bar,#amb-sections-wrap{display:none}#amb-scroll{overflow:visible;padding:0}#amb-page{box-shadow:none}' +
  '.amb-slot-edit{display:none}@page{size:420mm 297mm;margin:0}}' +
'</style>';
  }

  // ── event wiring (board) ──────────────────────────────────────────────────────
  function bind(root) {
    root.querySelectorAll('.amb-ed').forEach(function (el) {
      el.addEventListener('blur', function () {
        var key = el.getAttribute('data-ed');
        if (key.indexOf(':') > -1) {
          var parts = key.split(':'), k = parts[0], i = +parts[1];
          var arr = (state.board.text && state.board.text[k]) || (state._defaults[k] || []);
          arr = Array.isArray(arr) ? arr.slice() : [];
          arr[i] = el.textContent.trim();
          setText(k, arr);
        } else {
          setText(key, el.textContent.trim());
        }
      });
    });
    root.querySelectorAll('.amb-slot').forEach(function (el) {
      var slotId = el.getAttribute('data-slot');
      el.addEventListener('click', function () { pickFile(slotId); });
      el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('amb-drag'); });
      el.addEventListener('dragleave', function () { el.classList.remove('amb-drag'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault(); el.classList.remove('amb-drag');
        var f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && /^image\//.test(f.type)) setImage(slotId, f);
      });
    });
  }
  function pickFile(slotId) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () { if (inp.files[0]) setImage(slotId, inp.files[0]); };
    inp.click();
  }

  function render() {
    var page = document.getElementById('amb-page');
    if (page) { page.innerHTML = boardHtml(); bind(page); }
  }

  // ── open / close ──────────────────────────────────────────────────────────────
  // v0.13.1 — the board state is loaded on its own (no overlay), so buildPdf works without the board having been opened
  function load(opts) {
    opts = opts || {};
    state = {
      model: opts.model || {},
      board: opts.board ? JSON.parse(JSON.stringify(opts.board)) : {},
      db: opts.db || null,
      projectId: opts.projectId || null,
      appVersion: opts.appVersion || null,
      onSave: opts.onSave || null
    };
    state._defaults = defaults(state.model);
    state._auto = autoDetect(state.model);
    state.board.ref = state.board.ref || state._defaults.ref;
    return state;
  }
  function open(opts) {
    load(opts);
    close();
    var ov = document.createElement('div');
    ov.id = 'amb-overlay';
    ov.innerHTML = styleTag() +
      '<div id="amb-bar">' +
        '<div class="amb-title">Bespoke Cinema Design Concept</div>' +
        '<div class="amb-spacer"></div>' +
        '<button data-act="sections">Sections ▾</button>' +
        '<button data-act="close">Close</button>' +
        '<button data-act="export">Export PDF ↓</button>' +
        '<button class="amb-primary" data-act="save">Save concept</button>' +
        '<div id="amb-sections-wrap" style="display:none"><div id="amb-sections">' + sectionsPanelHtml() + '</div></div>' +
      '</div>' +
      '<div id="amb-scroll"><div id="amb-page"></div></div>';
    document.body.appendChild(ov);
    render();
    bindPanel();

    ov.querySelector('[data-act="close"]').onclick = close;
    ov.querySelector('[data-act="export"]').onclick = exportPdf;
    ov.querySelector('[data-act="save"]').onclick = save;
    ov.querySelector('[data-act="sections"]').onclick = function () {
      var w = document.getElementById('amb-sections-wrap');
      w.style.display = w.style.display === 'none' ? 'block' : 'none';
    };
  }
  function close() { var ov = document.getElementById('amb-overlay'); if (ov) ov.remove(); }

  async function save() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    state.board.app_version = state.appVersion || state.board.app_version;
    state.board.updated_at = new Date().toISOString();
    var btn = document.querySelector('#amb-bar [data-act="save"]');
    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
    try {
      if (state.onSave) await state.onSave(state.board);
      if (btn) btn.textContent = 'Saved ✓';
    } catch (e) {
      if (btn) btn.textContent = 'Save failed';
      console.warn('[moodboard] save failed', e);
    }
    setTimeout(function () { if (btn) { btn.textContent = 'Save concept'; btn.disabled = false; } }, 1600);
  }
  // ── PDF (v0.13.0, 2026-11-01 — Bryn: "make all exports work in the best pdf version") ─────────────────────
  // Was window.print() of the overlay. Now a REAL pdf-lib PDF of the board on the shared chrome (data/sonor-pdf-luxury.js,
  // neutral white paper): the board as ONE proper sheet — header, hero (+ layout plan), the four wall views, the
  // specification / lighting / scope bands, the detail row and the not-specified line — every picture cover-cropped inside
  // the house thin gold frame — then the rear contact page (CEDIA bottom right). A3 landscape by default, A4 landscape
  // option (the same sheet at 1/√2, proper pages). Text is what is on the board (edits included).
  function pdfSafe(s) {
    return String(s == null ? '' : s).replace(/[^\x20-\x7E£°]/g, function (c) {
      return ({ '²': '2', '×': 'x', '–': '-', '—': '-', '·': '-', '…': '...', '’': "'", '‘': "'", '“': '"', '”': '"', '•': '-', 'é': 'e' })[c] || '';
    }).replace(/\s{2,}/g, ' ').trim();
  }
  function arr(key) { var a = text(key) || []; return Array.isArray(a) ? a : String(a).split('\n'); }
  // opts (optional) = the same options open() takes; with none and no board open, the app's own board is loaded
  // (AestheticApp.moodBoardOptions() — the project's saved cfg.moodboard + the proposal model)
  function ensureState(opts) {
    if (opts) return load(opts);
    if (state && state.board) return state;
    var app = global.AestheticApp, o = app && typeof app.moodBoardOptions === 'function' ? app.moodBoardOptions() : null;
    if (!o) throw new Error('No mood board to export - select a project first');
    return load(o);
  }
  async function buildPdf(paper, opts) {
    ensureState(opts);
    var PL = global.PDFLib, L = global.SonorPdfLuxury;
    if (!PL || !L) throw new Error('pdf-lib / SonorPdfLuxury not loaded');
    var base = (function () { var s = document.querySelector('script[src*="aesthetic-moodboard.js"]'); return s ? s.src.replace(/aesthetic-moodboard\.js.*$/, '') : '../data/'; })();
    var CAN = L.SHEETS['A3-landscape'], SCALE = paper === 'A4' ? Math.SQRT1_2 : 1;
    var prevSheet = L.sheet(), prevTheme = L.theme();
    L.sheet({ w: CAN.w, h: CAN.h }); L.theme('neutral'); L.footerMode('minimal', pdfSafe(text('project') || text('heading')));
    var W = CAN.w, H = CAN.h, M = 40, COL = L.COL;
    try {
      var doc = await PL.PDFDocument.create();
      var F = await L.makeFonts(doc, base);
      var cedia = null; try { cedia = await L.loadImage(doc, base + 'cedia-member-stacked.png'); } catch (e) {}
      var cache = {};
      async function img(slot) { var u = imgUrl(slot); if (!u) return null; if (cache[u] !== undefined) return cache[u]; try { cache[u] = await L.loadImage(doc, u); } catch (e) { console.warn('[moodboard pdf] image', slot, e); cache[u] = null; } return cache[u]; }
      var slots = Object.keys(SLOTS), imgs = {};
      for (var i = 0; i < slots.length; i++) imgs[slots[i]] = await img(slots[i]);

      var page = doc.addPage([W * SCALE, H * SCALE]);
      if (SCALE !== 1) page.pushOperators(PL.pushGraphicsState(), PL.scale(SCALE, SCALE));
      var P = L.mk(page, doc); P.rect(0, 0, W, H, COL.CREAM);
      function T(s, x, top, size, font, c) { P.text(pdfSafe(s), x, top, size, font || F.r, c || COL.INK); }
      function fit(s, font, size, w) { s = pdfSafe(s); if (font.widthOfTextAtSize(s, size) <= w) return s; while (s.length > 1 && font.widthOfTextAtSize(s + '...', size) > w) s = s.slice(0, -1); return s + '...'; }
      // a picture cover-cropped into (x, top, w, h) inside the thin gold frame
      function frame(slot, x, top, w, h, label) {
        var im = imgs[slot];
        if (im) {
          var s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s, y = H - top - h;
          page.pushOperators(PL.pushGraphicsState(), PL.moveTo(x, y), PL.lineTo(x + w, y), PL.lineTo(x + w, y + h), PL.lineTo(x, y + h), PL.closePath(), PL.clip(), PL.endPath());
          page.drawImage(im, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
          page.pushOperators(PL.popGraphicsState());
        } else {
          P.rect(x, top, w, h, [240, 239, 236]);
          var lab = fit(label || (SLOTS[slot] || {}).label || 'Image to follow', F.r, 7, w - 12);
          P.text(lab, x + (w - F.r.widthOfTextAtSize(lab, 7)) / 2, top + h / 2 - 4, 7, F.r, COL.MUT);
        }
        P.rectB(x, top, w, h, COL.GOLD, 0.7);
      }
      function eyebrow(s, x, top) { P.tracked(pdfSafe(s).toUpperCase(), x, top, 6.8, F.r, COL.GOLD, 1.8); }
      function bulletsAt(key, x, top, w, maxBottom, size) {
        size = size || 8; var y = top;
        arr(key).forEach(function (t) { if (!t) return; L.wrap(pdfSafe(t), F.r, size, w - 10).forEach(function (ln, li) { if (y + size > maxBottom) return; if (li === 0) P.dot(x + 2, y + size * 0.55, 1.4, COL.GOLD); P.text(ln, x + 9, y, size, F.r, COL.INK2); y += size + 3.4; }); y += 1.5; });
        return y;
      }

      // ── header ──
      P.text(fit(text('heading') || 'Bespoke cinema design concept', F.b, 22, W - M * 2 - 300), M, 34, 22, F.b, COL.INK);
      P.tracked('ROOM SIZE', M, 66, 6.8, F.r, COL.MUT, 1.6); T(text('room') || '', M + 60, 65.5, 8.5, F.r, COL.INK2);
      P.tracked(fit(text('subheading') || '', F.r, 8, W - M * 2 - 300).toUpperCase(), M, 82, 8, F.r, COL.GOLD, 2.2);
      P.logo(W - M - 120, 36, 22, COL.GOLD); P.tracked('SONOR', W - M - 93, 40.5, 14, F.b, COL.INK, 3.6);
      P.trackedRight(pdfSafe(text('ref') || state.board.ref || ''), W - M, 66, 7, F.r, COL.MUT, 1.4);
      var proj = [text('project'), text('client')].filter(Boolean).join('  -  ');
      if (proj) P.trackedRight(fit(proj, F.r, 7, 300).toUpperCase(), W - M, 82, 7, F.r, COL.LABEL, 1.4);
      P.hline(M, W - M, 100, COL.GOLD, 0.6, 0.8);

      // ── rows (adaptive — only what the board shows) ──
      var top = 114, bottom = H - 46, GAP = 12;
      var showWalls = effective('walls');
      var bands = ['spec', 'lighting', 'scope', 'riser'].filter(effective);
      var dets = ['seating', 'curtain', 'shelves', 'palette'].filter(effective);
      var notesOn = effective('notes') && (text('notesLine') || '').length;
      var wallsH = showWalls ? 128 : 0, bandsH = bands.length ? 104 : 0, detH = dets.length ? 104 : 0, notesH = notesOn ? 20 : 0;
      var fixed = (showWalls ? wallsH + 16 + GAP : 0) + (bands.length ? bandsH + GAP : 0) + (dets.length ? detH + GAP : 0) + notesH;
      var heroH = Math.max(180, bottom - top - fixed);
      var showPlan = effective('plan'), planW = showPlan ? 360 : 0;
      frame('hero', M, top, W - M * 2 - (showPlan ? planW + 14 : 0), heroH, 'Main render - front / TV wall');
      if (showPlan) { eyebrow('Layout plan - top view', W - M - planW, top); frame('plan', W - M - planW, top + 14, planW, heroH - 14, 'Layout plan - top view'); }
      var y = top + heroH + GAP;
      if (showWalls) {
        var ww = (W - M * 2 - 3 * 12) / 4;
        ['wallFront', 'wallLeft', 'wallRear', 'wallRight'].forEach(function (k, i) { var x = M + i * (ww + 12); frame(k, x, y, ww, wallsH); T(SLOTS[k].label, x, y + wallsH + 4, 7, F.r, COL.MUT); });
        y += wallsH + 16 + GAP;
      }
      if (bands.length) {
        var bw = (W - M * 2 - (bands.length - 1) * 18) / bands.length;
        bands.forEach(function (k, i) {
          var x = M + i * (bw + 18); P.hline(x, x + bw, y, COL.LINE, 0.6);
          if (k === 'riser') { eyebrow('Riser detail - side view', x, y + 8); frame('riser', x, y + 22, bw, bandsH - 24, 'Riser section'); return; }
          eyebrow({ spec: 'Specification', lighting: 'Lighting plan', scope: 'Design scope' }[k], x, y + 8);
          bulletsAt(k, x, y + 24, bw, y + bandsH, 8);
        });
        y += bandsH + GAP;
      }
      if (dets.length) {
        var dw2 = (W - M * 2 - (dets.length - 1) * 18) / dets.length, ih = detH - 24;
        dets.forEach(function (k, i) {
          var x = M + i * (dw2 + 18); P.hline(x, x + dw2, y, COL.LINE, 0.6);
          eyebrow({ seating: 'Seating detail', curtain: 'Curtain detail', shelves: 'Shelves / recess', palette: 'Colour palette' }[k], x, y + 8);
          var t0 = y + 22;
          if (k === 'seating') { frame('seat', x, t0, 96, ih, 'Seat'); bulletsAt('seatNotes', x + 106, t0 + 2, dw2 - 106, t0 + ih, 7.6); }
          else if (k === 'curtain') { frame('curtain', x, t0, 60, ih, 'Curtain'); bulletsAt('curtainNotes', x + 70, t0 + 2, dw2 - 70, t0 + ih, 7.6); }
          else if (k === 'shelves') { frame('shelf1', x, t0, 52, ih, ' '); frame('shelf2', x + 58, t0, 52, ih, ' '); bulletsAt('shelfNotes', x + 120, t0 + 2, dw2 - 120, t0 + ih, 7.6); }
          else {
            var pal = (state.model && state.model.palette && state.model.palette.swatches) || [];
            if (!pal.length) pal = [{ name: 'Slate Grey', hex: '#4b4d4f' }, { name: 'Cinema Black', hex: '#1c1b1a' }, { name: 'Warm Taupe', hex: '#8a7d6a' }, { name: 'Stone', hex: '#b8b0a2' }];
            pal = pal.slice(0, 6); var sw = (dw2 - (pal.length - 1) * 8) / pal.length;
            pal.forEach(function (p, j) { var sx = x + j * (sw + 8); P.rect(sx, t0, sw, ih - 18, L.hexRgb(p.hex)); P.rectB(sx, t0, sw, ih - 18, COL.LINE, 0.5); P.tracked(fit(p.name, F.r, 6, sw).toUpperCase(), sx, t0 + ih - 12, 6, F.r, COL.MUT, 0.8); });
          }
        });
        y += detH + GAP;
      }
      if (notesOn) { P.tracked('NOT IN THIS SPECIFICATION', M, y + 2, 6.8, F.b, COL.GOLD, 1.6); T(fit(text('notesLine'), F.r, 7.6, W - M * 2 - 150), M + 140, y + 1.5, 7.6, F.r, COL.MUT); }
      L.pageFoot(P, F, { pageNo: 1 });
      if (SCALE !== 1) page.pushOperators(PL.popGraphicsState());

      // ── rear page ──
      var rp = doc.addPage([W * SCALE, H * SCALE]);
      if (SCALE !== 1) rp.pushOperators(PL.pushGraphicsState(), PL.scale(SCALE, SCALE));
      L.rearPage(L.mk(rp, doc), F, { cediaImg: cedia });
      if (SCALE !== 1) rp.pushOperators(PL.popGraphicsState());
      doc.setTitle(pdfSafe('Bespoke cinema design concept - ' + (text('project') || '') + ' ' + (state.board.ref || ''))); doc.setAuthor('Sonor Ltd');
      return await doc.save();
    } finally { L.sheet(prevSheet); L.theme(prevTheme); }
  }
  function exportPdf() {
    var old = document.getElementById('amb-xp'); if (old) { old.remove(); return; }
    var pref = 'A3'; try { pref = localStorage.getItem('sonor_moodboard_paper') || 'A3'; } catch (e) {}
    var el = document.createElement('div'); el.id = 'amb-xp';
    el.style.cssText = 'position:fixed;top:56px;right:24px;z-index:100001;background:#26272b;color:#e9e7e3;border:1px solid #45464b;border-radius:12px;padding:14px 16px;box-shadow:0 18px 50px rgba(0,0,0,.55);font:12.5px system-ui,sans-serif;min-width:250px';
    el.innerHTML = '<div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#9a988f;margin-bottom:6px">Paper — landscape</div>' +
      ['A3', 'A4'].map(function (p) { return '<label style="display:flex;gap:8px;align-items:center;padding:3px 0;cursor:pointer"><input type="radio" name="ambPaper" value="' + p + '"' + (pref === p ? ' checked' : '') + ' style="accent-color:' + GOLD + '"> ' + p + (p === 'A3' ? ' (default)' : '') + '</label>'; }).join('') +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px"><span id="amb-xp-note" style="color:#9a988f;font-size:11px"></span><button id="amb-xp-go" style="background:' + GOLD + ';color:#111;border:0;border-radius:7px;padding:6px 14px;font-weight:600;cursor:pointer">Export PDF</button></div>';
    document.body.appendChild(el);
    el.querySelector('#amb-xp-go').onclick = async function () {
      var paper = (el.querySelector('input[name=ambPaper]:checked') || {}).value || 'A3';
      try { localStorage.setItem('sonor_moodboard_paper', paper); } catch (e) {}
      var note = el.querySelector('#amb-xp-note'); note.textContent = 'Building…'; this.disabled = true;
      try {
        var bytes = await buildPdf(paper);
        var nm = pdfSafe('Cinema design concept - ' + (text('project') || 'board') + ' - ' + (state.board.ref || '') + ' (' + paper + ' landscape)').replace(/[\\/:*?"<>|]+/g, '-') + '.pdf';
        var u = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), a = document.createElement('a');
        a.href = u; a.download = nm; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
        el.remove();
      } catch (e) { console.error('[moodboard pdf]', e); note.textContent = 'Failed: ' + (e && e.message || e); this.disabled = false; }
    };
  }

  global.AestheticMoodBoard = { open: open, close: close, load: load, makeRef: makeRef, buildPdf: function (paper, opts) { return buildPdf(paper || 'A3', opts); } };
})(window);
