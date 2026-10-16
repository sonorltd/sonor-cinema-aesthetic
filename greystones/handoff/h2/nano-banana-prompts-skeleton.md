# {{client}} — Cinema — nano-banana prompts rN  (from handoff h2, design v6 / CT v1.56.0)
### rN (2026-10-16): GEOMETRY-AWARE revision — written to rules v2. Each prompt attaches `views/<slot>/geometry.png` via `--structref h2/views`; hero first with the site style-ref, then every other slot with the approved hero FIRST. Geometry governs structure; hero governs appearance; site photos govern retained conditions only. Nothing moves between views.

## STYLE BLOCK (prepend to every prompt)
ROOM CANON (single source — every prompt repeats only what is here):
ROOM: rectangular, 4.00 m wide × 6.00 m deep × 2.70 m high. Screen wall built out flat; the room behind the fabric is never shown. Carpet throughout.
SCREEN: 3.20 m × 1.80 m (150"), centred on the screen wall, bottom 500 mm above the floor. {{halo: warm LED halo evenly around the screen | none}}
SEATING: one U-shaped fixed modular sofa, 3.2 m across the back with two 2.2 m returns toward the screen, seat 450 mm, low 780 mm back, silver-grey fabric, back to the rear wall, opening squarely toward the screen. Seat pitch undefined mm. Nothing else on the floor.
WALLS: {{paint / stretched fabric per wall — from the Cinema Aesthetic scheme}}. stretched fabric, full width, nothing but the screen.
OPENING: opening on the left wall at x 0–0 mm — as drawn in the geometry; never moved.
LIGHT: warm 2700K only — no visible sources, no RGB, no daylight, no windows. Moody, cinematic, high-end. 16:9.
FACTS (sourced): F1 Room shell from Cinema Takeoff polygon; screen wall is built out flat at y=0 mm (service recess behind it). [modelled] · O1 opening on left wall, world x 0–0 mm, y 1800–4200, 2300 mm high. [modelled]

## 1 · HERO — screen wall  → hero slot
### (attach site photos)
{{prose: screen wall from the rear of the room — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 2 · SEATING & TIER — from the screen looking back  → wallRear slot
{{prose: seating & tier — from the screen looking back — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 3 · SIDE ELEVATION — tier & projector line  → wallLeft slot
{{prose: side elevation — tier & projector line — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 4 · CEILING DETAIL — coffer LED  → detail slot
{{prose: ceiling detail — coffer / LED — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 5 · SEATING DETAIL — close-up  → seat slot
{{prose: one seat close-up — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 6 · REAR CORNER — door & niches  → wallRear-alt slot
{{prose: rear corner — door & niches — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## Board note
References: [0] hero prompt = site style-ref (`--styleref site-photos/<best>.jpg`), other slots = approved hero (`--styleref rN/01-hero-screen-wall.png`) · [1] `h2/views/<slot>/geometry.png` · site photos where asked · `--layoutref h2/floorplan-canon.png` last. Two-stage run; approve 01 before 2–6. `--dry-run` first.
