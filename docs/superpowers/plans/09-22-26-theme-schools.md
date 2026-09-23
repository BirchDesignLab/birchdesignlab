# Theme schools implementation plan

> **For agentic workers:** execute task by task. Steps use checkbox (`- [ ]`) syntax. Interfaces blocks are binding: parallel tasks rely on the exact names.

**Goal:** the business pages rendered in six design schools (plus quiet) behind a Lab-entered portal at `/t/<school>/`, with root pages unchanged, contact working in every school, and dist-reading guards.

**Architecture:** glob-based theme registry of `meta.ts` files; one route file per school importing only its own components and CSS; a shared `PortalLayout` with ClientRouter, a shadow-DOM switcher and a lifecycle runtime; copy in a YAML data collection shared by every school.

**Tech stack:** Astro 7 (static) on Cloudflare Workers Static Assets, TypeScript, vitest, vanilla custom elements, WebGL2/canvas for school backgrounds, @fontsource.

**Spec:** `docs/superpowers/specs/09-22-26-theme-schools-design.md` (read it first; §11 lists calls made in build).

## Global constraints

- Deps policy: newest stable, no `npm audit fix --force`, each major its own branch/PR.
- Root pages (`/`, `/about/`, `/services/`, `/contact/`, `/contact/sent/`): visible text identical to fixtures; no ClientRouter; pixel-identical under reduced motion.
- External copy: no U+2014 em dash, studio "we", no personal name, no "engineer learning design" framing.
- Title separator: middot.
- `/t/` pages: `noindex, nofollow`, self canonical, no JSON-LD, OG `lab-experiment`, not in sitemap.
- Scripts live in `scripts/` (committed). No temp-dir scripts.
- Headless rendering uses the GPU (`BDL_GPU=1` flags); check the renderer string.
- Latin font subsets only.
- Never push without founder approval.
- Workflow agents: Sonnet minimum for anything that can touch the repo; prompts must say git is the orchestrator's job.

---

## Phase A: dependencies (stacked branches off `docs/theme-schools-spec`)

Each task: branch, change, `npm run verify` clean, root + Lab browser pass with `scripts/themes/capture.mjs` (or the in-app browser for structure), commit. A major that cannot land (integration not ready) is reverted and recorded in `docs/lab-backlog.md` with the reason.

### Task A1: audit fix and in-range updates
**Branch:** `chore/deps-minors`
- [ ] `npm audit fix` (no `--force`); `npm update`; bump declared ranges for @astrojs/sitemap, @astrojs/check, svelte, @fontsource*, wrangler, playwright, tsx, @napi-rs/canvas to current.
- [ ] `npm audit` report saved into the commit message: which advisories remain and why (reachability triage).
- [ ] `npm run verify`; browser pass of `/`, `/about/`, `/services/`, `/contact/`, `/lab/`, `/lab/bdl-001/`, `/lab/bdl-007/`.
- [ ] Commit.

### Task A2: Astro 7 + @astrojs/svelte 9
**Branch:** `chore/astro-7`
- [ ] Read Astro 6 and 7 upgrade guides (docs.astro.build) for: content layer, `astro:content` zod, `image()` schema helper, ClientRouter, `Astro.site`, integrations API, Vite version, `astro check`.
- [ ] `npm i astro@^7.3 @astrojs/svelte@^9 @astrojs/sitemap@latest @astrojs/check@latest`.
- [ ] Fix build/type errors. If `image()` requires zod 4, land zod 4 here: `lab-schema.ts` imports `z` from `astro/zod`, `z.ZodIssueCode.custom` becomes `'custom'`, `.url()` stays or becomes `z.url()`.
- [ ] Verify the draco plugin still drops decoders (build log line), OG generation, fontaine transform.
- [ ] `npm run verify`; browser pass incl. every Svelte experiment (BDL-001, 003, 006) and `/hello`.
- [ ] Commit.

