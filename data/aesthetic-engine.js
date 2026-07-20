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

  // ── AV hardware — CANONICAL read surface = the `av_catalogue` VIEW
  //    (CONSUMER-API §0, Library v2.9.1 2026-07-20): deduped merge of
  //    device_catalogue + misc_catalogue, one row per model_id, spec_family
  //    tagged, metadata null-filled to the family template. Never read the
  //    base tables directly. 2-tier: Supabase → localStorage cache.
  //    v0.10.0: legacy categories still present in the view are normalised
  //    client-side to the uniform taxonomy (cinema-gear-library skill):
  //    receiver→av_receiver · amplifier→power_amplifier · processor→
  //    av_processor · tv→display. hero_image + speaker_role adopted. ──
  var AV_CACHE = 'sonor_aesthetic_av_v2';   // v2 — av_catalogue shape
  var AV_CATS = ['speaker', 'subwoofer', 'projector', 'screen',
                 'av_receiver', 'av_processor', 'power_amplifier', 'display',
                 'receiver', 'amplifier', 'processor', 'tv'];   // + legacy (normalised on load)
  var AV_CAT_ALIAS = { receiver: 'av_receiver', amplifier: 'power_amplifier', processor: 'av_processor', tv: 'display', immersive_receiver: 'av_receiver' };
  var AV = { items: [], byId: {}, byCat: {}, source: 'none' };

  function _avIndex() {
    AV.byId = {}; AV.byCat = {};
    AV.items.forEach(function (d) {
      AV.byId[d.model_id] = d;
      (AV.byCat[d.category] = AV.byCat[d.category] || []).push(d);
    });
    Object.keys(AV.byCat).forEach(function (c) {
      AV.byCat[c].sort(function (a, b) { return String(a.make).localeCompare(b.make) || String(a.model).localeCompare(b.model); });
    });
  }
  function _avAdapt(rows) {
    var seen = {};
    return (rows || []).filter(function (d) {
      if (d.discontinued === true || /discontinued/i.test(d.model || '')) return false;
      if (seen[d.model_id]) return false;   // belt-and-braces (view is already deduped)
      seen[d.model_id] = true;
      return true;
    }).map(function (d) {
      d.category = AV_CAT_ALIAS[d.category] || d.category;
      return d;
    });
  }
  async function avLoad() {
    try {
      var db = global.__AESTHETIC_DB__ || (global.SonorDB ? new global.SonorDB() : null) || global.db;
      if (db && db.client) {
        var res = await db.client.from('av_catalogue')
          .select('model_id,make,model,category,description,msrp_gbp,product_url,datasheet_url,discontinued,img:metadata->>hero_image,role:metadata->>speaker_role')
          .in('category', AV_CATS);
        if (!res.error && res.data && res.data.length) {
          AV.items = _avAdapt(res.data);
          AV.source = 'supabase'; _avIndex();
          try { localStorage.setItem(AV_CACHE, JSON.stringify({ t: Date.now(), items: AV.items })); } catch (e) {}
          return true;
        }
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem(AV_CACHE);
      if (raw) { var c = JSON.parse(raw); if (c && c.items) { AV.items = c.items; AV.source = 'cache'; _avIndex(); return true; } }
    } catch (e) {}
    AV.items = []; AV.source = 'none'; _avIndex(); return false;
  }

  global.SonorAesthetic = {
    load: load,
    get source() { return source; },
    all: function () { return ITEMS.slice(); },
    item: function (id) { return idx.byId[id] || null; },
    byCategory: function (cat) { return (idx.byCat[cat] || []).slice(); },
    categories: function () { return Object.keys(idx.byCat); },
    avLoad: avLoad,
    get avSource() { return AV.source; },
    avItem: function (id) { return AV.byId[id] || null; },
    avByCategory: function (cat) {   // v0.10.0 — accepts one canonical cat or an array (e.g. av_receiver + av_processor)
      var cats = Array.isArray(cat) ? cat : [cat];
      var out = [];
      cats.forEach(function (c) { out = out.concat(AV.byCat[AV_CAT_ALIAS[c] || c] || []); });
      out.sort(function (a, b) { return String(a.make).localeCompare(b.make) || String(a.model).localeCompare(b.model); });
      return out;
    }
  };
})(window);
