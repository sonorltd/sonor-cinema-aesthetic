/* Sonor Cinema Aesthetic — static flow config (v0.1.0)
   window.__AESTHETIC_CONFIG__ — UI rules + labels only. Catalogue = Library SSOT
   (aesthetic_items via v_aesthetic_catalogue). Flow mirrors the Seating Configurator:
   Intro (landing) → Scheme → Materials → Lighting → Summary. No pricing — aesthetics
   are priced on the main cinema proposal; this app owns the LOOK and outputs the
   client-facing mood board PDF (AestheticPdf, cinema-pdf-luxury system).
*/
(function () {
  window.__AESTHETIC_CONFIG__ = {
    version: '0.7.1',
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
    // ── AV system grades (v0.5.0) — Bronze → Platinum electronics ladder.
    //    brands[] soft-filters the electronics pickers to the grade's typical
    //    marques (untickable); grade + description carry onto the proposal.
    //    StormAudio + Wisdom Audio = Library asks (not in device_catalogue yet).
    //    Grade TEMPLATES (pre-packaged picks per grade) come as saved boards /
    //    Library data as the ranges firm up — structure reserved via `template`.
    //    Ladder (Bryn 2026-07-19): Yamaha = bronze/silver · StormAudio = gold/platinum
    //    · Wisdom = the 5th tier beyond platinum (TBC pending Habitech visit).
    //    Amps (Sonance / Triad / others) are chosen MANUALLY — never grade-locked.
    avGrades: [
      { id: 'bronze',   label: 'Bronze',   note: 'Quality Yamaha AV receiver — processing and amplification in one box.',            brands: { receiver: ['Yamaha'] }, template: null },
      { id: 'silver',   label: 'Silver',   note: 'Flagship Yamaha AV receiver — stronger processing and amplification, pre-outs for power amps.', brands: { receiver: ['Yamaha'] }, template: null },
      { id: 'gold',     label: 'Gold',     note: 'StormAudio immersive processor with dedicated multi-channel power amplification.', brands: { receiver: ['StormAudio'] }, template: null },
      { id: 'platinum', label: 'Platinum', note: 'Reference StormAudio separates — per-channel amplification, expanded channel counts.', brands: { receiver: ['StormAudio'] }, template: null },
      { id: 'wisdom',   label: 'Wisdom',   note: 'Beyond platinum — the full Wisdom Audio system, engineered end to end.',           brands: { receiver: ['StormAudio'], speaker: ['Wisdom Audio'] }, template: null,
        tbc: 'Wisdom Audio system TBC — pending Habitech experience centre visit' }
    ],
    // ── v0.7.0 — PER-ASPECT grades. One medal per aspect: a Silver projector can
    //    sit alongside Gold speakers (Bryn 2026-07-19). Wisdom = speakers only.
    //    Colours drive the badge graphics in the app AND the PDF.
    gradeAspects: [
      { id: 'video',       label: 'Video grade',       hint: 'Display / projection class' },
      { id: 'speakers',    label: 'Loudspeaker grade', hint: 'Speaker package class' },
      { id: 'electronics', label: 'Electronics grade', hint: 'Processing + amplification class' }
    ],
    avGradeColours: {
      bronze:   '#a06a3c',
      silver:   '#9aa4ae',
      gold:     '#c2a14d',
      platinum: '#c9ced6',
      wisdom:   '#2f4468'
    },
    // which grades apply per aspect (wisdom is a loudspeaker-system tier)
    avGradeAspects: { video: ['bronze','silver','gold','platinum'], speakers: ['bronze','silver','gold','platinum','wisdom'], electronics: ['bronze','silver','gold','platinum'] },
    // per-aspect meaning of each medal — short, PDF-rendered (ligature-safe copy)
    avGradeAspectNotes: {
      video: {
        bronze:   'Premium large-format TV or quality 4K projector',
        silver:   'Flagship TV or lamp-free 4K laser projector',
        gold:     'Native 4K laser projection',
        platinum: 'Reference laser projection with video processing'
      },
      speakers: {
        bronze:   'Quality in-wall / on-wall loudspeaker package',
        silver:   'MK Sound monitor-grade package',
        gold:     'MK Sound THX reference package',
        platinum: 'Flagship MK Sound reference system',
        wisdom:   'Wisdom Audio planar line-source system — beyond platinum'
      },
      electronics: {
        bronze:   'Quality Yamaha AV receiver',
        silver:   'Flagship Yamaha AVENTAGE receiver',
        gold:     'StormAudio processor + multi-channel amplification',
        platinum: 'Reference StormAudio separates — per-channel amplification'
      }
    },

    // Style directions — seed the board's overall look. Data-light on purpose:
    // real content lives in the catalogue; these are curatorial groupings only.
    styles: [
      { id: 'dark-classic', label: 'Dark Classic', note: 'Charcoal fabric walls, black ceiling, deep carpet — the reference Sonor cinema look.' },
      { id: 'dark-blue',    label: 'Dark Blue',    note: 'Deep navy walls and cabinetry, brass accents, warm halo light — boutique cinema bar feel.' },
      { id: 'contemporary', label: 'Contemporary', note: 'Cleaner lines, grey tones, slatted timber accents, minimal pattern.' },
      { id: 'warm-fabric', label: 'Warm Fabric', note: 'Softer warm greys and taupes, brass-toned fittings, gentle contrast.' },
      { id: 'art-deco', label: 'Art Deco', note: 'Richer colour, fluted panels, feature lighting, brass and velvet.' }
    ],

    // ── Section blurbs (v0.6.0) — standards + quality context per proposal
    //    section. PDF-rendered: every word must be ff/ffl-ligature safe. ──
    sectionBlurbs: {
      concepts: 'Concept renders for the scheme — these set the direction and feel of the room. They are visual intent, not construction drawings; the technical plans govern the build.',
      video: 'A reference-grade picture is engineered, not just bought: image size, mounting height and seating distance are set together to the SMPTE and CEDIA viewing-angle recommendations, so 4K HDR material resolves full detail with no visible pixel structure and no neck strain from any seat.',
      audio: 'Dolby Atmos places sound as objects in three-dimensional space — a bed of speakers around the room plus height channels above. The layout below is engineered to the CEDIA/CTA RP22 recommended practice: every channel is aimed at the listening area, matched in level and distance, then calibrated in-room on commissioning.',
      lighting: 'Warm white (2700K) throughout, every circuit dimmable via Rako scenes. Lighting is layered — architectural downlights, concealed linear LED and feature accents — so the room moves from welcome to full blackout in one press.',
      led: 'Concealed linear LED provides the glow that gives a cinema its depth. Every run is hidden in a recess or cove — the light is seen, the source never is. Warm white, dimmable to 1%, no RGB.',
      star: 'A fibre-optic star field brings the ceiling to life without a single visible fitting — invisible by day, a night sky at the touch of a scene.',
      materials: 'One pick per surface from the Sonor aesthetic library. Physical samples are provided for approval before any order is placed — photographic reproduction and fabric batches can vary.'
    },

    // Material slots — one pick per slot from the matching catalogue category.
    // optional:true adds "None / existing" + "Painted finish" pseudo-options.
    slots: [
      { id: 'wall_fabric',    label: 'Wall Fabric',     cat: 'wall_fabric',    optional: true, hint: 'Stretched fabric walls / fabric-faced acoustic build-up' },
      { id: 'acoustic_panel', label: 'Acoustic Panels', cat: 'acoustic_panel', optional: true, hint: 'Visible treatment panels — absorbers and diffusion' },
      { id: 'ceiling',        label: 'Ceiling Finish',  cat: 'ceiling',        optional: true, hint: 'Finish for the chosen ceiling treatment', when: 'ceilingMaterial' },
      { id: 'carpet',         label: 'Carpet',          cat: 'carpet',         optional: true, hint: 'Cinema-grade carpet' },
      { id: 'curtain',        label: 'Curtain',         cat: 'curtain',        optional: true, hint: 'Blackout acoustic curtain fabric' },
      { id: 'joinery',        label: 'Joinery',         cat: 'joinery',        optional: true, hint: 'Media wall, shelving and cabinetry finish' }
    ],

    // ── v0.4.0 — full design scope ────────────────────────────────────────
    // Ceiling treatment — MUTUALLY EXCLUSIVE (star ceiling vs painted vs panels
    // vs stretched fabric). Star includes the recessed acoustic ceiling build.
    ceilingTreatments: [
      { id: 'star',    label: 'Star Ceiling',       note: 'Fibre-optic star field set into the recessed acoustic ceiling — includes the ceiling build.' },
      { id: 'panels',  label: 'Acoustic Panels',    note: 'Fabric-wrapped acoustic ceiling panels — finish chosen in Materials.' },
      { id: 'fabric',  label: 'Stretched Fabric',   note: 'Full stretched-fabric ceiling with concealed services.' },
      { id: 'painted', label: 'Painted',            note: 'Decorated plasterboard — colour from the scheme palette.' },
      { id: 'bulkhead',label: 'Recessed Bulkhead',  note: 'Perimeter bulkhead with concealed cove LED — panel or fabric infill within.' },
      { id: 'none',    label: 'None / Existing',    note: 'Retain the existing ceiling.' }
    ],
    // ── v0.7.0 — dynamic Library option groups. Rendered straight from
    //    aesthetic_items rows carrying metadata.select_mode (one|multi|toggle);
    //    placement maps each category onto a wizard step. Rows WITHOUT a
    //    select_mode stay finish/swatch entries (slot menus filter on this).
    optionGroups: [
      { cat: 'screen',             label: 'Projection Screen',   step: 'video',     hint: 'Screen build — geometry stays in the Cinema Takeoff' },
      { cat: 'front_wall',         label: 'Front Wall Build',    step: 'video',     hint: 'The screen-wall construction route' },
      { cat: 'seating_option',     label: 'Seating Options',     step: 'scheme',    hint: 'Tiers, rows and extras — tick all in scope' },
      { cat: 'wall_treatment',     label: 'Wall Treatment',      step: 'materials', hint: 'The overall wall build — fabric picks below' },
      { cat: 'acoustic_treatment', label: 'Acoustic Treatment',  step: 'materials', hint: 'Performance treatment — tick all in scope' },
      { cat: 'cabinetry',          label: 'Cabinetry',           step: 'materials', hint: 'Joinery scope — detail in the notes below' },
      { cat: 'control',            label: 'Control System',      step: 'lighting',  hint: 'How the room is driven' }
    ],
    // Tiered seating (design intent — geometry stays owned by the Cinema Takeoff)
    riserOptions: [
      { id: 'none',   label: 'Flat floor',      note: 'Single level — no riser' },
      { id: 'single', label: 'Single riser',    note: 'Rear row raised on an acoustic riser' },
      { id: 'double', label: 'Two-tier riser',  note: 'Stepped risers for three-row rooms' }
    ],
    // Downlight grade ladder — essential → high end
    downlightGrades: [
      { id: 'aurora',  label: 'Aurora',              tier: 'Essential', note: 'Quality trade-grade dimmable warm-white downlights' },
      { id: 'orluna',  label: 'Orluna',              tier: 'Premium',   note: 'High-end low-glare architectural downlights' },
      { id: 'lol',     label: 'Lighting of London',  tier: 'Bespoke',   note: 'Top-tier bespoke architectural fittings' }
    ],
    // LED zones — tick everything that gets a concealed linear run
    ledZones: [
      { id: 'coffer',        label: 'Ceiling Cove',        hint: 'Perimeter cove in the recessed ceiling' },
      { id: 'pilaster',      label: 'Pilasters',           hint: 'Vertical wash in wall pilasters / columns' },
      { id: 'step_nose',     label: 'Step Nosing',         hint: 'Riser and step edge nosing strips' },
      { id: 'accent',        label: 'Accent / Skirting',   hint: 'Low-level accent runs and skirting detail' },
      { id: 'backlit_poster',label: 'Backlit Movie Posters', hint: 'Halo-lit poster frames' },
      { id: 'shelf',         label: 'Shelf Recess',        hint: 'In-recess shelf and display lighting' },
      { id: 'riser_front',   label: 'Riser Front',         hint: 'Low-level wash to the riser face' }
    ],
    // Sundries & accessories — checklist fallback; the Library's 'sundry'
    // catalogue category takes over as it is curated (real models + images).
    sundries: [
      { id: 'popcorn',      label: 'Popcorn Machine',        hint: 'Feature counter-top machine — doubles as accent light' },
      { id: 'drinks_fridge',label: 'Drinks Fridge',          hint: 'Under-counter glass-door fridge' },
      { id: 'perfectdraft', label: 'PerfectDraft Beer Tap',  hint: 'Counter-top draught dispenser' },
      { id: 'side_tables',  label: 'Side / Lounge Tables',   hint: 'Between-seat and front-of-row occasional tables' },
      { id: 'bar_stools',   label: 'Bar Stools',             hint: 'For the refreshments counter' },
      { id: 'poster_frames',label: 'Movie Poster Frames',    hint: 'Framed artwork — backlight under LED zones' },
      { id: 'snack_station',label: 'Snack / Candy Station',  hint: 'Jars, scoops and display for the counter' },
      { id: 'throws',       label: 'Throws & Cushions',      hint: 'Fabric-matched soft accessories' }
    ],

    // Lighting fitting types — point-source fittings only (v0.4.0: linear LED
    // moved to ledZones; star ceiling moved to ceilingTreatments).
    fittingTypes: [
      { id: 'downlight',     label: 'Recessed Downlights',      hint: 'Warm-white, dimmable — grade chosen above' },
      { id: 'wall_wash',     label: 'Wall Wash',                hint: 'Feature wash to rear wall / shelving' },
      { id: 'picture_light', label: 'Picture / Poster Lights',  hint: 'Over framed artwork' }
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
