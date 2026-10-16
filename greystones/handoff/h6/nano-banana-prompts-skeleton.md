# {{client}} — Cinema — nano-banana prompts rN  (from handoff h6, design v12 / CT v1.58.0)
### rN (2026-10-16): GEOMETRY-AWARE revision — written to rules v2. Each prompt attaches `views/<slot>/geometry.png` via `--structref h6/views`; hero first with the site style-ref, then every other slot with the approved hero FIRST. Geometry governs structure; hero governs appearance; site photos govern retained conditions only. Nothing moves between views.

## STYLE BLOCK (prepend to every prompt)
ROOM CANON (single source — every prompt repeats only what is here):
ROOM: rectangular, 4.00 m wide × 6.00 m deep × 2.70 m high. Screen wall built out flat; the room behind the fabric is never shown. Carpet throughout.
SCREEN: 3.20 m × 1.80 m (145"), centred on the screen wall, bottom 500 mm above the floor. {{halo: warm LED halo evenly around the screen | none}}
SEATING: one U-shaped fixed modular sofa, 3.2 m across the back with two 2.2 m returns toward the screen, seat 450 mm, low 780 mm back, silver-grey fabric, back to the rear wall, opening squarely toward the screen. Nothing else on the floor.
WALLS: {{paint / stretched fabric per wall — from the Cinema Aesthetic scheme}}. stretched fabric, full width, nothing but the screen.
CEILING: continuous lower perimeter bulkhead around a higher flat central ceiling — band 600 mm, 300 mm drop; concealed warm LED at the inner reveal washing UP onto the higher centre — band meets the walls solidly, no outer gap or wall wash; 8 recessed spots in the band underside exactly where the geometry shows them; plain flat centre, no stars.
OPENING: opening on the left wall at x 0–0 mm — as drawn in the geometry; never moved.
PROJECTOR: compact unit tight to the underside of the rear bulkhead, minimal bracket, no drop pole; optical centreline on the screen centreline (x 2000, y 5700, z 2250), 5700 mm throw as modelled in Takeoff; position as drawn in the geometry.
LIGHT: warm 2700K only — the concealed cove uplight and the recessed spot pools are the only sources, no RGB, no daylight, no windows. Moody, cinematic, high-end. 16:9.
FACTS (sourced): F1 Room shell from Cinema Takeoff polygon; screen wall is built out flat at y=0 mm (service recess behind it). [modelled] · O1 opening on left wall, world x 0–0 mm, y 1800–4200, 2300 mm high. [modelled] · P1 Projector tight to the underside of the rear bulkhead, minimal bracket, no drop pole; optical centreline on the screen centreline (world x=2000, y=5700, z=2250 mm; Takeoff throw as modelled: 5700 mm). [assumed] · C1 Ceiling: continuous lower perimeter bulkhead around a higher flat central ceiling — band 600/600/600/600 mm (L/R/front/rear), drop 300 mm (underside z=2400, centre z=2700); concealed warm LED at the inner reveal washing up; no stars. [assumed] · C2 8 recessed spots in the band underside: SP-L1 (300,2200), SP-L2 (300,3800), SP-R1 (3700,2200), SP-R2 (3700,3800), SP-F1 (1533,300), SP-F2 (2467,300), SP-B1 (1533,5700), SP-B2 (2467,5700). [assumed]

## 1 · HERO — screen wall  → hero slot
### (attach site photos)
{{prose: screen wall from the rear of the room — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 2 · SEATING — from the screen looking back  → wallRear slot
{{prose: seating & tier — from the screen looking back — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 3 · SIDE ELEVATION — sofa & projector line  → wallLeft slot
{{prose: side elevation — tier & projector line — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 4 · CEILING DETAIL — coffer LED  → detail slot
{{prose: ceiling detail — coffer / LED — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 5 · SEATING DETAIL — close-up  → seat slot
{{prose: one seat close-up — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 6 · REAR CORNER — rear wall & projector  → wallRear-alt slot
{{prose: rear corner — door & niches — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## 7 · COVER — document front page (portrait)  → cover slot
### portrait 3:4 — PDF cover: the image fades to black in its lower third for the title, so keep that third calm (sofa back + carpet), no fixtures or detail there; same room, same finishes as the approved hero
{{prose: document cover — portrait, screen wall over the sofa, lower third kept quiet for the title — one job, name the slot, left/right relative to the screen; preserve the geometry's camera, openings and object positions}}

## Board note
References: [0] hero prompt = site style-ref (`--styleref site-photos/<best>.jpg`), other slots = approved hero (`--styleref rN/01-hero-screen-wall.png`) · [1] `h6/views/<slot>/geometry.png` · site photos where asked · `--layoutref h6/floorplan-canon.png` last. Two-stage run; approve 01 before 2–6. `--dry-run` first.
