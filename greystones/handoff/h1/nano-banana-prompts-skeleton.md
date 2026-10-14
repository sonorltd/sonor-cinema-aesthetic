# {{client}} — Cinema — nano-banana prompts rN  (from handoff h1, design v4 / CT v?)
### rN (2026-10-14): GEOMETRY-AWARE revision — written to rules v2. Each prompt attaches `views/<slot>/geometry.png` via `--structref h1/views`; hero first with the site style-ref, then every other slot with the approved hero FIRST. Geometry governs structure; hero governs appearance; site photos govern retained conditions only. Nothing moves between views.

## STYLE BLOCK (prepend to every prompt)
ROOM CANON (single source — every prompt repeats only what is here):
ROOM: rectangular, 4.00 m wide × 6.00 m deep × 2.70 m high. Screen wall built out flat; the room behind the fabric is never shown. Carpet throughout.
SCREEN: 3.25 m × 1.82 m (150"), centred on the screen wall, bottom 300 mm above the floor. {{halo: warm LED halo evenly around the screen | none}}
SEATING: 2 rows of 4 charcoal leather recliners, rear row on a 300 mm tier. Seat pitch 825 mm. Nothing else on the floor.
WALLS: {{paint / stretched fabric per wall — from the Cinema Aesthetic scheme}}. stretched fabric, full width, nothing but the screen.
OPENING: door-single on the rear wall at x 2850–3700 mm — as drawn in the geometry; never moved.
LIGHT: warm 2700K only — no visible sources, no RGB, no daylight, no windows. Moody, cinematic, high-end. 16:9.
FACTS (sourced): F1 Room shell from Cinema Takeoff polygon; screen wall is built out flat at y=0 mm (service recess behind it). [modelled] · F2 Rear row on a raised tier; riser height not modelled in Takeoff — 300 mm assumed. [assumed] · O1 door-single on rear wall, world x 2850–3700 mm, y 6000–6000, 2100 mm high. [modelled]

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
References: [0] hero prompt = site style-ref (`--styleref site-photos/<best>.jpg`), other slots = approved hero (`--styleref rN/01-hero-screen-wall.png`) · [1] `h1/views/<slot>/geometry.png` · site photos where asked · `--layoutref h1/floorplan-canon.png` last. Two-stage run; approve 01 before 2–6. `--dry-run` first.
