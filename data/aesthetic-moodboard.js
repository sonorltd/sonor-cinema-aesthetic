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
//   • Export = A3 landscape print of the board only (clean PDF via the browser)
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
  function open(opts) {
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
  function exportPdf() { window.print(); }

  global.AestheticMoodBoard = { open: open, close: close, makeRef: makeRef };
})(window);
