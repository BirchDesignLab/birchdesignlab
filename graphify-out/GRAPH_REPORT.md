# Graph Report - .  (2026-07-20)

## Corpus Check
- 105 files · ~61,863 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 371 nodes · 626 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.78)
- Token cost: 0 input · 261,197 output

## Community Hubs (Navigation)
- Bark Rendering & OG Images
- Page Fonts & Style Imports
- Site Design Rationale & Deploy
- Weave Draft Engine
- OG Image Generation Pipeline
- BDL-003 Novgorod Letters
- Astro & Font Dependencies
- Dev Tooling & Package Config
- Loom Presets & Yarn Data
- SVG Stroke Tracing Script
- BDL-004 Loom Experiment UI
- Novgorod Letter Content & Schema
- Lab Content Schema & Architecture
- BDL-001 Bark Engine Interaction
- TypeScript Config
- Color Utilities
- Favicon Mark

## God Nodes (most connected - your core abstractions)
1. `./DigCanvas.svelte` - 19 edges
2. `../layouts/BaseLayout.astro` - 17 edges
3. `drawBarkDashes()` - 16 edges
4. `BarkRenderer` - 13 edges
5. `../components/BarkField.astro` - 12 edges
6. `./BarkEngine.svelte` - 10 edges
7. `Ctx2DLike` - 10 edges
8. `generateBark()` - 10 edges
9. `scripts` - 9 edges
10. `../../layouts/ExperimentLayout.astro` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Bark-Generated OG Images Implementation Plan` --references--> `renderOgCard()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-16-bark-og-images.md → scripts/og/render.ts
- `OG card seed derivation matches the site's date-seed strategy, so the card is the tree of the deploy` --rationale_for--> `renderOgCard()`  [EXTRACTED]
  docs/superpowers/specs/2026-07-16-bark-og-images-design.md → scripts/og/render.ts
- `BarkField lockAspect prop fixes lenticel streaking on non-square canvases` --rationale_for--> `../components/BarkField.astro`  [EXTRACTED]
  docs/design-handoff-07-18-26.md → src/components/BarkField.astro
- `Birch Design Lab Website (Core + Lab Framework + BDL-001) Implementation Plan` --references--> `../components/BarkField.astro`  [EXTRACTED]
  docs/superpowers/plans/2026-07-15-website-core.md → src/components/BarkField.astro
- `Two-layer scratch reveal: strokes uncovered first, then translation blooms in place (meet the artifact before the meaning)` --rationale_for--> `./DigCanvas.svelte`  [EXTRACTED]
  docs/superpowers/specs/2026-07-16-bdl-003-novgorod-letters-design.md → src/experiments/bdl-003/DigCanvas.svelte

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Lab experiments share house architecture: lib/ pure math + experiments/ component + content/lab entry** — src_content_lab_bdl_001, src_content_lab_bdl_002, src_content_lab_bdl_003, src_content_lab_bdl_004 [EXTRACTED 1.00]
- **Site-wide daily-seed determinism: bark tree, OG card, and the loom's daily warp all derive from hashString(date)** — docs_handoff_2026_07_16_seed_by_date, docs_superpowers_specs_2026_07_16_bark_og_images_design_daily_seed, docs_superpowers_specs_2026_07_16_bdl_004_the_loom_design_draft_engine [INFERRED 0.85]
- **Wall-label house rule for experiment-page floating chrome, established across handoff, spec, and plan** — docs_handoff_2026_07_16, docs_superpowers_specs_2026_07_16_wall_labels_design_house_rule_chrome, docs_superpowers_plans_2026_07_16_wall_labels [EXTRACTED 1.00]

## Communities (20 total, 1 thin omitted)

### Community 0 - "Bark Rendering & OG Images"
Cohesion: 0.09
Nodes (15): Bark-Generated OG Images Implementation Plan, Marcellus Font SIL Open Font License, Ctx2DLike, drawBarkDashes(), parseColor(), Dash, BarkRenderer, compile() (+7 more)

### Community 1 - "Page Fonts & Style Imports"
Cohesion: 0.07
Nodes (20): ../lib/bark, ../lib/color, ../lib/og/manifest, ../styles/base.css, ../styles/tokens.css, ../components/BarkField.astro, barkAlphas, reducedMotion (+12 more)

### Community 2 - "Site Design Rationale & Deploy"
Cohesion: 0.07
Nodes (36): ../../experiments/registry, Deploying birchdesignlab.com (Deploy Guide), Node 22.16.0 pin via .nvmrc for deterministic Cloudflare builds, Handoff 2026-07-18: Design-System Port Complete & Deployed, --gf-link-hover token resolves loud-link hover collision across dark/light faces, BarkField lockAspect prop fixes lenticel streaking on non-square canvases, Marcellus ships weight 400 only; headings dropped to 400 to avoid faux-bold, Rewritten reveal plumbing: .reveal-on/.is-settled gated IntersectionObserver (+28 more)

