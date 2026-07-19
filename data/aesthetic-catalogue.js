/* Sonor Cinema Aesthetic — Tier-3 offline seed (v0.1.0)
   window.__AESTHETIC_SEED__ — snapshot of v_aesthetic_catalogue. STARTER SET:
   generic Sonor-standard entries (metadata.needs_review=true) seeded at app birth;
   the Library grows/curates the real catalogue (manufacturer fabrics, swatch photos,
   verified fittings). Regenerate with data/build-seed.sh once live — keep this file
   in lockstep with the view shape (engine adapt()).
*/
(function () {
  window.__AESTHETIC_SEED__ = { generated: '2026-07-19', items: [
    // ── wall fabric ──────────────────────────────────────────────────────────
    { id: 'wf-charcoal',   category: 'wall_fabric', name: 'Charcoal Weave',     hex: '#3d3a36', tier: 2, note: 'Dark grey acoustic weave — reference Sonor cinema wall', sort_order: 10, metadata: { needs_review: true } },
    { id: 'wf-anthracite', category: 'wall_fabric', name: 'Anthracite',         hex: '#2e2c29', tier: 2, note: 'Near-black with warm undertone', sort_order: 20, metadata: { needs_review: true } },
    { id: 'wf-midnight',   category: 'wall_fabric', name: 'Midnight Blue',      hex: '#232a3a', tier: 2, note: 'Deep blue feature colour — hallway carry-through', sort_order: 30, metadata: { needs_review: true } },
    { id: 'wf-taupe',      category: 'wall_fabric', name: 'Warm Taupe',         hex: '#6b6156', tier: 2, note: 'Softer warm-fabric scheme', sort_order: 40, metadata: { needs_review: true } },
    // ── acoustic panels ──────────────────────────────────────────────────────
    { id: 'ap-dark-fabric', category: 'acoustic_panel', name: 'Fabric Absorber — Dark Grey', hex: '#43403b', tier: 2, note: 'Fabric-wrapped broadband absorber', sort_order: 10, metadata: { needs_review: true } },
    { id: 'ap-black',       category: 'acoustic_panel', name: 'Fabric Absorber — Black',     hex: '#26241f', tier: 2, note: 'Screen-wall and first-reflection zones', sort_order: 20, metadata: { needs_review: true } },
    { id: 'ap-fluted',      category: 'acoustic_panel', name: 'Fluted Timber Diffusion',     hex: '#4a3f33', tier: 3, note: 'Slatted timber over acoustic felt — feature walls', sort_order: 30, metadata: { needs_review: true } },
    // ── ceiling ──────────────────────────────────────────────────────────────
    { id: 'ce-black-panel', category: 'ceiling', name: 'Black Acoustic Panels', hex: '#242220', tier: 2, note: 'Acoustic ceiling panels, matt black', sort_order: 10, metadata: { needs_review: true } },
    { id: 'ce-fabric',      category: 'ceiling', name: 'Stretched Fabric — Dark', hex: '#2b2926', tier: 3, note: 'Full stretched-fabric ceiling with concealed cove', sort_order: 20, metadata: { needs_review: true } },
    // ── carpet ───────────────────────────────────────────────────────────────
    { id: 'cp-lightgrey', category: 'carpet', name: 'Light Grey Plush', hex: '#6b665e', tier: 2, note: 'Deep-pile cinema carpet', sort_order: 10, metadata: { needs_review: true } },
    { id: 'cp-charcoal',  category: 'carpet', name: 'Charcoal Plush',   hex: '#3a3733', tier: 2, note: 'Darker floor for full blackout schemes', sort_order: 20, metadata: { needs_review: true } },
    { id: 'cp-patterned', category: 'carpet', name: 'Deco Pattern',     hex: '#463f42', tier: 3, note: 'Patterned cinema broadloom — Art Deco schemes', sort_order: 30, metadata: { needs_review: true } },
    // ── curtain ──────────────────────────────────────────────────────────────
    { id: 'cu-darkgrey', category: 'curtain', name: 'Heavy Weave — Dark Grey', hex: '#33302c', tier: 2, note: 'Full-height blackout acoustic curtain, wave track', sort_order: 10, metadata: { needs_review: true } },
    { id: 'cu-velvet',   category: 'curtain', name: 'Velvet — Deep Plum',      hex: '#3a2b3d', tier: 3, note: 'Velvet drape — richer schemes', sort_order: 20, metadata: { needs_review: true } },
    // ── joinery ──────────────────────────────────────────────────────────────
    { id: 'jo-charcoal-oak', category: 'joinery', name: 'Charcoal Oak',   hex: '#4a443c', tier: 2, note: 'Media wall + shelving veneer', sort_order: 10, metadata: { needs_review: true } },
    { id: 'jo-black-matt',   category: 'joinery', name: 'Matt Black',     hex: '#211f1d', tier: 2, note: 'Understated cabinetry', sort_order: 20, metadata: { needs_review: true } },
    { id: 'jo-walnut',       category: 'joinery', name: 'Walnut Slat',    hex: '#59422f', tier: 3, note: 'Slatted walnut feature — gym/hallway carry-through', sort_order: 30, metadata: { needs_review: true } },
    // ── lighting (fittings catalogue — one per fitting type minimum) ────────
    { id: 'lt-downlight',  category: 'lighting', name: 'Recessed Downlight — Warm White', hex: '#f5d05c', tier: 2, note: '2700K, dimmable, low-glare baffle', sort_order: 10, metadata: { needs_review: true, fitting: 'downlight' } },
    { id: 'lt-perimeter',  category: 'lighting', name: 'Perimeter LED Cove',              hex: '#e8c9a0', tier: 2, note: 'Concealed strip in acoustic ceiling perimeter', sort_order: 20, metadata: { needs_review: true, fitting: 'led_perimeter' } },
    { id: 'lt-riser',      category: 'lighting', name: 'Riser Step Light',                hex: '#c9b28e', tier: 2, note: 'Low-level wash to riser front edge', sort_order: 30, metadata: { needs_review: true, fitting: 'riser_light' } },
    { id: 'lt-wallwash',   category: 'lighting', name: 'Wall Wash',                       hex: '#d8bd8f', tier: 2, note: 'Feature wash — rear wall / shelving', sort_order: 40, metadata: { needs_review: true, fitting: 'wall_wash' } },
    { id: 'lt-picture',    category: 'lighting', name: 'Picture Light — Brass',           hex: '#ad9978', tier: 3, note: 'Over framed movie artwork', sort_order: 50, metadata: { needs_review: true, fitting: 'picture_light' } },
    { id: 'lt-shelf',      category: 'lighting', name: 'Shelf Strip',                     hex: '#e0cfa8', tier: 2, note: 'In-recess shelf lighting', sort_order: 60, metadata: { needs_review: true, fitting: 'shelf_light' } },
    { id: 'lt-star',       category: 'lighting', name: 'Fibre-Optic Star Ceiling',        hex: '#b48fd6', tier: 3, note: 'Star field over the seating zone', sort_order: 70, metadata: { needs_review: true, fitting: 'star_ceiling' } }
  ] };
})();
