# Cinema Aesthetic — Integration Ideas

## Data this app can provide
- Per-project aesthetic selections (`aesthetic_configs.config`): wall fabric, panels,
  ceiling, carpet, curtain, joinery, lighting fittings + scenes, style direction.
- Mood board PDFs (quote-ref'd SNR-AE-…) for client packs.

## Data this app consumes
- `v_aesthetic_catalogue` (Library-owned aesthetic_items).
- `cinema_designs` room dims · `seating_configs` seat pick · `projects.metadata.brief`.

## Requests to other projects
- **Library**: curate real manufacturer fabrics/carpets/fittings into `aesthetic_items`
  with `swatch_img` photos (bucket pattern like seating-assets); starter rows are
  `metadata.needs_review=true`.
- **Cinema Design**: read the active aesthetic config (materials per surface) into its
  materials BoQ / fabric tab so CD consumes aesthetic picks rather than defining them.
- **Project Master brief page**: link the latest mood board PDF per project.

## Later
- Hero/wall image slots per board (project uploads via site-photos bucket).
- Room-generic boards (hallway, gym) — data model already room-agnostic via config jsonb.
- Aesthetic takeoff quantities (fabric m², carpet m², panel counts) pulled from CT geometry.
