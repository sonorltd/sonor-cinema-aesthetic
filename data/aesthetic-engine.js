/* Sonor Cinema Aesthetic — catalogue engine (v0.1.0)
   SonorAesthetic — SSOT load + item resolution. Mirrors the Seating Configurator
   engine pattern (seating-library-ssot skill §3): 4-tier load —
   Supabase view v_aesthetic_catalogue → localStorage cache → bundled seed → empty.
   Read-only consumer: the Library owns aesthetic_items; this app writes ONLY its
   own aesthetic_configs table (from aesthetic-app.js).
*/
(function (global) {
  'use strict';

  var CFG = global.__AESTHETIC_CONFIG__ || {};
  var CACHE = CFG.cacheKey || 'sonor_aesthetic_ssot_v1';

  var ITEMS = [];          // adapted rows
  var source = 'inline';
  var idx = { byId: {}, byCat: {} };

  function _index() {
    idx = { byId: {}, byCat: {} };
    ITEMS.forEach(function (it) {
      idx.byId[it.id] = it;
      (idx.byCat[it.category] = idx.byCat[it.category] || []).push(it);
    });
    Object.keys(idx.byCat).forEach(function (c) {
      idx.byCat[c].sort(function (a, b) { return (a.sort_order || 100) - (b.sort_order || 100) || String(a.name).localeCompare(b.name); });
    });
  }

  // view row → engine item (kept close to the table shape; adapter exists so the
  // view can evolve without breaking cached/seeded data — bump cacheKey on change)
  function adapt(rows) {
    return (rows || []).filter(function (r) { return r && r.enabled !== false; }).map(function (r) {
      return {
        id: r.id,
        category: r.category,
        name: r.name,
        manufacturer: r.manufacturer || null,
        hex: r.hex || null,
        swatch_img: r.swatch_img || null,
        img: r.img || null,
        tier: r.tier == null ? null : r.tier,
        note: r.note || null,
        metadata: r.metadata || {},
        sort_order: r.sort_order == null ? 100 : r.sort_order
      };
    });
  }

  async function load() {
    // Tier 1 — Supabase view
    try {
      var db = null;
      if (global.SonorDB) db = new global.SonorDB();
      else if (global.db) db = global.db;
      if (db && db.client) {
        global.__AESTHETIC_DB__ = db;   // expose for the app (function-local clients strand consumers)
        var res = await db.client.from('v_aesthetic_catalogue').select('*');
        if (!res.error && res.data && res.data.length) {
          ITEMS = adapt(res.data);
          source = 'supabase';
          _index();
          try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), items: ITEMS })); } catch (e) {}
          return true;
        }
      }
    } catch (e) { /* fall through */ }

    // Tier 2 — cache (already-adapted shape)
    try {
      var raw = localStorage.getItem(CACHE);
      if (raw) {
        var c = JSON.parse(raw);
        if (c && c.items && c.items.length) { ITEMS = c.items; source = 'cache'; _index(); return true; }
      }
    } catch (e) {}

    // Tier 3 — bundled seed
    try {
      var seed = global.__AESTHETIC_SEED__;
      if (seed && seed.items && seed.items.length) { ITEMS = adapt(seed.items); source = 'seed'; _index(); return true; }
    } catch (e) {}

    // Tier 4 — empty
    ITEMS = []; source = 'inline'; _index(); return false;
  }

  global.SonorAesthetic = {
    load: load,
    get source() { return source; },
    all: function () { return ITEMS.slice(); },
    item: function (id) { return idx.byId[id] || null; },
    byCategory: function (cat) { return (idx.byCat[cat] || []).slice(); },
    categories: function () { return Object.keys(idx.byCat); }
  };
})(window);
