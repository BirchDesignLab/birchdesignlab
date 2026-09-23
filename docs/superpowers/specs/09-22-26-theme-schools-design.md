# Theme schools: design spec

Date: 09-22-26. Branch: `docs/theme-schools-spec`.
Inputs: `theme-schools-research/HANDOFF-09-13-26.md` (founder decisions, binding), `tier1-merged-findings.json` (F001-F052), `tier2-verdicts.json`, `fonts-survey.json`.

**Status.** Founder said "just build it" on 09-22-26 and waived the section-by-section approval stops. This spec records the design as built. Every call that the handoff left open, and that I made so the build could proceed, is listed in §11 **Calls made in build** so the founder can override any of them after the fact. Founder decisions from the handoff are not restated as options.

**Changes since the 09-13 handoff.**
- **Zaraz stays** (founder, 09-22-26: "i might want to keep zaraz who knows"). Handoff decision #19 (drop GA4 + CMP) is on hold. The analytics-removal phase is out of the build order, and the portal must coexist with Zaraz (§5.7).
- Latest stable versions as of 09-22-26: astro 7.3.4, @astrojs/svelte 9.0.1, typescript 7.0.2, vitest 5.0.1, zod 4.6.5, fontaine 1.0.0 (new major since the handoff), wrangler 4.136.3. `npm audit`: 16 (1 critical, 9 high, 4 moderate, 2 low).
- Nothing on `main` changed since 09-06; the repo facts the 09-13 critique cited still hold.

---

## 1. Routes, portal entry and exit, SEO