### Task A3-A6: one major each
Branches stacked: `chore/typescript-7`, `chore/vitest-5`, `chore/zod-4` (skip if landed in A2), `chore/fontaine-1`, `chore/three-0.186`.
- [ ] Install, fix, `npm run verify`, commit. TypeScript 7: confirm `astro check` actually type-checks (plant a deliberate type error, see it fail, remove it). If `@astrojs/check` cannot run on TS 7, stay on TS 5.9.x and record it.
- [ ] fontaine 1.0: keep generated fallback names identical (`Marcellus fallback`, `Spectral fallback`); confirm in built CSS.
- [ ] three 0.186: BDL-007 renders (GPU capture), glb loads, no console errors.

---

## Phase B: PR 0, the portal (branch `feat/theme-portal`)

### Task B1: dist test harness and root fixtures
**Files:** Create `vitest.dist.config.ts`, `tests/dist/helpers.ts`, `tests/dist/root-copy.test.ts`, `tests/fixtures/root-copy/{home,about,services,contact,sent}.txt`, `scripts/themes/capture-root-copy.mjs`. Modify `vitest.config.ts` (exclude `tests/dist/**`), `package.json` scripts.

**Interfaces (produces):**
```ts
// tests/dist/helpers.ts
export const DIST: string;                                  // absolute path to dist/
export function readPage(route: string): string;            // '/about/' -> dist/about/index.html contents; throws if missing
export function listRoutes(prefix?: string): string[];      // every route with an index.html, e.g. '/t/quiet/about/'
export function visibleText(html: string, opts?: { skip?: string[] }): string[]; // normalized text blocks, strips script/style/template, aria-hidden subtrees, [data-parity-skip], and any `skip` selectors
export function stylesheetHrefs(html: string): string[];
export function links(html: string): string[];              // hrefs of <a>, in order
```
- [ ] Add devDependency `node-html-parser`.
- [ ] `package.json`: `"test:dist": "vitest run --config vitest.dist.config.ts"`, `"verify": "npm run test && npm run check && npm run build && npm run test:dist"`.
- [ ] On the pre-change build, run `node scripts/themes/capture-root-copy.mjs` to write fixtures (one block per line).
- [ ] `root-copy.test.ts`: for each of the five routes, `visibleText(readPage(route)).join('\n') === fixture`.
- [ ] Run `npm run build && npm run test:dist`: PASS. Commit fixtures + harness.

### Task B2: attribute contract migration
**Files:** Modify `src/components/ThemeBootstrap.astro`, `src/components/ThemeToggle.astro`, `src/styles/tokens.css`, `src/components/BarkField.astro`, `src/experiments/bdl-001/BarkEngine.svelte`, `src/experiments/bdl-002/Experiment.astro`, `src/experiments/bdl-003/DigCanvas.svelte`, `src/experiments/bdl-006/Regulator.svelte`, `src/pages/styleguide.astro`. Create `src/lib/scheme.ts`, `tests/scheme.test.ts`, `tests/dist/attributes.test.ts`.

**Interfaces (produces):**
```ts
// src/lib/scheme.ts
export type Scheme = 'light' | 'dark';
export const SCHEME_KEY = 'scheme';
export const LEGACY_SCHEME_KEY = 'theme';
export function readStoredScheme(storage: Pick<Storage, 'getItem'> | null): Scheme | null; // scheme key, then legacy key; ignores junk
export function currentScheme(): Scheme;                     // from <html data-scheme>, default 'dark'
export function setScheme(next: Scheme): void;               // sets data-scheme, persists to SCHEME_KEY, removes legacy key
```
- [ ] Tests: `readStoredScheme` prefers `scheme`, falls back to legacy `theme`, rejects other values, tolerates null storage.
- [ ] Bootstrap: `data-scheme` from stored or system; migrates legacy key; no `data-face`, no `data-theme`.
- [ ] CSS: `:root, :root[data-scheme='dark']` / `:root[data-scheme='light']`; comments updated.
- [ ] All observers: `attributeFilter: ['data-scheme']`. BDL-002/styleguide templates emit `data-scheme` selectors and call `setScheme`.
- [ ] `attributes.test.ts`: no built HTML or CSS contains `data-face`; tokens CSS contains `[data-scheme=light]` (minified form).
- [ ] `npm run verify` (root copy parity must still pass). Commit.

