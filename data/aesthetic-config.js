/* Sonor Cinema Aesthetic — static flow config (v0.1.0)
   window.__AESTHETIC_CONFIG__ — UI rules + labels only. Catalogue = Library SSOT
   (aesthetic_items via v_aesthetic_catalogue). Flow mirrors the Seating Configurator:
   Intro (landing) → Scheme → Materials → Lighting → Summary. No pricing — aesthetics
   are priced on the main cinema proposal; this app owns the LOOK and outputs the
   client-facing mood board PDF (AestheticPdf, cinema-pdf-luxury system).
*/
(function () {
  window.__AESTHETIC_CONFIG__ = {
    version: '0.3.0',
    buildDate: '2026-07-19',
    steps: ['Scheme', 'Video', 'Audio', 'Materials', 'Lighting', 'Summary'],

    // ── AV configuration (v0.3.0 — in-house). Hardware options come LIVE from
    //    the Library's device_catalogue (read-only); these are flow rules only. ──
    videoTypes: [
      { id: 'tv',                label: 'Reference TV',                 note: 'Wall-mounted OLED / MicroLED — simplest premium picture.' },
      { id: 'projection',        label: 'Projector + screen',           note: 'Fixed-frame screen, projector to the rear — the big-picture route.' },
      { id: 'projection-baffle', label: 'Projector + AT screen wall',   note: 'Acoustically transparent screen, speakers concealed behind — the full cinema build.' }
    ],
    tvSizes: [65, 75, 77, 83, 85, 97, 98, 100, 115],
    atmosConfigs: [
      { id: '5.1.2', surrounds: 2, rears: 0, heights: 2 },
      { id: '5.1.4', surrounds: 2, rears: 0, heights: 4 },
      { id: '7.1.4', surrounds: 2, rears: 2, heights: 4 },
      { id: '7.1.6', surrounds: 2, rears: 2, heights: 6 },
      { id: '9.1.4', surrounds: 4, rears: 2, heights: 4 },
      { id: '9.1.6', surrounds: 4, rears: 2, heights: 6 }
    ],
    // channel groups — pickers appear per group; qty derived from the atmos config
    channelGroups: [
      { id: 'front_lr', label: 'Front L + R',      cat: 'speaker', qty: function (ac) { return 2; },            hint: 'Main left/right — behind the screen on AT builds' },
      { id: 'centre',   label: 'Centre',           cat: 'speaker', qty: function (ac) { return 1; },            hint: 'Dialogue anchor below/behind the picture' },
      { id: 'surround', label: 'Surrounds',        cat: 'speaker', qty: function (ac) { return ac.surrounds; }, hint: 'Side surrounds at the listening area' },
      { id: 'rear',     label: 'Rear surrounds',   cat: 'speaker', qty: function (ac) { return ac.rears; },     hint: 'Rear wall pair (7.x/9.x layouts)' },
      { id: 'height',   label: 'Atmos heights',    cat: 'speaker', qty: function (ac) { return ac.heights; },   hint: 'In-ceiling height layer' }
    ],
    subQtyOptions: [1, 2, 3, 4],

    // Style directions — seed the board's overall look. Data-light on purpose:
    // real content lives in the catalogue; these are curatorial groupings only.
    styles: [
      { id: 'dark-classic', label: 'Dark Classic', note: 'Charcoal fabric walls, black ceiling, deep carpet — the reference Sonor cinema look.' },
      { id: 'contemporary', label: 'Contemporary', note: 'Cleaner lines, grey tones, slatted timber accents, minimal pattern.' },
      { id: 'warm-fabric', label: 'Warm Fabric', note: 'Softer warm greys and taupes, brass-toned fittings, gentle contrast.' },
      { id: 'art-deco', label: 'Art Deco', note: 'Richer colour, fluted panels, feature lighting, brass and velvet.' }
    ],

    // Material slots — one pick per slot from the matching catalogue category.
    slots: [
      { id: 'wall_fabric',    label: 'Wall Fabric',     cat: 'wall_fabric',    hint: 'Stretched fabric walls / fabric-faced acoustic build-up' },
      { id: 'acoustic_panel', label: 'Acoustic Panels', cat: 'acoustic_panel', hint: 'Visible treatment panels — absorbers and diffusion' },
      { id: 'ceiling',        label: 'Ceiling',         cat: 'ceiling',        hint: 'Ceiling finish — panels, fabric or painted' },
      { id: 'carpet',         label: 'Carpet',          cat: 'carpet',         hint: 'Cinema-grade carpet' },
      { id: 'curtain',        label: 'Curtain',         cat: 'curtain',        hint: 'Blackout acoustic curtain fabric' },
      { id: 'joinery',        label: 'Joinery',         cat: 'joinery',        hint: 'Media wall, shelving and cabinetry finish' }
    ],

    // Lighting fitting types (catalogue category 'lighting') + feature toggles.
    fittingTypes: [
      { id: 'downlight',     label: 'Recessed Downlights',      hint: 'Warm-white, dimmable' },
      { id: 'led_perimeter', label: 'Perimeter LED',            hint: 'Concealed cove strip in the ceiling perimeter' },
      { id: 'riser_light',   label: 'Riser Lighting',           hint: 'Low-level step/riser wash' },
      { id: 'wall_wash',     label: 'Wall Wash',                hint: 'Feature wash to rear wall / shelving' },
      { id: 'picture_light', label: 'Picture / Poster Lights',  hint: 'Over framed artwork' },
      { id: 'shelf_light',   label: 'Shelf Lighting',           hint: 'In-recess shelf strips' },
      { id: 'star_ceiling',  label: 'Star Ceiling',             hint: 'Fibre-optic star field' }
    ],

    // Default scene set (Rako). Overridden per project when the client brief carries
    // a lighting concept (projects.metadata.brief) — pulled live in the app.
    defaultScenes: [
      { id: 'welcome',      label: 'Welcome',      note: 'Perimeter ~70% · downlights ~40% · riser on' },
      { id: 'film',         label: 'Film',         note: 'Main lights out · low riser glow · optional 5–10% perimeter' },
      { id: 'intermission', label: 'Intermission', note: 'Perimeter ~30% · riser + shelf lighting on' },
      { id: 'cleaning',     label: 'Cleaning',     note: 'Everything 100%' }
    ],

    colourTemp: '2700K warm white throughout · full dimming via Rako · no RGB',

    termsLines: [
      'Aesthetic proposal for the cinema interior only — refer to the main cinema design plans for the technical room specification.',
      'This board is an indicative design direction prepared from the Sonor aesthetic library. Final fabrics, finishes and fittings are confirmed on sample approval and formal quotation.',
      'Pricing for aesthetic elements is carried on the main cinema proposal, not this document.',
      'Fabric batches and photographic reproduction can vary — physical samples are provided before order. E&OE.'
    ],

    // Landing + PDF cover hero — SAME image as the seating app (Bryn 2026-07-19:
    // "use the same front cover image and logos as the seating app"). One-line swap.
    heroImage: '../venice-double-seats.png',

    cacheKey: 'sonor_aesthetic_ssot_v1'
  };
})();