- **Root stays root.** `/`, `/about/`, `/services/`, `/contact/`, `/contact/sent/` keep `BaseLayout`, no ClientRouter, no switcher, no new scripts beyond the lifecycle refactor of existing ones. Their bodies render from `src/themes/quiet/pages/*` (the quiet theme's components) and read copy from the `copy` collection. Guard: normalized visible text of those five built pages equals a fixture captured from the pre-change build (§6.2), and a pixel diff of reduced-motion renders is clean (§6.5).
- **Theme routes.** `/t/<theme>/`, `/t/<theme>/about/`, `/t/<theme>/services/`, `/t/<theme>/contact/`, `/t/<theme>/contact/sent/`. One route file per theme, `src/pages/t/<theme>/[...page].astro`, whose `getStaticPaths` returns those five and which imports only that theme's components (F016).
- **Quiet is a theme.** `/t/quiet/…` exists and renders the same quiet components inside `PortalLayout`. It is the portal's front door (BDL-010 points at it).
- **Entry.** BDL-010 catalog row, `href: /t/quiet/`. Lab to `/t/` is a full load. Inside `/t/`, navigation is client-side (ClientRouter).
- **Exit.** The switcher's "Leave" link goes to the matching root page with a full load. Every theme's Lab link goes to `/lab/` with `data-astro-reload`, dropping the theme. Privacy links likewise.
- **SEO.** `/t/` pages: `noindex, nofollow` via the existing `noindex` prop; self canonical (Seo.astro unchanged, F011); no JSON-LD (F041, guarded); OG card `lab-experiment` via the existing `ogImage` override; sitemap filter excludes pathnames that start with `/t/` (anchored, F051); `robots.txt` untouched (tests forbid Disallow).
- **Accepted edges.** `/404` is quiet everywhere. Trailing slashes as root. Theme choice is URL-only: no localStorage for the school, only for light/dark.

## 2. Theme package contract

```
src/themes/
  types.ts                 ThemeMeta, PageId, FontSpec, ContrastPair
  registry.ts              import.meta.glob('./*/meta.ts', { eager: true }); only meta files
  portal/
    PortalLayout.astro     head (HeadCommon noindex + ogImage), ClientRouter, switcher host, runtime
    runtime.ts             lifecycle, attribute re-stamp, font preload, scroll, focus, Zaraz bridge
    switcher.ts            <bdl-switcher> custom element, shadow DOM, own styles
    ContactHidden.astro    the hidden `return` input + honeypot, identical in every theme
    lifecycle.ts           onMount(fn) helper used by root AND portal scripts
  quiet/
    meta.ts  theme.css  Header.astro  Footer.astro  fx.ts?
    pages/Home.astro About.astro Services.astro Contact.astro Sent.astro
    assets/                (optional; ornament SVG etc.)
  <school>/ …same shape…
src/pages/t/<school>/[...page].astro
```

`meta.ts` (typed `ThemeMeta`, validated by a vitest):

| field | meaning |
|---|---|
| `id` | kebab id, equals directory name, `^[a-z][a-z0-9-]{0,31}$` |
| `name`, `era` | display name, one-line period ("Zurich, 1950s-60s") |
| `lesson` | one line: what the school teaches |
| `signature` | one sentence a non-designer names in five seconds (#13) |
| `forbids` | motifs a neighbour owns (#13; no lint) |
| `nativeScheme` | `light` or `dark`; first-visit scheme when the visitor has no stored choice is still the system/stored preference, this only orders the drawer and informs the dark-variant doctrine |
| `fonts` | `{ family, role, preload: url[] (max 2) }[]`; preload URLs come from `?url` imports so they are content-hashed |
| `contrast` | extra pairs beyond the required set (§6.3), e.g. text on a glass panel composited over the field |
| `assets` | optional `{ provenance: 'original-vector' | 'public-domain' | 'generated', note }` (F047) |
| `order` | drawer order |

Route files are a four-line template (import the theme's Header/Footer/pages + `PortalLayout`); a scaffold script `scripts/themes/new-theme.mjs` stamps a new school's directory and route.

The registry never imports components or CSS, so every theme page ships only its own stylesheet (guard §6.2). The registry is glob-based, so adding a school touches no shared file. That is what lets schools be built in parallel.

## 3. Copy collection

- **Loader:** `glob({ pattern: '*.yaml', base: './src/content/copy' })`, one file per page plus `chrome.yaml` (nav labels, footer lines). Data collection, not markdown (F027): the copy is structured (doors, steps, CTAs, form labels).
- **Schema:** a discriminated union on `page` (`home | about | services | contact | sent | chrome`), one strict object per page. Zod from `astro/zod` after the Astro 7 upgrade.
- **Emphasis:** a tiny allowlisted inline syntax, `*em*` and `**strong**`, rendered by `src/lib/copy.ts` `rich()` which HTML-escapes everything else. No raw HTML in YAML. Only fields typed `Rich` accept it (About's etymology paragraphs today).
- **SITE_DESCRIPTION (F049):** `home.yaml` has no opener subline. `getCopy('home')` injects `SITE_DESCRIPTION` from `src/lib/seo/site.ts`. A test asserts the rendered subline equals the constant.
- **Layout words stay in components:** the billboard's three spans, `aria-hidden` decoration, per-school ornament text.
- **"From the lab" block:** one shared helper `featuredSpecimens()` (single getCollection, sort, slice 2). Parity excludes it (F028) but the helper keeps every theme on the same two entries.
- **Page titles and meta descriptions** move into the page files too, so a theme title is `<page> · <School> · Birch Design Lab` built from the same source.

## 4. Portal runtime

**Attribute contract (#3, F003).** On `<html>`:

| attribute | owner | values |
|---|---|---|
| `data-theme` | the route (static in the HTML) | school id; absent on non-portal pages |
| `data-scheme` | the visitor (bootstrap + toggle), localStorage key `scheme` | `light` / `dark` |
| `data-zone` | the route (static) | `lab` on Lab pages (unchanged) |
| `class="js"`, `reveal-on` | scripts | unchanged meaning |

`data-face` is **removed** (§11 call C1). All CSS keys on `data-scheme`. BDL-002 and /styleguide inject their preview blocks keyed on `data-scheme`. The bootstrap reads `scheme`, falls back once to the legacy `theme` key, and writes `scheme`. MutationObservers watch `data-scheme`. The no-JS `prefers-color-scheme` block stays, keyed on `html:not(.js)`.

**Swap survival (F001).** `astro:before-swap` stamps `data-scheme`, `js` and `reveal-on` onto `event.newDocument.documentElement` before the router copies root attributes. The inline bootstrap is not relied on after the first load.

**Script lifecycle (F004).** `lifecycle.ts` `onMount(fn)`: runs `fn` once per rendered body (a WeakSet keyed on `document.body`), on the current document immediately and again on every `astro:page-load`; the returned teardown runs on `astro:before-swap` and on `pagehide` (non-persisted). Root pages have no router, so there it degrades to "run once, tear down on pagehide", exactly today's behaviour. BarkField, ThemeToggle and the reveal observer move onto it. Theme fx use it too (#6: no persistent stage; each theme's background is created on page-load and destroyed on before-swap).

**WebGL context loss (F013).** The bark renderer and every theme WebGL fx handle `webglcontextlost` (preventDefault, stop) and `webglcontextrestored` (rebuild), mirroring `src/experiments/bdl-007/stage.ts`, with the CSS field colour as the fallback.

**View transitions (F010).** Each theme's `theme.css` (global, never scoped) carries its own `::view-transition-*` rules for arriving at that theme, keyed on `html[data-theme='<id>']`. Named groups: `wordmark` (header wordmark) only; everything else is the root crossfade styled by the destination. `transition:name` values are unique per page (guarded). `ClientRouter fallback="none"`: browsers without view transitions get full loads (§11 C5).

**Fonts (F022).** Before navigating, the runtime injects `<link rel=preload as=font crossorigin>` for the destination theme's `meta.fonts[].preload` and waits on `document.fonts.load` with a 600 ms cap, by wrapping `event.loader` in `astro:before-preparation`. fontaine fallbacks move to per-family records so sans and mono schools get matching metrics.

**Scroll, history, focus (F023).** Link navigation between pages: top of page, focus to `#main`. Switching school on the same page: restore the same proportional scroll position with `behavior: 'instant'` in `astro:page-load`. Drawer picks push history; Randomize uses `history: 'replace'`. `scroll-behavior: smooth` is disabled during restores.

**Switcher (F039, F040).** `<bdl-switcher transition:persist="switcher">`, a vanilla custom element with a shadow root and its own stylesheet, so no head swap or scoped class can orphan its styles. Contents: current school, Randomize, a `<dialog>` drawer listing every school (name, era, signature), light/dark toggle, "About these schools" (BDL-011), "Leave" (root page, full load). Focus stays inside the persisted subtree across swaps. Registry data reaches it as a JSON script tag rendered by `PortalLayout` (same bytes on every theme page).

**Zaraz (F012, F032), new since the handoff.** Zaraz keeps injecting at the edge. The runtime calls `zaraz.spaPageview()` on `astro:page-load` for client-side navigations only (never the first load, which the edge already counts). Founder: keep Zaraz's own "Single Page Application support" toggle **off**, or pageviews double. Nothing Zaraz-owned is persisted. The consent modal's survival across a swap cannot be checked off the production zone; it is a post-deploy check (§10).

**Prefetch.** `prefetch: false` stays global so root pages ship nothing new. Portal links get no prefetch in v1.

## 5. Contact under themes

- Every theme's contact page renders its own form markup with the fixed contract: `method=post action=/api/contact`, fields `name`, `email`, `message`, honeypot `company`, hidden `return=<theme id>` (via `ContactHidden`), and `data-astro-reload` on the form so submit is a real browser navigation (F006). The root form gains nothing (no `return` means root).
- Worker: `return` must match `^[a-z][a-z0-9-]{0,31}$`; the Worker then confirms `/t/<id>/contact/sent/` exists in the assets binding before redirecting there, else falls back to `/contact/sent/`. No raw echo into `Location`, no hardcoded list to drift from the registry (§11 C6). Error pages keep today's self-contained HTML; their "Back to the form" link targets `/t/<id>/contact/` for a valid theme.
- `tests/contact-worker.test.ts` grows: valid theme, unknown-but-well-formed theme (falls back), malformed return (falls back), honeypot with return, error back-link per theme.

## 6. Guards

All vitest. No CI, no Lighthouse CI, no Playwright in the gate (#17).

1. **Split test runs.** `npm run test` (unit, pre-build) and `npm run test:dist` (reads `dist/`, separate vitest config). `verify` becomes `test && check && build && test:dist`.
2. **Dist tests.**
   - Root copy parity: normalized visible text of the five root pages equals `tests/fixtures/root-copy/*.txt` captured from the pre-change build.
   - Root isolation: no root page carries the ClientRouter meta, the switcher, or any `/t/` stylesheet.
   - Theme copy parity: for each theme page, the multiset of normalized text blocks equals `/t/quiet/`'s, excluding `aria-hidden` subtrees, `[data-parity-skip]` (the bark credit, the "From the lab" block), and the switcher (shadow DOM, not in HTML). Link targets compare the same way after mapping `/t/<id>/x/` to `/x/`.
   - Stylesheet isolation (F016): each `/t/<id>/` page links only stylesheets that no other theme's pages link, except the shared ones every portal page links.
   - SEO: every `/t/` page has `noindex`, a self canonical, no `application/ld+json`, the `lab-experiment` OG image; sitemap has no `/t/`.
   - Contact contract on every theme contact page (§5).
   - No em dash (U+2014) in any built HTML under `/t/` or the Lab pages this work adds.
   - Unique `transition:name` per page.
3. **Contrast checker** (`scripts/themes/check-contrast.mjs` + a vitest wrapper, #16): parses each theme's `theme.css` (and quiet's `tokens.css`), resolves `var()` chains per `[data-scheme]` block, resolves hex / rgb / hsl / oklch / `color-mix()`, alpha-composites stacked backgrounds, and asserts the required pairs plus each theme's `meta.contrast` extras. Required text pairs at 4.5:1: mark/field, mark-muted/field, mark/field-raised, link/field, on-accent/accent, accent/field (accent is used for kickers). Reuses `src/lib/color.ts` and `src/lib/oklch.ts`.
4. **Meta validation:** every theme has all `ThemeMeta` fields, fonts resolve, route file exists, id matches directory.
5. **Verification scripts, on demand, not gates** (`scripts/themes/`): `capture.mjs` renders every page × theme × scheme × two viewports on the GPU (`BDL_GPU=1` flags, renderer string checked), reduced motion for determinism; `smoke.mjs` drives the portal client-side (switch schools, toggle scheme, navigate pages) and asserts attributes survive, fx mount/unmount counts stay flat, zero console errors; `diff-root.mjs` pixel-diffs root pages before/after. These use the `playwright` package already in devDependencies. They exist to prove the build, not to gate merges (§11 C9).
6. **Lighthouse:** one manual baseline of the four root pages before PR 0 lands, recorded in the PR body.

## 7. Schools: first tranche

Six plus quiet. Build order: Vaporwave (proves fx + dark-native), then Grandmillennial (light-native, ornament-heavy), Glassmorphism, Cottagecore, Bauhaus, Swiss last (#12).

| School | Signature | Native | Dark-variant doctrine (F045) | Type (heading / body / accent) | Background |
|---|---|---|---|---|---|
| Vaporwave | Sunset gradient, neon grid horizon and marble statuary, like a 1995 screensaver dreaming of the 80s | dark | Native. Light = pastel dawn (peach to lavender field, deep purple ink, neon demoted to blocks) | Libre Caslon Display (swapped from Bodoni Moda, #15) / Exo 2 / Dela Gothic One; VT323 mono | WebGL grid horizon + sun + scanlines |
| Grandmillennial | Chintz, scallops and gilt: your grandmother's parlour, made fresh | light | Lacquered room: hunter-green or oxblood field, gold rule, cream ink | Playfair Display / Cormorant Garamond / Pinyon Script | Static SVG chinoiserie + scallop borders (original vector) |
| Glassmorphism | Frosted panels floating over soft blurred colour: a 2021 app screenshot | light | Deep navy field, luminous blobs, smoked panels | Plus Jakarta Sans / Inter / Space Grotesk | Animated blurred colour fields (canvas 2D) |
| Cottagecore | Pressed flowers, gingham and handwriting: a cottage table in June | light | Lamplight: ink-brown/forest ground, cream ink, amber glow (no inverted gingham) | Fraunces / Lora / Caveat | Original SVG sprigs; drifting motes in dark |
| Bauhaus | Circles, squares and triangles in red, yellow, blue: a Dessau poster | light | Primaries are poster blocks only, never text; white on near-black | League Spartan / Jost / Unbounded | SVG geometric composition, assembled on load |
| Swiss | Big flush-left grotesk, strict grid, one red: a Zurich poster | light | Straight negative print | Archivo / Public Sans / IBM Plex Mono (Literata dropped: one grotesk family) | None; visible grid |

Forbids (distinctness, #13): Vaporwave forbids gold, script faces, frosted glass. Grandmillennial forbids neon, glass, primaries, visible grids. Glassmorphism forbids serifs, ornament, hard black rules, grain. Cottagecore forbids neon, chrome, primaries, glass. Bauhaus forbids pastel, pattern fills, squiggles, brown, texture, serifs. Swiss forbids ornament, gradients, rounded corners, more than one accent, serifs.

Wordmark in each school's own type (#7); the locked mark appears only where a school's field matches an approved background, otherwise omitted. Latin subsets only (#14).

## 8. Lab framing

- **BDL-010** (experiment, `device: universal`, `href: /t/quiet/`): the portal. Catalog row links straight into it. `howto` still written for the wall label vocabulary even though href rows do not render one.
- **BDL-011** (study): the school writeups. Schema tweak (#5): `client` becomes optional with a `selfStudy: true` flag required when it is absent (superRefine), so a self-study cannot silently drop the field. `liveUrl` points at `https://birchdesignlab.com/t/quiet/`. The page renders a school index (card per school, deep link to `/t/<id>/`) from a new `src/studies/registry.ts` slot, mirroring `experimentComponents`.
- Voice: studio "we", no engineer-learning framing (#22), no em dashes, human register. Drafted in build; founder voice pass expected (§10).
- Lab pages are untouched by themes (#7). The pre-existing `/lab/[slug]` all-CSS bug (F016 twin) goes to the backlog, out of scope.

## 9. Build order

1. **Deps** (each its own branch, stacked; each passes `npm run verify` plus a browser pass):
   a. `npm audit fix` (never `--force`) + all in-range minors and patches (wrangler, @fontsource, svelte, playwright, tsx, @napi-rs/canvas, sitemap, check).
   b. astro 7.3.x + @astrojs/svelte 9 together. If Astro 7's content layer forces zod 4 for `image()` schemas, zod 4 lands here and the change is recorded.
   c. typescript 7, vitest 5, zod 4 (if not already), fontaine 1.0, three 0.186 with @types/three: one at a time. A major whose integration is not ready (the known risk: TypeScript 7 against `@astrojs/check`) stays on the newest compatible version with the reason written in `docs/lab-backlog.md`, per the deps policy.
2. ~~Analytics removal~~ on hold (Zaraz stays).
3. **PR 0** (one branch, large PR is fine #21): root fixtures captured first; attribute migration; lifecycle refactor; copy collection + quiet extraction; portal layout, runtime, switcher; `/t/quiet/`; Worker return path; guards; contrast checker; scaffold script; BDL-010 as `forthcoming`.
4. **Tranche 1**: Vaporwave first (sets the patterns), then the other five in parallel; BDL-010 and BDL-011 go live with them.
5. Verification: `npm run verify`, capture + smoke + root pixel diff, adversarial review of the whole diff, fixes. Then ask the founder before pushing.

## 10. Founder items (cannot be done from the repo)

- Push and PRs: ask before pushing. Merge to `main` deploys.
- Zaraz: keep "Single Page Application support" off; after deploy, check `/t/` swaps for a double consent modal and for pageviews on client navigation.
- Real-device pass of the portal (phone + desktop), especially the WebGL fx.
- Voice pass on BDL-010/011 copy.
- Lighthouse baseline numbers are recorded, not enforced.

## 11. Calls made in build (override any)

- **C1 `data-face` removed**, not kept as a third attribute. Since 08-18 it only mirrors the scheme; BDL-002/styleguide override tokens by injecting a later stylesheet, which does not need a separate attribute.
- **C2 Copy emphasis** via `*em*` / `**strong**` in YAML rather than markdown files or `set:html`.
- **C3 URL-only school**, no sticky school across sessions; light/dark stays sticky as today.
- **C4 Switcher is a vanilla custom element** in shadow DOM, not a Svelte island (avoids F039 persist-props and F040 orphaned scoped classes, keeps Svelte off portal pages that do not need it).
- **C5 `fallback="none"`**: no animated fallback for browsers without view transitions; they get full loads.
- **C6 Worker allowlist by pattern + asset existence**, not a hardcoded list.
- **C7 BDL-010 entry is `/t/quiet/`** with the switcher visible, no separate hall page (#4 said decide once schools are toggleable; this is the simplest form, revisit freely).
- **C8 Vaporwave heading = Libre Caslon Display** (the handoff's candidate swap). Swiss drops Literata to stay one grotesk family.
- **C9 Playwright-based capture/smoke scripts** exist under `scripts/themes/` as on-demand verification only. Decision #17 bans Playwright as a gate; these are not gates.
- **C10 BDL-011 schema** uses `selfStudy: true` rather than a sentinel `client` string.
- **C11 Theme page titles** follow `<Page> · <School> · Birch Design Lab`.
