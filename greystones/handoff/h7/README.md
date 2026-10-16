# Render handoff h7 — project 1392 (generated 2026-10-16T21:38:48.949Z)

Derived by Cinema Design (Cinema Design v7.28.0 · 28-render-handoff 1.3.0) from the saved design row + Cinema Takeoff state (design v14, CT v1.58.0). Not a second model — regenerate as h8 after any design change; never edit hN in place.

| file | what |
|---|---|
| `design-spec.json` | the derived spec (coordinate frame stated inside) |
| `floorplan-canon.png` + `.svg` | PLAN from the world model (same model as the clay) — positional canon; GPT styles it (charcoal/bronze sheet), never redraws it |
| `elevations/<wall>.png` + `.svg` | four elevations from the world model (screen, openings, bulkhead, spots, PJ1, sofa profile) |
| `takeoff/*` | the Takeoff app's own captures — reference only (its plan has no seating; its elevations lag the model) |
| `views/<slot>/geometry.png` + `camera.json` | clay-with-edges per slot; `camera.json` carries position/target/fov, aspect/px and `visible_ids` |
| `canon-seed.md` | geometry lines for `review/<WQ>/canon.md` (GPT keeps the finish lines) |
| `nano-banana-prompts-skeleton.md` | canon facts filled, `{{prose}}` to write → GPT saves `review/<WQ>/nano-banana-prompts-rN.md` |

Method: `review/cinema-render-method-v1.md` — GPT renders with its image tool: [0] approved hero (site/mood style-ref for the hero itself), [1] this slot's geometry.png, site photos where the prompt asks, plan last. Nano Banana is optional (runner 2.0, from `renders/<project>/`):
```bash
node ../../greystones/nano-banana-batch.mjs --file nano-banana-prompts-rN.md --structref handoff/h7/views --styleref site-photos/<best>.jpg --photos site-photos --layoutref handoff/h7/floorplan-canon.png --out rN --only 1 --dry-run
node ../../greystones/nano-banana-batch.mjs --file nano-banana-prompts-rN.md --structref handoff/h7/views --styleref rN/01-hero-screen-wall.png --photos site-photos --layoutref handoff/h7/floorplan-canon.png --out rN --only 2,3,4,5,6
```

Files written: design-spec.json, floorplan-canon.png, floorplan-canon.svg, elevations/front.png, elevations/front.svg, elevations/rear.png, elevations/rear.svg, elevations/left.png, elevations/left.svg, elevations/right.png, elevations/right.svg, takeoff/plan.png, takeoff/elevations/front.png, takeoff/elevations/rear.png, takeoff/elevations/left.png, takeoff/elevations/right.png, takeoff/ceiling-coffer.png, canon-seed.md, views/hero/geometry.png, views/hero/camera.json, views/wallRear/geometry.png, views/wallRear/camera.json, views/wallLeft/geometry.png, views/wallLeft/camera.json, views/detail/geometry.png, views/detail/camera.json, views/seat/geometry.png, views/seat/camera.json, views/wallRear-alt/geometry.png, views/wallRear-alt/camera.json, views/cover/geometry.png, views/cover/camera.json, nano-banana-prompts-skeleton.md