### Task B3: lifecycle helper, script refactor, context loss
**Files:** Create `src/lib/lifecycle.ts`, `tests/lifecycle.test.ts`. Modify `src/components/BarkField.astro`, `src/components/ThemeToggle.astro`, `src/layouts/BaseLayout.astro` (reveal script), `src/lib/bark/renderer.ts`.

**Interfaces (produces):**
```ts
// src/lib/lifecycle.ts
export type Teardown = () => void;
export function onMount(fn: () => void | Teardown, env?: LifecycleEnv): void;
// Runs fn for the current body now (once per body element), and on every
// 'astro:page-load'. Teardown runs on 'astro:before-swap' and on pagehide
// (not persisted). env is for tests: { doc: Document-like, win: EventTarget-like }.
```
- [ ] Tests with fake doc/win: runs once on first call; page-load for the same body does not re-run; new body re-runs; before-swap runs teardown once; pagehide persisted does not tear down.
- [ ] BarkField: per-canvas init inside `onMount`, returns teardown; handles `webglcontextlost` (preventDefault, stop, paint nothing) and `webglcontextrestored` (recreate renderer).
- [ ] Renderer: expose what BarkField needs to rebuild (re-create via `createBarkRenderer`).
- [ ] ThemeToggle and reveal on `onMount`.
- [ ] `npm run verify`. Commit.

### Task B4: copy collection
**Files:** Create `src/lib/copy-schema.ts`, `src/lib/copy.ts`, `src/content/copy/{chrome,home,about,services,contact,sent}.yaml`, `tests/copy-schema.test.ts`, `tests/copy-rich.test.ts`. Modify `src/content.config.ts`.

**Interfaces (produces):**
```ts
// src/lib/copy.ts
export type CopyPage = 'chrome' | 'home' | 'about' | 'services' | 'contact' | 'sent';
export function rich(s: string): string;          // escape &<>"' then *x* -> <em>x</em>, **x** -> <strong>x</strong>
export async function getCopy<P extends CopyPage>(page: P): Promise<CopyData<P>>; // home gains opener.subline = SITE_DESCRIPTION
export async function featuredSpecimens(): Promise<CollectionEntry<'lab'>[]>;       // live, !noindex, designation desc, 2
```
Page schema shape (per page, strict): `title` (document title), `description`, and page sections mirroring today's markup (home: `opener.lead`, `doors.kicker`, `doors.items[{title, body}]`, `doors.more`, `lab.kicker`, `lab.pull`, `lab.more`, `closer.lead`, `closer.cta`; about: `hero`, `etymology: Rich[]`, `founder.heading`, `founder.body[]`, `manifesto`, `cta`; services: `kicker`, `heading`, `sublines[]`, `services[{heading, body[]}]`, `process.heading`, `process.steps[{title, body}]`, `pull`, `cta`; contact: `kicker`, `heading`, `subline`, `labels{name,email,message,honeypot}`, `submit`, `trust`, `invite`, `email`, `fine`; sent: `heading`, `body`, `back`; chrome: `nav[{page, label}]`, `lab`, `wordmark[]`, `footerName`, `location`, `privacy`, `skip`, `barkCredit`).
- [ ] Tests: `rich` escapes and converts; schema rejects unknown keys; YAML files parse; home copy has no subline field.
- [ ] Text in YAML is byte-for-byte today's copy (whitespace-normalized).
- [ ] Commit.

### Task B5: theme types, registry, quiet extraction
**Files:** Create `src/themes/types.ts`, `src/themes/registry.ts`, `src/themes/quiet/meta.ts`, `src/themes/quiet/Header.astro`, `src/themes/quiet/Footer.astro`, `src/themes/quiet/pages/{Home,About,Services,Contact,Sent}.astro`, `tests/theme-registry.test.ts`. Modify `src/pages/{index,about,services,contact}.astro`, `src/pages/contact/sent.astro`, `src/layouts/BaseLayout.astro` (header/footer from quiet), delete `src/components/SiteHeader.astro`/`SiteFooter.astro` only if nothing else imports them.

