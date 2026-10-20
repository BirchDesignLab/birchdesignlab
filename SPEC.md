# SPEC

A technical specification of the Birch Design Lab site as it exists at the head of main (2026-10-03). Written from reading the repository, its docs and its git history, for someone joining the project. The design specs that produced each feature live under [docs/superpowers/specs](https://github.com/wbp318/birchdesignlab/tree/main/docs/superpowers/specs); this file is the system as built, not a proposal. The README carries the charts; this carries the contracts.

## 1. Purpose and scope

- One site, [birchdesignlab.com](https://birchdesignlab.com), for a one-person web design studio.
- Two jobs: the business pages (Home, About, Services, Contact, Privacy) and the Lab, a numbered collection of experiments and studies that serves as the portfolio.
- Targets stated in the docs: Lighthouse 100 on the root pages, works with JavaScript off (the contact form included), dark mode first with a full light scheme, no em dashes in visitor copy, studio "we".

## 2. Stack

| Layer | Choice | Version at head |
|---|---|---|
| Framework | Astro, `output: 'static'`, no adapter | ^7.3.4 |
| Islands | Svelte | ^5.57.1 |
| 3D | three.js with Draco-compressed GLB | ^0.186.0 |
| Validation | zod | ^4.6.5 |
| Fonts | self-hosted via @fontsource, metric-matched fallbacks via fontaine | 5.3.x |
| Tests | Vitest, two configs (unit and built-output) | ^5.0.1 |
| Browser automation | Playwright, GPU Chromium | ^1.63.0 |
| Host | Cloudflare Workers with Static Assets, wrangler | ^4.136.3 |
| Node | 20.11 or newer (`.nvmrc`) | |
| Types | TypeScript, `astro check` | ^6.0.3 |

## 3. Routing

| Route | Source | Indexed |
|---|---|---|
| `/`, `/about`, `/services`, `/contact`, `/privacy`, `/404` | `src/pages/*.astro` | yes |
| `/contact/sent` | `src/pages/contact/` | no |
| `/lab`, `/lab/<slug>` | `src/pages/lab/`, content collection | yes |
| `/styleguide` | internal instrument, BDL-002 | no |
| `/lab/bdl-006` | the Regulator | no |
| `/hello`, `/showcase`, `/greetings` | QR card landings, `CardLanding.astro` | no |
| `/t/<school>/`, `/t/<school>/about` etc. | the Portal, `src/pages/t/<school>/[...page].astro` | no |
| `/api/contact`, `/api/beacon` | Worker, POST only | n/a |

The sitemap filter in `astro.config.mjs` is the source of truth for what is excluded. A new card channel is a new page and must be added there.

## 4. Content model

### 4.1 Copy

All visitor-facing words live in `src/content/copy/` and are loaded through `src/lib/copy.ts` with a zod schema in `src/lib/copy-schema.ts`. Pages receive `copy` and `chrome` (name, wordmark parts, nav, skip link, location, privacy label) as props. Rich fields render through `rich()` in `src/lib/rich.ts`. The home page's "From the lab" strip comes from `featuredSpecimens()`, the three newest entries.

### 4.2 Lab collection

One collection, `lab`, schema in `src/lib/lab-schema.ts`.

| Field | Type | Notes |
|---|---|---|
| `designation` | `BDL-NNN` | Accession number, permanent, never reused |
| `type` | `experiment` or `study` | Studies carry a problem, process, outcome narrative |
| `title`, `summary`, `date` | string, string, date | Date drives the recency sort |
| `status` | `live` or `forthcoming` | Forthcoming entries render the plate and a notice only |

Interactive experiments are mapped by designation in `src/experiments/registry.ts`. Study extras are mapped in `src/studies/registry.ts`. Detail URLs are flat (`/lab/<slug>`), so an entry's URL never depends on its type.

Standing rules for studies (backlog, 2026-09-06): genre studies against fictional businesses are framed as such; no study names the framework behind the specimens, describes it as shared, or cites build-speed figures; a fictional specimen's hero is a screenshot captured by `scripts/lab/capture-study-hero.mjs`.

## 5. The bark engine (BDL-001)

`src/lib/bark/` generates the birch-bark field that is the site's background, drawn with WebGL. Sitewide motion rules: gated behind `prefers-reduced-motion`, paused when offscreen or the tab is hidden, loaded after first paint. BDL-002 exposes its parameters; BDL-006 retunes it live and solves a colour ramp against WCAG (`src/lib/oklch.ts`, `src/lib/contrast/`). OG images for every page are rendered at prebuild by `scripts/og/generate.ts` using the same system.

## 6. The Portal (BDL-010)

### 6.1 Contract

- A school is a directory `src/themes/<id>/` with `meta.ts` (type `ThemeMeta` in `src/themes/types.ts`), `theme.css`, `Header.astro`, `Footer.astro`, `pages/{Home,About,Services,Contact,Sent}.astro`, optional `fx.ts` and `assets/`.
- One route file per school, `src/pages/t/<id>/[...page].astro`, imports only that school, so a page ships only its own CSS. A draft keeps the route named `_[...page].astro` and is excluded from `THEMES` in `src/themes/registry.ts` (but included in `ALL_THEMES` for the contrast checker).
- Fixed in every school: every word, every link target (`hrefFor` in `src/themes/paths.ts`), the contact form's behaviour (hidden `return` field names the school so the Worker redirects back into it), the page set, the head (owned by `PortalLayout.astro`), the switcher.
- Yours in every school: everything visual.
- Links that leave the school carry `data-astro-reload`. The header wordmark carries `transition:name="wordmark"` and is the only cross-school paired element. A school may name its own persistent chrome once per page as `<id>-<part>`, scoped with the `data-to-theme` and `data-from-theme` attributes the runtime sets. `bdl-switcher` belongs to the portal and no school stylesheet may mention it.
- Decoration is `aria-hidden="true"`. A control that does nothing is `aria-hidden` and not focusable. A live control's visible label sits in an `aria-hidden` span and the control is named by `aria-label`.

### 6.2 Guards

| Guard | Where | Rule |
|---|---|---|
| Word parity | `tests/built/`, `scripts/themes/lib/visible-text.mjs` | Every school's visible words equal quiet's, word for word, skipping `aria-hidden` subtrees |
| Contrast | `scripts/themes/check-contrast.ts`, `tests/theme-contrast.test.ts` | Both schemes of every school, drafts included |
| View-transition names | built tests | Exactly one `wordmark`, at most one own name per page, never `bdl-switcher` |
| Registry | `tests/theme-registry.test.ts` | `meta.id` matches its directory |
| Switcher holds still | `scripts/themes/harness/stage-gates.mjs` strips | 72 of 72 strips at Stage 4 |
| Wordmark judge | `scripts/themes/lib/wordmark-judge.mjs` | Blank during a swap at most 68 ms |
| Arrival timing | `scripts/themes/harness/b2r4-timing-compare.mjs` | Read `land90` beside `firstVisible` |

### 6.3 Runtime

`src/themes/portal/runtime.ts` owns the view transitions, the arrival attributes, and drawing ahead: after a 400 ms mouse rest on a switcher row the destination school is drawn off-screen so the first-draw freeze (measured at up to 432 ms) drops to tens of milliseconds. By founder decision there is no draw-ahead on press, on a page's own links, or on phones.

### 6.4 Research program

Tier 1 fixes and tooling; Tier 2 primary-source dossiers per school (`theme-schools-research/dossiers/`) and a critique panel; Tier 3 revisions in stages, one pair of schools per stage, each stage with proofs, then one wave of four tasks per school, each task through `bdl-task` with an Opus critic, a film verifier and a gate, then a founder stop. Stage 3 (glassmorphism, vaporwave) merged in PR #93. Stage 4 (swiss, bauhaus) merged in PR #95. Stage 5 (grandmillennial, cottagecore) is next, then a transitions phase.

## 7. The Worker

`worker/index.ts`, configured by `wrangler.jsonc`. Static Assets serve `dist/` first except under `/api/*` (`run_worker_first`).

**POST /api/contact**: honeypot, then per-IP rate limit (binding `CONTACT_RATE_LIMITER`, 5 per 60 s), then `parseContactSubmission` from `src/lib/contact/validate.ts`, then `env.EMAIL.send` from `forms@birchdesignlab.com` to a verified Email Routing destination, then 303 to `/contact/sent/` or the school's sent page when the `return` field names a school whose sent page exists (checked against `SCHOOL_ID`). Error responses are plain HTML pages. A trailing slash is accepted. Non-POST gets 405.

**POST /api/beacon**: one Analytics Engine data point per QR card scan (binding `AR_ANALYTICS`, dataset `ar_card_scans`), indexes the channel, no IP, UA or cookies. Fail-silent, always 204.

Every Worker response passes through `secure()`, which adds Referrer-Policy and X-Frame-Options, because `public/_headers` applies only to static responses. There is no Permissions-Policy by decision (2026-08-03): the Lab will use camera, location and sensors first-party.

## 8. Build and verification

`npm run verify` = `vitest run`, `astro check`, `npm run build` (which runs `clean-dist.mjs`, the OG prebuild and `astro build`), then `vitest run --config vitest.dist.config.ts` over the built output. It must be clean before a PR.

Two deliberate Vite plugins in `astro.config.mjs`:

1. `dropUnusedDracoDecoder`: removes three.js's eagerly-resolved Draco decoder copies (about 1.3 MB) from the bundle; the real decoder is served from `public/draco/`. Warns, does not throw, when it matches nothing.
2. `restoreReferencedCss`: snapshots CSS before Astro's CSS plugin runs and writes back any file a chunk's `importedCss` names that never reached disk, working around Astro 7 on Rolldown dropping CSS for dynamically imported components. Delete once Astro fixes it upstream.

`compressHTML: true` keeps Astro 6's whitespace rule because copy relies on it ("survives in <em>bright</em>").

## 9. Deploy

Cloudflare Workers Builds watches upstream `main`. Build command `npm run build`, deploy command `npx wrangler deploy`. Merging to `main` is the production deploy; there is no staging. Reversibility is the safety net. The `www` host redirects to the apex by a dashboard rule. Full history and dashboard steps are in [docs/deploy.md](https://github.com/wbp318/birchdesignlab/blob/main/docs/deploy.md).

A fork has none of the bindings, so `npm run deploy`, `wrangler dev` and the beacon and contact endpoints do not work from a fork. Everything else does.

## 10. Agent operating model

Documented in [CLAUDE.md](https://github.com/wbp318/birchdesignlab/blob/main/CLAUDE.md) and [.claude/workflows/README.md](https://github.com/wbp318/birchdesignlab/blob/main/.claude/workflows/README.md).

- Every subagent dispatch sets `model` and `effort`. Haiku for enumeration, Sonnet for implementation and verification, Opus for critique, design and sensitive code. Fable is never a subagent model. Defaults are never `xhigh` or `max`.
- `bdl-task` args: `task`, `title`, `repoDir`, `branch`, `base` (full sha), `briefPath`, `reportPath`, `workDir`, `scratchRoot`, `runLabel`, `owns`, `ports` (three in 4460 to 4480), `trailer`; optional `school`, `sizes`, `schemes`, `films`, `layout` with `baseline`, `runtime`, `foreignPaths`, `carries`, `roles`, `maxRounds` (default 2), `maxAgents` (default 14), `answers`, `implemented`.
- Flow: implement, Haiku verifies HEAD from git (the only trusted head), critic plus verifier plus gate in parallel, sort findings (taste to the founder, minor deferred, blocker and important to the fix loop), up to `maxRounds` fix rounds with escalation one seat up per surviving finding, then `complete`, `parked` or `stopped`.
- `bdl-wave` chains tasks, carries taste calls and deferred minors forward, stops at the first task that does not complete.
- `scripts/workflows/harness.mjs` and `mutants.mjs` test the workflows; run both after any edit.
- Controller procedure: state the model and effort plan and agent count before launching; look at the sheets yourself before any founder stop; relay taste calls; check `git reflog` and `netstat` for leftovers; run the stage gates once per pair.
- Scripts are committed under `scripts/`, never left in a temp directory.

## 11. Brand

Name decided 2026-07-15 ([founding record](https://github.com/wbp318/birchdesignlab/blob/main/docs/birch-design-lab-founding-record.md)): Birch Design Lab, eroding to Birch Labs, then Birch. Dark mode is the default face. North star object: the Grand Seiko White Birch. Mark concept: lenticel dashes. Assets under `assets/brand/` (SVG marks and lockups, PNG rasters at 512 and 2048, four GLB 3D marks, a sponsor card with QR). Build scripts under `scripts/brand/`. Social render pipeline under `social/` with its own `package.json`.

## 12. Known constraints and decisions of record

- No client work yet; studies are fictional genre studies and say so.
- Safari is untested by film; the founder's iPhone 17 Pro Max is the only WebKit evidence.
- The render-everything Lab landing is fine to about 30 to 50 entries.
- Analytics Engine keeps about three months; durable scan storage is undecided.
- The specimen sibling repos are deliberately unnamed in this repo because it may become public.
- Dependencies: newest stable, no release candidates, majors as their own PR, `npm audit` triaged not obeyed, no majors during a launch run-up.
