# Cinema Aesthetic — Claude Code Context (v0.4.0)

> **Spine version: 1.2** (SONOR-APP-SPINE.md)
> Inherits: `../CLAUDE.md` (master brand rules + cross-project references)
> Brand source: `../Branding - CORE/brand-core.xml`
> Repo: `sonor-cinema-aesthetic` · Pages: https://sonorltd.github.io/sonor-cinema-aesthetic/

> **⚠ READ `/SEATING-SSOT-CONTRACT.md` before touching anything that reads seating data.**
> This app is a READ-ONLY consumer of `seating_configs` (project seat context) and follows
> the same Library-as-SSOT consumer rules for its own `aesthetic_*` domain.

## What this is
Client-facing **cinema aesthetic configurator** — the LOOK counterpart to the Seating
Configurator (which it is architecturally cloned from) and the technical CD/CT apps.
Flow: **Intro → Scheme → Materials → Lighting → Summary**, outputting a branded
**mood board PDF** in the exact seating-proposal format (cinema-pdf-luxury system).
No pricing — aesthetics are priced on the main cinema proposal.

Owns every client-facing aesthetic selection per project (wall fabric, acoustic panels,
ceiling, carpet, curtain, joinery, lighting fittings + scenes) and feeds it back to the
design apps, the same way CT owns geometry: **one owner per fact**.

## SSOT
- **`aesthetic_items`** (Library-owned catalogue) read via **`v_aesthetic_catalogue`** —
  this app never writes catalogue rows. Starter set (24 generic items, `metadata.needs_review`)
  seeded at app birth 2026-07-19; the Library curates the real manufacturer entries + swatch photos.
- **`aesthetic_configs`** — this app's ONLY table writes (mirror of `seating_configs`:
  insert/update, soft-delete via `archived`, never DELETE).
- 4-tier load (Supabase view → localStorage `sonor_aesthetic_ssot_v1` → bundled seed →
  empty). Bump the cacheKey whenever the adapted shape changes. Seed = `data/aesthetic-catalogue.js`.

## Cross-app reads (live context — never retyped)
- `cinema_designs.room_width/depth/height` — room dims for the active project.
- `seating_configs` (latest, not archived) — the chosen seating for the board.
- `projects` (client_name, address, metadata.brief) — identity + client lighting concept.
- Deep links: `?config=<uuid>` opens a saved board; `?project=<name>` prefills.

## Modules (keep modular — no monolith)
```
dashboard/sonor-cinema-aesthetic.html  host: hidden SonorShell + site header + landing + .sc wizard
data/aesthetic-config.js               window.__AESTHETIC_CONFIG__ — flow rules/slots/scenes/terms
data/aesthetic-catalogue.js            window.__AESTHETIC_SEED__ — Tier-3 offline snapshot
data/aesthetic-engine.js               SonorAesthetic — SSOT load + item resolution
data/aesthetic-app.js                  AestheticApp — wizard UI + saved boards + PDF model
data/aesthetic-pdf.js                  AestheticPdf — 4-page luxury mood board (pdf-lib + Gilroy)
```

## Brand
Sonor slate chrome (`data-theme="slate"`, hidden) + the **scoped luxury dark-gold canvas**
(`.sc` block) + sonor.co.uk-aligned client landing — the SAME documented Brand Override as
the Seating Configurator (raw hex confined to `.sc`/`#intro`; `:root` untouched, S-4.1).
PDF: cinema-pdf-luxury skill rules apply (frame-edge, divider discipline, Gilroy glyph traps,
render-and-eyeball before shipping).

## Drawing model
**Drawing model: n/a (no canvas)** — swatch tiles and PDF vector drawing only.

## Rules
1. Consumer reads views only; NEVER write `aesthetic_items` or any seating/cinema table.
2. Every mood board export mints `SNR-AE-yymmdd-XXXX` and carries it on cover + detail page.
3. Client build gate `window.__AESTHETIC_CLIENT__` strips project bar + saved boards + all writes.
4. Version bump = atomic (`/version-bump`); never hand-write `app_versions`.
5. PDF changes: render headlessly + eyeball every affected page before deploy (skill §7).

## Feature timeline
- v0.1.0 (2026-07-19) — app birth: scaffolded from the Seating Configurator pattern.
  Scheme/Materials/Lighting/Summary wizard, aesthetic_items starter catalogue (24 items),
  aesthetic_configs saves, project bar (appKey 'cinema-aesthetic'), live CD/seating/brief
  context pulls, 4-page mood board PDF (cover · board · lighting · detail).
- v0.2.0 (2026-07-19) — **Cinema Design Proposal.** PDF rebuilt on shared root master
  `data/sonor-pdf-luxury.js` (exact seating chrome; same cover image + logos — venice
  hero, Sonor lockup, CEDIA). 9 data-driven sections incl. video/audio/LED/star ceiling
  from `cinema_designs.ct_state.metadata` (sections drop when empty). Cineca Jan-2026
  wall fabrics + Diamond panels in `aesthetic_items` (no trade pricing). Ref SNR-CD-….
  Gotchas honoured: Gilroy ff/ffl ligature ban (no "coffer"/"baffle"/"off" in PDF text),
  truncate-vs-wrap on tile names, frame-edge rule.
- v0.3.0 (2026-07-19) — **AV configurator (in-house).** New Video + Audio wizard steps:
  display route (TV / projector / projector+AT wall) with hardware chosen by
  manufacturer from the Library's `device_catalogue` (read-only, cached, discontinued
  filtered); Atmos layout picker (5.1.2→9.1.6) with per-channel-group speaker selection
  (fronts L+R, centre, surrounds, rears, heights), subs + qty, processor + power amp.
  Live AV sidebar; selections saved in aesthetic_configs.config.av; proposal Audio page
  gains the channel-by-channel LOUDSPEAKERS schedule + ELECTRONICS block; Video page
  shows the chosen model. Screen geometry stays CT-owned. Client exposure HELD (Bryn:
  in-house until nailed) — everything still behind the internal build.
- v0.4.0 (2026-07-19) — **Full design scope** (Bryn: "we need a full scope"). Ceiling
  treatment MUTUALLY EXCLUSIVE (star / acoustic panels / stretched fabric / painted /
  none — star excludes painted+panels by construction); tiered-seating intent (flat /
  single / two-tier); downlight grade ladder Aurora→Orluna→Lighting of London; wall
  lights/sconces held as TBC with notes; LED zone ticks (cove, pilasters, step nosing,
  accent/skirting, backlit posters, shelf, riser front — replaces the old linear
  fitting toggles); None/Painted pseudo-options on every surface slot; joinery &
  cabinetry notes; sundries checklist (popcorn, fridge, PerfectDraft, tables, stools,
  poster frames, snack station, throws) reading the Library 'sundry' category when
  curated, config fallback until then. Proposal: +Joinery & Sundries section, LED page
  lists zones, lighting page carries grade + sconces-TBC, painted tiles on the board.
  Catalogue: +sundry (8) and sconce (1) categories, all needs_review for Library
  curation. NOTE for Library: item names must avoid ff/ffl ligature words (Gilroy PDF
  break — "Coffee" → renamed "Side / Lounge Tables"); or supply a pdf-safe display name.