**Interfaces (produces):**
```ts
// src/themes/types.ts
export type PageId = 'home' | 'about' | 'services' | 'contact' | 'sent';
export const PAGE_IDS: readonly PageId[];
export type Scheme = 'light' | 'dark';
export interface FontSpec { family: string; role: 'heading' | 'body' | 'accent' | 'mono' | 'wordmark'; preload?: string[] }
export interface ContrastPair { fg: string; bg: string[]; min: number; note?: string } // bg listed top to bottom, composited
export interface ThemeMeta {
  id: string; name: string; era: string; lesson: string; signature: string; forbids: string[];
  nativeScheme: Scheme; fonts: FontSpec[]; contrast?: ContrastPair[];
  assets?: { provenance: 'original-vector' | 'public-domain' | 'generated'; note: string };
  order: number;
}
// src/themes/registry.ts
export const THEMES: readonly ThemeMeta[];                 // sorted by order
export function getTheme(id: string): ThemeMeta | undefined;
export function pagePath(page: PageId, theme?: string): string;  // ('about') -> '/about/'; ('about','x') -> '/t/x/about/'; ('sent','x') -> '/t/x/contact/sent/'; ('home') -> '/'
export function pageFromPath(pathname: string): { theme?: string; page: PageId } | null;
export function staticPathsFor(): { params: { page: string | undefined }; props: { page: PageId } }[];
```
Page component props (every school, every page): `{ copy: CopyData<page>; chrome: CopyData<'chrome'>; theme?: string }` where `theme` is undefined on root. Header/Footer props: `{ chrome; theme?: string; page: PageId }`.
- [ ] Registry tests: ids match directories, unique, pagePath/pageFromPath round-trip for every theme × page, meta fields present, `signature` one sentence, `forbids` non-empty.
- [ ] Root pages become wrappers: `<BaseLayout title description><Home copy chrome /></BaseLayout>` with page-specific head slots (StructuredData, JsonLd) kept in the wrapper.
- [ ] `npm run build && npm run test:dist` (root copy parity) PASS. `scripts/themes/diff-root.mjs` clean against pre-change captures. Commit.

### Task B6: portal layout, runtime, switcher, `/t/quiet/`
**Files:** Create `src/themes/portal/PortalLayout.astro`, `src/themes/portal/runtime.ts`, `src/themes/portal/switcher.ts`, `src/themes/portal/reset.css`, `src/pages/t/quiet/[...page].astro`. Modify `astro.config.mjs` (sitemap filter), `src/components/HeadCommon.astro` (pass `ogImage`), `src/components/ThemeBootstrap.astro` (none beyond B2).

**Interfaces:**
```ts
// PortalLayout props
interface Props { theme: ThemeMeta; page: PageId; title: string; description: string }
// slots: 'header', default, 'footer'
// runtime.ts (module, imported once by PortalLayout)
export function initPortal(): void;  // idempotent; wires before-preparation (scroll capture, font preload), before-swap (attribute stamp), page-load (scroll restore, focus, Zaraz spaPageview)
// switcher.ts
// <bdl-switcher> reads JSON from <script type="application/json" id="bdl-schools"> : { id, name, era, signature, nativeScheme }[]
// uses navigate() from 'astro:transitions/client'; Randomize -> history 'replace'
```
- [ ] Route template (`src/pages/t/<id>/[...page].astro`): imports only its theme's Header/Footer/pages + `theme.css`; `getStaticPaths = staticPathsFor`.
- [ ] Sitemap filter: `(page) => !new URL(page).pathname.startsWith('/t/') && …existing`.
- [ ] Portal pages: `<html data-theme={id}>`, HeadCommon noindex + `ogImage="lab-experiment"`, ClientRouter `fallback="none"`, font preloads from meta, schools JSON, `<bdl-switcher transition:persist="switcher">`.
- [ ] Build; open `/t/quiet/` in the browser pane; navigate all five pages client-side; toggle scheme; confirm attributes after each swap via `javascript_tool`.
- [ ] Commit.

### Task B7: contact under themes
**Files:** Create `src/themes/portal/ContactHidden.astro`. Modify `worker/index.ts`, `tests/contact-worker.test.ts`, `src/themes/quiet/pages/Contact.astro`.

