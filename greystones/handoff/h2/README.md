# Render handoff h2 — project 1392 (generated 2026-10-16T16:56:36.811Z)

Derived by Cinema Design (Cinema Design v7.26.0 · 28-render-handoff 1.1.0) from the saved design row + Cinema Takeoff state (design v6, CT v1.56.0). Not a second model — regenerate as h3 after any design change; never edit hN in place.

| file | what |
|---|---|
| `design-spec.json` | the derived spec (coordinate frame stated inside) |
| `floorplan-canon.png` | Takeoff plan — pass as `--layoutref` (overall adjacency/orientation only) |
| `elevations/*.png` | Takeoff front/rear/left/right walls + coffer ceiling plan |
| `views/<slot>/geometry.png` + `camera.json` | clay-with-edges per slot — pass the folder as `--structref views` |
| `nano-banana-prompts-skeleton.md` | canon facts filled, `{{prose}}` to write (rules v2) → save as `../../nano-banana-prompts-rN.md` |

Runner 2.0 (from `renders/<project>/`):
```bash
node ../../greystones/nano-banana-batch.mjs --file nano-banana-prompts-rN.md --structref handoff/h2/views --styleref site-photos/<best>.jpg --photos site-photos --layoutref handoff/h2/floorplan-canon.png --out rN --only 1 --dry-run
node ../../greystones/nano-banana-batch.mjs --file nano-banana-prompts-rN.md --structref handoff/h2/views --styleref rN/01-hero-screen-wall.png --photos site-photos --layoutref handoff/h2/floorplan-canon.png --out rN --only 2,3,4,5,6
```

Files written: design-spec.json, floorplan-canon.png, elevations/front.png, elevations/rear.png, elevations/left.png, elevations/right.png, views/hero/geometry.png, views/hero/camera.json, views/wallRear/geometry.png, views/wallRear/camera.json, views/wallLeft/geometry.png, views/wallLeft/camera.json, views/detail/geometry.png, views/detail/camera.json, views/seat/geometry.png, views/seat/camera.json, views/wallRear-alt/geometry.png, views/wallRear-alt/camera.json, nano-banana-prompts-skeleton.md
