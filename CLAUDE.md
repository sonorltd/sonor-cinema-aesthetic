# Cinema Aesthetic — Claude Code Context (v0.11.0)

> **Spine version: 1.2** (SONOR-APP-SPINE.md)
> Inherits: `../CLAUDE.md` (master brand rules + cross-project references)
> Brand source: `../Branding - CORE/brand-core.xml`
> Repo: `sonor-cinema-aesthetic` · Pages: https://sonorltd.github.io/sonor-cinema-aesthetic/

> **⚠ READ `/SEATING-SSOT-CONTRACT.md` before touching anything that reads seating data.**
> This app is a READ-ONLY consumer of `seating_configs` (project seat context) and follows
> the same Library-as-SSOT consumer rules for its own `aesthetic_*` domain.

## OWNERSHIP — ONE SOURCE OF CONFIRMED SETTINGS (Bryn 2026-07-19)
This app is the CONFIRMING SOURCE for the design + AV spec summary (client-faceable).
Cinema Designer is the technical back end; CD + Cinema Takeoff CONSUME the confirmed
spec — they never define it. On every board save the app publishes
`projects.metadata.design_spec` atomically via `sonor_merge_project_metadata`
(single-key merge; this app is the ONLY writer of that key). CD/CT read it for
display + prefill. Geometry stays CT-owned; catalogue stays Library-owned.

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
- v0.5.0 (2026-07-19) — **AV grades + one-source feedback.** Bronze / Silver / Gold /
  Platinum system grades (Yamaha AVR → Denon/Arcam → Anthem/Arcam + Triad/Sonance →
  StormAudio + Sonance/Triad + Wisdom Audio speakers). Platinum carries a TBC banner
  (Wisdom range pending Habitech experience centre visit). Grade soft-filters the
  electronics pickers to its marques ("show all brands" escape). Grade templates
  reserved (`avGrades[].template`) — packaged out as ranges firm up. Proposal Audio
  page leads with SYSTEM GRADE. **publishDesignSpec()**: every board save merges the
  confirmed spec into projects.metadata.design_spec (RPC, atomic) — the ONE source
  CD/CT consume. Library asks: StormAudio + Wisdom Audio into device_catalogue.
- v0.5.1 (2026-07-19) — grade ladder restructure per Bryn: FIVE tiers — Bronze/Silver =
  Yamaha AVRs, Gold/Platinum = StormAudio processing, **Wisdom = 5th tier beyond
  platinum** (full Wisdom Audio system, TBC pending Habitech visit). Grade filter now
  applies to the PROCESSOR picker only — amps (Sonance/Triad/others) always manual.
- v0.6.0 (2026-07-19) — **Design concepts + dark blue + WeQuote-style AV lines.**
  New DESIGN CONCEPTS proposal section rendering projects.metadata.design_renders
  ({url,caption}[] — hero + 2 tiles); 'Dark Blue' style direction + navy catalogue kit
  (wf-midnight re-enabled, cp-navy, cu-navy-velvet, jo-navy-brass, ce-navy); 1387
  seeded with the Dark Blue board. AV lines carry per-line Product page + Datasheet
  links (device_catalogue product_url + metadata.datasheet_url/img — Library fills);
  CHANNELS REQUIRED maths on the Audio page (bed + heights + LFE, min processor size);
  standards blurbs per section (config sectionBlurbs, ff-safe): SMPTE/CEDIA viewing
  angles, Dolby Atmos + RP22, 2700K Rako layering. Shared master v1.0.1 (4-line
  section blurbs). NOTE: the hallway-bar hero render needs uploading as a FILE
  (chat-pasted images not exportable) → seating-assets/aesthetic/ + design_renders.
- v0.7.0 (2026-07-19) — **Per-aspect grade medals + brand pages + dynamic Library options.**
  Grades are now PER ASPECT (cfg.av.grades {video,speakers,electronics} — silver
  projector + gold speakers is valid; legacy av.audio.grade migrates on open:
  speakers+electronics, wisdom→platinum electronics). Medal badge chips (config
  avGradeColours) in the app AND as PDF pills (top-right of Video/Audio sections
  + grade spec rows; P.rrect is border-only → pill = rect + dot end-caps).
  Conditional BRAND pages (MK Sound / Sonance / Wisdom Audio): brochure page w/
  typographic wordmark hero + story + fact rows, rendered ONLY when that system
  is selected (MK: any speaker/sub pick; Sonance: any electronics pick; Wisdom:
  speakers grade wisdom or any Wisdom pick). No logo assets in the catalogue yet
  — Library ask; a curated 'brand' row with img drops in as the hero later.
  Dynamic Library option groups (config optionGroups): rows with
  metadata.select_mode (one|multi|toggle) render as panels on the mapped step
  (screen/front_wall→Video, seating_option→Scheme, wall_treatment/acoustic_
  treatment/cabinetry→Materials, control→Lighting) into cfg.options; rows WITHOUT
  select_mode stay finish/swatch entries — slot menus filter on this (fixes
  opt-ceiling-* leaking into the Ceiling Finish swatches). led_zone /
  downlight_grade / sundry now PREFER Library rows (config lists = fallback;
  default ids remap by name on load). Legacy su-* vs new opt-* dupes dedupe by
  normalised name preferring opt-*. NEW: PDF safe-name pass (pdfSafe/deepSafe in
  aesthetic-app.js) — dictionary rewrites (coffer→cove, coffee→lounge,
  baffle→speaker wall…) + last-resort ff→'f f' over EVERY dynamic string, so
  Library names can never ship the broken Gilroy ff glyph. New DESIGN SCOPE PDF
  section (two-column option summary); design_spec now carries grades{} +
  options[] (av.grade kept as legacy alias = electronics). 1387 design_renders →
  3 images (concept board + hallway bar + renders, uploaded to
  seating-assets/aesthetic/). Ceiling treatments + 'Recessed Bulkhead' option.