**Interfaces:**
```ts
// worker/index.ts
export const THEME_ID = /^[a-z][a-z0-9-]{0,31}$/;
async function resolveReturnTheme(raw: string | undefined, env: Env, origin: string): Promise<string | undefined>;
// valid pattern AND env.ASSETS.fetch(`${origin}/t/${id}/contact/sent/`) is 200 -> id
function sentRedirect(url: URL, theme?: string): Response;   // /t/<id>/contact/sent/ or /contact/sent/
function errorPage(url: URL, status: number, detail: string, theme?: string): Response; // back link themed
```
- [ ] Tests first: valid theme -> 303 to theme sent; unknown well-formed -> root sent; malformed (`../x`, `X`, 40 chars, `https://evil`) -> root sent; honeypot + theme -> theme sent; 429 page links back to theme contact.
- [ ] `ContactHidden` renders `<input type="hidden" name="return" value={theme}>` plus the honeypot with inline hiding styles; root contact form unchanged.
- [ ] Portal contact forms carry `data-astro-reload`.
- [ ] `npm run test`. Commit.

### Task B8: contrast checker
**Files:** Create `src/lib/contrast/css-tokens.ts`, `src/lib/contrast/check.ts`, `scripts/themes/check-contrast.ts`, `tests/contrast-check.test.ts`, `tests/theme-contrast.test.ts`.

