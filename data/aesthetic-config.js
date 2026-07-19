/* Sonor Cinema Aesthetic — static flow config (v0.1.0)
   window.__AESTHETIC_CONFIG__ — UI rules + labels only. Catalogue = Library SSOT
   (aesthetic_items via v_aesthetic_catalogue). Flow mirrors the Seating Configurator:
   Intro (landing) → Scheme → Materials → Lighting → Summary. No pricing — aesthetics
   are priced on the main cinema proposal; this app owns the LOOK and outputs the
   client-facing mood board PDF (AestheticPdf, cinema-pdf-luxury system).
*/
(function () {
  window.__AESTHETIC_CONFIG__ = {
    version: '0.2.0',
    buildDate: '2026-07-19',
    steps: ['Scheme', 'Materials', 'Lighting', 'Summary'],

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