### Community 3 - "Weave Draft Engine"
Cohesion: 0.13
Nodes (22): Draft, gcd(), isWarpOver(), lcm(), shaftAt(), treadleAt(), renderTile(), tileSizePx() (+14 more)

### Community 4 - "OG Image Generation Pipeline"
Cohesion: 0.14
Nodes (19): Birch Design Lab Website (Core + Lab Framework + BDL-001) Implementation Plan, outDir, seed, drawTracked(), renderOgCard(), BarkOptions, clamp01(), DEFAULTS (+11 more)

### Community 5 - "BDL-003 Novgorod Letters"
Cohesion: 0.11
Nodes (23): ./letters, ../../lib/scratch/coverage, ../../lib/scratch/letter-schema, BDL-003 Novgorod Letters Implementation Plan, BDL-003 · Novgorod Letters · Design, Hand-traced letterforms from published gramota drawings, because a font cannot fake a seven-year-old's hand, Two-layer scratch reveal: strokes uncovered first, then translation blooms in place (meet the artifact before the meaning), BDL-003 Novgorod Letters (Lab Content Entry) (+15 more)

### Community 6 - "Astro & Font Dependencies"
Cohesion: 0.07
Nodes (27): astro, @astrojs/sitemap, @astrojs/svelte, @fontsource/cormorant-sc, @fontsource/marcellus, @fontsource/spectral, @fontsource-variable/cormorant, @fontsource-variable/eb-garamond (+19 more)

### Community 7 - "Dev Tooling & Package Config"
Cohesion: 0.07
Nodes (26): @astrojs/check, @napi-rs/canvas, devDependencies, @astrojs/check, @napi-rs/canvas, tsx, typescript, vitest (+18 more)

### Community 8 - "Loom Presets & Yarn Data"
Cohesion: 0.20
Nodes (13): noLift, PRESETS, byId, DAILY_WARPS, yarnHex(), YARNS, draftSchema, Preset (+5 more)

### Community 9 - "SVG Stroke Tracing Script"
Cohesion: 0.25
Nodes (13): absolutizeAndTransform(), apply(), attrValue(), extractStrokes(), fmt(), formatLetterBlock(), IDENT, isTranslateOnly() (+5 more)

### Community 10 - "BDL-004 Loom Experiment UI"
Cohesion: 0.18
Nodes (11): ./data/presets, ./data/yarns, ../../lib/bark/pattern, ../../lib/weave/daily, ../../lib/weave/draft, ../../lib/weave/export, ../../lib/weave/render2d, ../../lib/weave/stripes (+3 more)

### Community 11 - "Novgorod Letter Content & Schema"
Cohesion: 0.30
Nodes (7): householdList, letters, loveLetter, onfim, LetterData, letterSchema, valid

### Community 12 - "Lab Content Schema & Architecture"
Cohesion: 0.20
Nodes (9): Birch Design Lab — Lab Architecture Handoff, Accession numbering: globally sequential, immutable specimen numbers, Lab as one typed content collection (experiment/study) rather than two collections, Lab toggle filters already-rendered DOM rather than fetching, to keep every specimen link in the static HTML for SEO, collections, lab, LabEntryData, labSchema (+1 more)

### Community 13 - "BDL-001 Bark Engine Interaction"
Cohesion: 0.24
Nodes (5): ./BarkEngine.svelte, barkAlphas, lastPointer, randomSeed(), rebuild()

### Community 14 - "TypeScript Config"
Cohesion: 0.22
Nodes (8): astro/tsconfigs/strict, .astro/types.d.ts, dist, src/**/*, tests/**/*, exclude, extends, include

### Community 15 - "Color Utilities"
Cohesion: 0.80
Nodes (3): contrast(), luminance(), rgbToHex()

## Ambiguous Edges - Review These
- `Lab Backlog` → `BDL-003 · Novgorod Letters · Design`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-16-bdl-003-novgorod-letters-design.md · relation: references

## Knowledge Gaps
- **82 isolated node(s):** `name`, `type`, `version`, `private`, `node` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Lab Backlog` and `BDL-003 · Novgorod Letters · Design`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `./DigCanvas.svelte` connect `BDL-003 Novgorod Letters` to `Bark Rendering & OG Images`, `Page Fonts & Style Imports`, `OG Image Generation Pipeline`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `generateBark()` connect `OG Image Generation Pipeline` to `Page Fonts & Style Imports`, `BDL-003 Novgorod Letters`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `../components/BarkField.astro` connect `Page Fonts & Style Imports` to `Bark Rendering & OG Images`, `Site Design Rationale & Deploy`, `OG Image Generation Pipeline`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bark Rendering & OG Images` be split into smaller, more focused modules?**
  _Cohesion score 0.08826945412311266 - nodes in this community are weakly interconnected._
- **Should `Page Fonts & Style Imports` be split into smaller, more focused modules?**
  _Cohesion score 0.06829268292682927 - nodes in this community are weakly interconnected._