**Interfaces:**
```ts
export interface TokenBlock { selector: string; decls: Record<string, string> }
export function parseTokenBlocks(css: string): TokenBlock[];                       // top-level rules only; ignores @media
export function tokensFor(blocks: TokenBlock[], attrs: { theme?: string; scheme: 'light' | 'dark' }): Record<string, string>; // cascade order, selectors matched: :root, html, [data-theme='x'], [data-scheme='y'], combos
export function resolveColor(value: string, tokens: Record<string, string>): RGBA; // var(), hex, rgb(a), hsl(a), oklch, color-mix(in srgb|oklch, a p%, b)
export function composite(stack: RGBA[]): RGB;                                      // top to bottom over opaque base
export const REQUIRED_PAIRS: ContrastPair[];   // mark/field, mark-muted/field, mark/field-raised, link/field, on-accent/accent, accent/field @ 4.5
export function checkTheme(css: string, meta: Pick<ThemeMeta, 'id' | 'contrast'>): { scheme: Scheme; pair: ContrastPair; ratio: number; ok: boolean }[];
```
- [ ] Unit tests: known ratios (#000/#fff 21, #0000ff/#000 2.44), color-mix, oklch, alpha compositing, var chains, missing token -> explicit failure.
- [ ] `theme-contrast.test.ts`: every registered theme (quiet reads `src/styles/tokens.css`) passes both schemes.
- [ ] Commit.

### Task B9: dist guards for the portal
**Files:** Create `tests/dist/portal.test.ts`.
- [ ] Root isolation: root routes have no `astro-view-transitions-enabled` meta, no `bdl-switcher`, no stylesheet exclusive to any theme.
- [ ] Theme parity: for every theme × page, multiset(visibleText) equals `/t/quiet/` counterpart; normalized links equal.
- [ ] Stylesheet isolation: per theme, exclusive hrefs do not appear on any other theme's pages.
- [ ] SEO: noindex, self canonical, no ld+json, OG `lab-experiment.png`, sitemap has no `/t/`.
- [ ] Contact contract per theme contact page.
- [ ] No U+2014 in any `/t/` HTML.
- [ ] Unique `view-transition-name`/`data-astro-transition-scope` per page.
- [ ] `npm run verify`. Commit.

### Task B10: scaffold and verification scripts
**Files:** Create `scripts/themes/new-theme.mjs`, `scripts/themes/capture.mjs`, `scripts/themes/smoke.mjs`, `scripts/themes/diff-root.mjs`, `scripts/themes/README.md`, `.gitignore` entry for `scripts/themes/.out/`.
- [ ] `new-theme.mjs <id> "<Name>"`: stamps `src/themes/<id>/` from a template and `src/pages/t/<id>/[...page].astro`.
- [ ] `capture.mjs [--themes a,b] [--pages …]`: builds nothing; expects `astro preview` or `wrangler dev` URL; GPU flags; renders page × theme × scheme × {1440x900, 390x844}, reduced motion; writes PNGs + `index.html` contact sheet to `.out/`; prints renderer string, fails on SwiftShader when `BDL_GPU=1`.
- [ ] `smoke.mjs`: client-side journey across every theme and page, scheme toggle, Randomize, back/forward; asserts `data-theme`, `data-scheme`, `.js` after each swap; zero console errors/failed requests; active WebGL context count stays ≤ 1 per page after 20 swaps; contact form submit under `wrangler dev` lands on the theme's sent page.
- [ ] `diff-root.mjs`: pixel diff of root pages against a stored baseline set.
- [ ] Commit.

### Task B11: Lab entries scaffolding
**Files:** Modify `src/lib/lab-schema.ts`, `tests/lab-schema.test.ts`, `src/pages/lab/[slug].astro`. Create `src/studies/registry.ts`, `src/content/lab/bdl-010.md` (`status: forthcoming`), `src/content/lab/bdl-011.md` (`status: forthcoming`).
- [ ] Schema: study `client` optional; `selfStudy: z.literal(true).optional()`; superRefine: a study needs `client` or `selfStudy`. Tests for all three cases.
- [ ] `[slug].astro` renders `studyExtras[designation]` inside StudyLayout when present.
- [ ] `npm run verify`. Commit. PR 0 complete.

---

## Phase C: tranche 1 (branch `feat/theme-schools-tranche-1`)

### Task C1..C6: one school each
Order: C1 Vaporwave (alone, sets patterns), then C2 Grandmillennial, C3 Glassmorphism, C4 Cottagecore, C5 Bauhaus, C6 Swiss in parallel.

**Files per school:** `src/themes/<id>/{meta.ts,theme.css,Header.astro,Footer.astro,pages/*.astro,fx.ts?,assets/*}`, `src/pages/t/<id>/[...page].astro` (via `new-theme.mjs`), font deps in `package.json`.

**Acceptance per school:**
- [ ] `meta.ts` complete (spec §7 row: signature, forbids, fonts with ≤2 preloads, native scheme, contrast extras, asset provenance).
- [ ] Both schemes defined; dark/light doctrine per spec §7; contrast test passes.
- [ ] All five pages render every copy field from the collection; parity test passes; decorative text `aria-hidden`.
- [ ] Contact form contract (ContactHidden, data-astro-reload); honeypot hidden.
- [ ] Arrival view transition in `theme.css` keyed on `html[data-theme='<id>']`; wordmark `transition:name="wordmark"`.
- [ ] fx (if any) on `onMount`, guarded by `data-theme`, teardown releases GPU context; context loss handled; DPR capped at 1.5; pauses when hidden.
- [ ] Captures reviewed (desktop + phone, both schemes) against the signature sentence; smoke passes.
- [ ] Commit per school.

### Task C7: BDL-010 and BDL-011 go live
- [ ] BDL-010 `status: live`, `href: /t/quiet/`, summary, howto.
- [ ] BDL-011 writeups (one section per school: what it is, what it teaches, how we built it, asset provenance), school index component, hero captured from the portal.
- [ ] `npm run verify`; `/lab/` shows both; em dash check. Commit.

## Phase D: verification and handoff
- [ ] `npm run verify` clean on the final branch.
- [ ] capture (all) + smoke + diff-root on a production build under `wrangler dev`.
- [ ] Adversarial review workflow over the full diff, one reviewer per failure mode (lifecycle/leaks, router attribute contract, contact/Worker security, SEO/isolation, a11y/keyboard/focus, CSS/contrast, copy rules); fix confirmed findings.
- [ ] Docs: `docs/lab-backlog.md` (theme schools thread, `/lab/[slug]` CSS twin bug, second tranche, founder items), dated note in `docs/brand-brief.md` (F042), memory update.
- [ ] Ask founder before pushing branches / opening stacked PRs.