- v0.7.1 (2026-07-19) — **Project palette + board redesign.** Palette DEVISED from
  the hallway bar concept (deep navy walls, ink cabinetry, brass, warm oak, stone
  worktop, charcoal floor — set editorially; raw pixel sampling skews brown under
  the tungsten glow). Stored per project: projects.metadata.design_palette
  {source, swatches:[{name,hex,note}]} via sonor_merge_project_metadata (1387
  seeded: Midnight Navy #242e3d · Ink Cabinet #1a2130 · Aged Brass #a8894f ·
  Warm Oak #8a6743 · Stone White #e8e2d6 · Charcoal #2e3138). App: ctx.palette →
  PROJECT PALETTE chips on Summary (.pal-* CSS). PDF: Materials & Finishes page
  REDESIGNED — named palette band (colour block + name + hex + source line)
  above the swatch tiles, painted tiles now take the palette LEAD colour with
  cream labels, tiles gain a note subline (one-line truncation), bottom hex
  strip replaced by a samples note. Navy catalogue hexes aligned to the concept
  (wf-midnight #242e3d, jo-navy-brass #1a2130, cp-navy #262c36). Fallback: no
  design_palette → previous layout (config-only projects unchanged).
- v0.7.2 (2026-07-19) — **Design-first section order** (Bryn: "design stuff should
  come first in the pdf, then technical"): Intro · Design concepts · Materials &
  finishes · Design scope · Lighting · LED · Star ceiling · Joinery & sundries ·
  THEN Video system · Audio system · brand pages · The detail. Intro right-hand
  spec column reordered to match (ceiling/seating/lighting before display/audio).
- v0.8.0 (2026-07-19) — **Landing project overview + THE chosen scheme.** The
  front page (internal builds, project selected) now shows a PROJECT OVERVIEW:
  every saved design board (aesthetic_configs) and seating config
  (seating_configs, READ-ONLY) for the active project, with summary info (room,
  seats, published-scheme state). One board is chosen as THE scheme ("Use as
  scheme") and one seating config paired ("Use with scheme") — flick freely;
  each pick loads that board and republishes. design_spec now carries
  scheme: {config_id, label, style, style_label, seating_config_id,
  seating_label, chosen_at} — the master design PDF (Cinema Designer) states
  "Based on design scheme: {label} ({style_label})". DATA-TRANSFER CHECK: our
  side VERIFIED live — Bryn's real board publish is in 1387's design_spec (MK
  in-walls + Yamaha RX-A6A, config af6be7fd…); CD/CT still have ZERO design_spec
  references — consumption remains their P1 ask (B-419o, scheme block added).
  New useScheme/useSeating/openFromOverview + _renderOverview harness hook;
  _savedLabel/_seatingSel state; overview refreshes on project change + save.
- v0.9.0 (2026-07-20) — **Bespoke Cinema Design Concept (Claude Design handoff).**
  Editable single-sheet A3 mood board integrated from the Claude Design session's
  handoff zip (module data/aesthetic-moodboard.js; reference DC + WIRING.md kept
  in design-reference/). Opened from the Summary step (internal-only, !CLIENT):
  prefills from pdfModel() (room, palette, slots, AV, lighting, scope), ADAPTIVE
  sections (auto-show per project feature + per-section Auto/Show/Hide overrides),
  11 drag/drop image slots (upload → seating-assets aesthetic/moodboard/<pid>/,
  data-URL fallback), every text line contenteditable, ref SNR-BC-yymmdd-XXXX,
  Export = A3 landscape print. Board state = aesthetic_configs.config.moodboard
  — per-project + versioned via standard saveConfig(); DRIFT FIX vs WIRING.md:
  'moodboard' added to the openSaved/useScheme restore whitelists (guide missed
  it — saved concepts would never reload). PERMANENT scoped storage policy
  seating_assets_moodboard_ins (INSERT anon+auth, bucket seating-assets, path
  aesthetic/moodboard/% — public bucket, internal app; flag to the security
  session if auth lands). Headless-verified: overlay renders, adaptive sections
  correct for the 1387-style config, prefill live. handoff zip → _to_delete/.
- v0.9.1 (2026-07-20) — **Used sections only + not-specified notes** (Bryn: "only
  render used sections... if there is no star ceiling, dont give it a section
  just put a note that it is not specified"). ONE derivation in pdfModel():
  m.notSpecified[] (star ceiling / curtains / tiered seating / wall lights /
  LED lighting — whatever the design does NOT have). Concept board: haystack is
  NAMES-only (a Curtain slot picked painted/none no longer summons the curtain
  section); new 'notes' adaptive section renders one compact editable strip —
  "Not in this specification: … available as design options on request."
  Proposal PDF: same list as a NOT IN THIS SPECIFICATION block at the foot of
  the Design Scope page (page renders for notes even with no option groups).
  Copy is ff-safe. Headless-verified: painted-curtain config → curtain section
  gone, note reads Curtains only.
- v0.10.0 (2026-07-20) — **Synced to the restructured Library (CONSUMER-API v2.9.x
  + cinema-gear-library skill 2026-07-20).** AV reads now hit the CANONICAL
  `av_catalogue` VIEW (deduped device+misc merge, one row per model_id) — never
  the base tables (CONSUMER-API §0). Uniform category taxonomy adopted:
  av_receiver / av_processor / power_amplifier / display (legacy receiver/
  amplifier/processor/tv still normalised client-side via AV_CAT_ALIAS — the
  view still carries both vocabularies); engine avByCategory accepts arrays
  (receiver picker = av_receiver + av_processor). AV_CACHE bumped →
  sonor_aesthetic_av_v2. Adopted Library enrichment: metadata.hero_image (per-
  line img), datasheet_url COLUMN, metadata.speaker_role → per-channel-group
  roles[] soft-filter on the speaker pickers (fronts/centre=lcr+in_wall+…,
  surrounds=surround+…, heights=in_ceiling+sst_ceiling+invisible; untagged
  devices stay, picks never drop — closes B-419j). Canonical make 'M&K Sound'
  everywhere (brand page name/wordmark, grade notes; detection regex already
  matched). Brand pages now draw the OFFICIAL brand marks from the Library's
  av-assets bucket (logos/mandk-sound|sonance|wisdom-audio.png) above the
  wordmark, type-only fallback kept — closes the v0.7.0 logo ask (B-419q for
  these three marques). Seed regen (123). CONSUMPTION MAP now: av_catalogue
  (AV products) · v_aesthetic_catalogue (design finishes/options) ·
  cinema_designs/seating_configs/projects.metadata (context) — writes ONLY
  aesthetic_configs + metadata design_spec/design_palette merges.
- v0.10.1 (2026-07-20) — **Alias-aware id resolution (CONSUMER-API §16).** The
  Library's M&K consolidation DELETED the verbose ids Bryn's live 1387 board
  holds (MK-IW950-IN-WALL-SPEAKE → MK-IW950 etc. — aliases verified in
  sonor_catalogue_aliases). Engine now loads the alias map with avLoad
  (cached); avItem() falls through old→new, new avResolveId(); design_spec
  publishes RESOLVED canonical model_ids. CROSS-APP CONSUMPTION AUDIT (Bryn:
  "all cinema design apps... new structures"): CD + CT read product data ONLY
  through the shared SonorLibrary layer (data/sonor-library.js master v3.7.0,
  identical vendored copies; CD built bundle v3.7.0) over v_sonor_library —
  the contract §23.1 explicitly keeps that path correct (device_catalogue =
  guaranteed superset for blocks). Seating reads no catalogue. This app =
  av_catalogue (canonical). sync-everything run 2026-07-20 (22 copies
  refreshed incl. regenerated sonor-blocks-seed.js) — all vendored masters
  current. No CD/CT code edits (their session owns them; nothing needed).
- v0.11.0 (2026-07-30) — **TRADES page (builder / joiner quote list).** New
  standalone dashboard/sonor-trades.html — the "brief hyperlink" pattern:
  project bar + ?project=<uuid> deep link, opens in its own tab from anywhere.
  Per-area works lists (Cinema / Gym / Hall seeded on 1387 from the concept
  images + CT build data — 30 lines; areas + items freely addable), columns
  Item / Detail / Trade (Builder·Joiner·Either·Specialist) / Sum £ / Notes,
  per-area subtotals + grand total, debounced autosave. ONE SOURCE: the whole
  doc lives in projects.metadata.trades written ONLY via
  sonor_merge_project_metadata. Two print modes: "Print for trades" (blank sum
  boxes + signature block — hand to the builder) and "Print priced" (internal).
  Links: landing overview note + Summary actions ("Trades list ↗"). Hosted:
  https://sonorltd.github.io/sonor-cinema-aesthetic/dashboard/sonor-trades.html?project=<id>
  ASKS logged: PM brief page + Master Hub + CD could link the same URL.
