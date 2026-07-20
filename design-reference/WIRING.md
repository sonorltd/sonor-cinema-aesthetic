# Bespoke Cinema Design Concept — wiring into the Cinema Aesthetic app

A per-project, versioned, editable A3 mood board that accompanies the main
Cinema Design Proposal PDF. Three drop-in steps. No new tables — the board
rides inside `aesthetic_configs.config.moodboard`, so it is per-project and
versioned exactly like the rest of the board config.

Files in this handoff:
- `aesthetic-moodboard.js` → copy to `data/aesthetic-moodboard.js`
- `preview.html` → local sandbox only (do not ship)

The rendered look is the reference DC: `Bespoke Cinema Design Concept.dc.html`.

---

## 1 · Host — load the module

In `dashboard/sonor-cinema-aesthetic.html`, add alongside the other `data/*.js`
includes, AFTER `aesthetic-app.js`:

```html
<script src="../data/aesthetic-moodboard.js"></script>
```

(Match the relative path the other data scripts use.)

## 2 · `data/aesthetic-app.js` — add the launch button

In `renderSummary()`, in the `.actions` block, add the button next to
"Save board" (internal builds only, same `!CLIENT` gate):

```js
h += '<div class="actions">' +
  (!CLIENT ? '<button class="btn ghost" onclick="AestheticApp.saveConfig()">Save board</button>' : '') +
  (!CLIENT ? '<button class="btn ghost" onclick="AestheticApp.openMoodBoard()">Bespoke Cinema Design Concept</button>' : '') +
  '<button class="btn primary" onclick="AestheticApp.savePdf()">Download Cinema Design Proposal</button></div>';
```

## 3 · `data/aesthetic-app.js` — add the opener + export it

Add this function inside the IIFE (near `savePdf`), so it can see the
`pdfModel` / `dbc` / `cfg` / `CFG` closures:

```js
async function openMoodBoard() {
  if (!global.AestheticMoodBoard) { console.warn('[aesthetic] moodboard module not loaded'); return; }
  global.AestheticMoodBoard.open({
    model: pdfModel(),                 // same data that drives the proposal PDF
    board: cfg.moodboard || {},        // persisted board state (images + text + ref)
    db: dbc(),                         // enables Supabase storage image upload
    projectId: cfg.projectId,
    appVersion: CFG.version,
    onSave: async function (board) {
      cfg.moodboard = board;           // rides inside aesthetic_configs.config → per-project + versioned
      await saveConfig();              // same save path + app_version stamp as everything else
    }
  });
}
```

Then add it to the public `global.AestheticApp = { … }` map:

```js
    setOption: setOption, toggleOption: toggleOption,
    openMoodBoard: openMoodBoard,      // ← add this line
```

---

## How it behaves

- **Adaptive sections** — each section auto-shows only when the project has that
  feature, detected from `pdfModel()`: e.g. **curtain** appears only if a
  curtain/drape shows up in the picks or options; **shelves** only with
  joinery/cabinetry/recess; **riser** only when seating is tiered (not flat);
  **lighting/scope/palette** only when those exist. A **Sections ▾** panel in the
  toolbar lists every section with its auto result and a per-section override
  (Auto / Always show / Hide). Overrides save into `board.sections` — per-project
  and versioned with the rest. The board reflows its column counts automatically.
- **Prefill** — heading, room size, spec bullets, lighting, design scope and the
  colour palette are derived from `pdfModel()` (room dims, surface picks,
  fittings, AV headline, `design_palette`). Every line is editable inline; edits
  are stored as overrides in `board.text` and win over the derived defaults.
- **Images** — hero, layout plan, 4 wall views, riser diagram, seat, curtain and
  two shelf slots. Click or drag/drop to replace. Uploads go to the
  `seating-assets` bucket at `aesthetic/moodboard/<projectId>/…`; if storage is
  unavailable it falls back to an embedded data URL.
- **Versioning** — "Save concept" writes `cfg.moodboard` through `saveConfig()`,
  so it lands in `aesthetic_configs.config.moodboard` with the same `app_version`
  stamp and shows in the Saved boards list. Opening a saved board restores it.
- **Reference** — each concept mints `SNR-BC-yymmdd-XXXX` (shown top-right),
  parallel to the proposal's `SNR-CD-…`.
- **Export** — "Export PDF" prints the board only, at A3 landscape
  (420×297mm), to sit beside the main spec PDF.

## Notes / decisions for you

- `pdfModel()` runs `deepSafe()` (Gilroy `ff→f f` ligature guard). Board text
  inherits that, so names stay PDF-safe and consistent with the proposal. If you
  want raw names on-screen, pass a pre-`deepSafe` model instead.
- The board is internal-only (gated with `!CLIENT`) to match `saveConfig`. If
  clients should view (not edit) it, relax the gate and set the `contenteditable`
  fields read-only for client builds.
- Storage bucket assumed to be `seating-assets` (same as `design_renders`).
  Change `BUCKET` at the top of the module if different.
- Bump `app_versions` via `/version-bump` when you ship this (new feature).
