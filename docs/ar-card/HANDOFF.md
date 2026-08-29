# AR Card · HANDOFF

Session context for the WebAR business card system. Every session working on
this project reads this file first and updates it last. Work items live in
`docs/lab-backlog.md` under "AR card"; there is one backlog file for the whole
repo, so update that one too rather than starting a local list.
Companion design reference: `docs/bdl-ar-card-prompt-pack-v4.md` (untracked,
founder working doc) carries the AR-phase constraints (multi-target `.mind`,
tracking-target rules, vendoring policy). This file (08-28-26 session) folds
those constraints in below, plus the repo-integration calls that session made.

## Purpose

WebAR business card system: a physical card (QR or NFC) opens a URL on this
site; the card artwork is a MindAR image target and a 3D logo rises out of the
card. **This session (08-25-26) shipped the interim landing page** — the
permanent page every channel resolves to, built before the AR experience
exists so the AR app later *adds to it and replaces nothing*.

## URL scheme

**A channel is a page.** Each card gets its own URL, and that URL is a real
file: a three-line page passing a channel label to
`src/components/CardLanding.astro`, which is the landing itself.

| Channel | Path | Label | Status |
|---|---|---|---|
| Tier 2 kraft scatter cards | `/hello` | `kraft` | **Live now** |
| BDL card QR in Cheer and Chatter's break showcase | `/showcase` | `showcase` | **Live now** |
| Tier 1 wood cards | `/greetings` | `wood` | **Path decided + wired 08-28-26**, card not yet designed or etched |

**Path decided 08-28-26** (AR card prompt pack v4, superseding the earlier
"deliberately undecided" stance): `/greetings` = tier 1 wood, `/hello` = tier
2 kraft, no query parameters, analytics is per-tier only. `src/pages/greetings.astro`
is wired (same three-line pattern as `hello.astro`) and excluded from the
sitemap in `astro.config.mjs`. **What is still a one-way door: etching the URL
into physical wood.** Wiring the page cost nothing and is reversible; ordering
a run of ~$10/ea etched cards is not. Do not order wood cards until the AR
experience this URL will eventually carry is at least stubbed the way `/hello`
already is. Decision-gate tracking lives in `docs/lab-backlog.md` under "AR
card" > decision gates.

**No rewrites — deliberately, and this is the load-bearing repo-integration
call this session made.** The AR card prompt pack (v4) was written assuming a
single-page AR app reached by rewriting every channel path to one
`index.html`, with wiring done in the host dashboard. That premise predates
this repo's actual architecture: `public/_redirects` and a single rewritten
`/ar-card` entry point existed earlier and were **removed 08-26-26**
("Simplification" below) precisely because a rewritten URL that nothing
explained was confusing. The replacement — a channel is a page, and the AR
experience is a JS module lazy-loaded by URL — already solves "two URLs, one
app" without any rewrite: `/hello` and `/greetings` are two independent Astro
pages that both render the same `CardLanding.astro` component, and that
component's inline script does `import(CONFIG.AR_MODULE_URL)` to fetch the
*same* `/ar/card-ar.js` module regardless of which page loaded it, then calls
`mod.mount(rootEl, channel)`. Cloudflare Pages/Workers serves that path
straight out of `public/ar/` like any other static asset — nothing to
configure in the host dashboard. Reintroducing a rewrite would be a
regression against a reasoned, recent, founder-directed decision, so this
session did not do it. If you actually want host-level rewrites back
(e.g. for a reason this session didn't anticipate), that is a call for the
founder to make explicitly — flag it before undoing this.

The channel label is what per-channel scan counts group on, so it is stable
even if the file is renamed. Renaming a label splits its history in two.

**Put the trailing slash in the QR payload: `birchdesignlab.com/hello/`, not
`/hello`.** Astro builds directory-format pages, so the slashless form works
but costs a 307 canonicalization hop before the page starts loading. One
redirect is a whole round trip on a phone on 4G, spent before the first byte
of the page, and the budget here is under two seconds. The old rewrite version
wired both forms explicitly; a page has no such hook, so the slash belongs in
the payload instead. This matters most for the wood tier, where the URL is
etched permanently.

**No query parameters, and no rewrites.** Both were removed 08-26-26; see
"Simplification" below for why.

## Perf budgets

- Landing interactive **< 2s on 4G**; critical path **~14KB** (one HTML
  document, styles and script inline, no webfonts, no framework, no
  third-party JS, no GA4).
- AR phase (from the prompt pack, for later): AR payload <= 1.5MB, locked
  60fps on mid-tier Android.
- **Open tension, flagged not resolved (08-28-26):** the vendored MindAR
  runtime alone (see "Vendoring" below) is `mindar-image-three.prod.js`
  (385KB) + its `controller-mGt1s8dJ.js` chunk (2.2MB) + a small UI chunk
  (4.5KB) ≈ **2.6MB unminified-but-already-bundled**, before gzip and before
  `logo.glb` or `cards.mind` are added. Gzip should cut that a lot (JS
  typically 65-75%), but nobody has measured the real wire size yet. Whoever
  takes backlog task 3 (asset pipeline) should measure the actual
  Content-Encoding: gzip/br size of the vendored MindAR files served from
  `public/ar/` and confirm whether the 1.5MB budget is meant to cover
  framework + assets combined, or assets only. Don't assume either answer —
  measure, then either hit the budget or renegotiate it with the founder.

## Multi-target design

The app tracks **several card designs, not one**: the tier 1 wood card plus
every distinct tier 2 kraft scatter design. All of them compile into a single
multi-target `.mind` file, and every target triggers the identical logo
experience — there is one AR experience, addressed by several different
pieces of printed artwork. Keep the count of distinct printed designs small
(a handful); MindAR handles multiple targets fine, but robustness and load
time scale with target count, so this is a real constraint on how many kraft
scatter variants get printed, not just a suggestion.

Practical implication for the AR scene build (backlog task 2): set up an
anchor for **every** target index the compiled `.mind` file contains, derived
from the compiled file rather than hardcoded, so adding a new kraft design
later is "recompile + append a row to Target inventory," not a code change.

## Per-design tracking-target rules

MindAR matches distinctive local features, not silhouettes or shapes. Rules
that apply to every design compiled into `cards.mind`:

- **The QR zone is dead space for tracking.** Repeating squares are
  ambiguous, and per-card QR payloads differ, so nothing there helps a lock.
- **Spread high-contrast, asymmetric, non-repeating artwork across the rest
  of the card**, so a lock survives partial finger occlusion. A solid border
  adds almost nothing.
- **Compile each target from its vector source art, never from a photo of a
  physical card**, with the QR zone flattened to a solid fill in that source
  art before compiling. This matters most for the wood tier: grain varies
  card to card, so a target compiled from one physical card's photo would not
  reliably match the next card off the same design. Printed kraft cards are
  identical copies of each other, so their target (compiled from the same
  source art) matches the whole run.

## Vendoring policy

MindAR (`mind-ar` on npm, the image-tracking + Three.js integration
`mindar-image-three`) ships as prebuilt dist bundles, not source you'd import
and tree-shake — vendoring the dist files directly, version pinned, is
insurance against a single-maintainer upstream disappearing or breaking. Fork
only if a patch is ever actually needed.

- **Package:** `mind-ar` (not `mindar-image-three` — that name is not on the
  npm registry; the prompt pack's shorthand refers to the image+three build
  *within* the `mind-ar` package).
- **Version pinned:** `1.2.5` (latest; nothing has shipped since 2024-01-16 —
  single maintainer, treat as effectively unmaintained).
- **Files vendored**, from `mind-ar@1.2.5`'s `dist/`, copied verbatim into
  `src/ar/vendor/mind-ar/` (byte size checked against the published package
  after download — all five files below matched exactly, no transform):
  - `mindar-image-three.prod.js` (385,065 bytes) — the module the AR scene
    imports directly.
  - `controller-mGt1s8dJ.js` (2,199,370 bytes) — the image-tracking
    controller it imports at runtime. (Not `controller-d1-OMKPY.js` — that
    one belongs to the face-tracking build, which this project does not use.)
  - `ui-fBadYuor.js` (4,552 bytes) — MindAR's built-in loading/compatibility
    UI chunk, also imported by `mindar-image-three.prod.js`.
  - Not vendored: `mindar-image-aframe.prod.js`, `mindar-face-*`, and the
    A-Frame build — this project is Three.js-only.
- **This is a floor, not a ceiling.** `mindar-image-three.prod.js` (385KB) was
  read in full and its imports enumerated exhaustively — nothing else to add
  from that file. `controller-mGt1s8dJ.js` (2.2MB, the actual tracking/WASM
  glue) was **not** fully audited line by line; only the top-level statement
  above was confirmed. If a later build step (esbuild bundling `src/ar/` into
  `public/ar/card-ar.js`) reports an unresolved `three` export or an
  unresolved `three/addons/*` import originating from that chunk, that is
  this same class of problem recurring — add the missing file to
  `src/ar/vendor/` and log it here, don't route around it silently.

### Three.js: pinned separately at `0.160.0`, not this repo's `0.185.1`

**Verified, not assumed — this repo's real `three@0.185.1` does not work with
`mind-ar@1.2.5` and would fail hard, not subtly.**
`mindar-image-three.prod.js` has a static ESM import of `sRGBEncoding` from
`"three"`. Checked directly against this repo's installed copy:
`node -e "require('three')"` → no `sRGBEncoding` export (only the newer
`SRGBColorSpace`); three fully dropped the deprecated encoding enums between
the two versions. A missing named ESM export is a hard link-time failure, not
a runtime warning — the module would not load at all.

MindAR's own installation docs settle the right version: their documented
setup for `mind-ar@1.2.5` pins an import map to **`three@0.160.0`** — the only
combination the maintainer ever tested. Confirmed `0.160.0` still ships the
deprecated `sRGBEncoding` constant (value `3001`) alongside `SRGBColorSpace`,
so it loads clean.

- **Files vendored**, from `three@0.160.0`, into `src/ar/vendor/three-0.160/`
  (byte sizes confirmed against publish after download):
  - `three.module.js` (1,272,972 bytes) → vendored path root, aliased from
    the bare `three` specifier.
  - `addons/renderers/CSS3DRenderer.js` (7,804 bytes) → vendored under
    `addons/`, aliased from the `three/addons/...` specifier prefix.
    Confirmed by direct inspection that this is a genuine import inside
    `mindar-image-three.prod.js` itself (`import { CSS3DRenderer as Vd } from
    "three/addons/renderers/CSS3DRenderer.js"`), not something staged for our
    own overlay UI — it earned its place in the vendor set on that basis.
- **Advisory check:** three@0.160.0 — no known direct vulnerabilities per
  Snyk (checked 2026-08-29, not re-verified via `npm audit` since it isn't in
  `package.json`/the lockfile — it's a vendored file, not an installed
  dependency). Re-check before shipping if a long gap passes before this ships.
- **Consequence for backlog task 2 (the AR scene):** the whole AR module
  standardizes on this vendored `three@0.160.0` for *all* its three usage —
  MindAR's internal use and this project's own scene code (GLTFLoader,
  KTX2Loader, meshopt, raycasting) alike. Do not import `three` from
  `node_modules` (the site's `0.185.1`) anywhere under `src/ar/`; two three
  instances sharing one WebGL context is a real, avoidable bug. The repo ends
  up with two three versions total, cleanly separated by directory, never
  colliding at runtime: `0.185.1` for BDL-007 and the rest of the site,
  `0.160.0` scoped entirely to the AR module.
- **Why not patch the bundle to work with `0.185.1` instead:** rejected.
  Surgery on a minified third-party bundle from a dead upstream, unverified
  against whatever else might have drifted in the unaudited controller chunk,
  and exactly the "fork" maintenance burden this vendoring policy exists to
  avoid — carrying a second, older three for one module is free by
  comparison.
- **Build-step consequence:** the bundler for `card-ar.js` (esbuild,
  `bundle: true`) must alias `three` → `src/ar/vendor/three-0.160/three.module.js`
  and `three/addons/` → `src/ar/vendor/three-0.160/addons/` so the shipped
  module is fully self-contained — no `<script type="importmap">` on the
  landing pages. Chosen over an import map deliberately: this landing is
  opened from whatever scanned the QR (often an in-app browser — Instagram,
  Facebook, a QR-scanner app's own webview), and those have a worse track
  record with import maps than with plain dynamic `import()`. Matches the
  landing's existing no-fragile-dependency posture (inlined font, no linked
  webfonts, no third-party JS).

## Directory layout (repo-integration decisions, 08-28-26)

Decided by inspecting existing conventions rather than inventing new ones:

- **AR scene source:** `src/ar/` — sibling to `src/lib/` and
  `src/components/`, the existing source directories. Vendored dist lives
  under `src/ar/vendor/`: MindAR in `src/ar/vendor/mind-ar/`, its separately
  pinned three.js in `src/ar/vendor/three-0.160/` (see "Vendoring policy"
  below for why two three versions).
- **Build step:** a script under `scripts/ar-card/` (which already holds
  `print-vcf.mjs` and `subset-marcellus.mjs` for this project) bundles
  `src/ar/` into the single runtime module. Not written this session — no
  feature code — but that's where backlog task 2 should put it.
- **Runtime output, served as-is:** `public/ar/card-ar.js` (matches
  `CardLanding.astro`'s existing `AR_MODULE_URL: '/ar/card-ar.js'`) plus
  `public/ar/assets/cards.mind` and `public/ar/assets/logo.glb`. This mirrors
  the one other case in this repo of a large binary that must be fetched from
  a literal, unhashed path rather than a Vite-hashed one: `public/draco/`,
  which exists because `DRACOLoader.setDecoderPath('/draco/')` needs a real
  directory path. `public/ar/` needs the same treatment for the same reason —
  the AR module is fetched by URL via `import()`, not bundled by Vite, so
  nothing hashes its filename. When the build step above exists, give
  `public/ar/*` a long-cache header rule in `public/_headers`, the same way
  `/draco/*` already has one.
- **Why not `assets/` at repo root:** that directory is source design assets
  (`assets/brand/...`), not runtime/servable files — the repo's precedent for
  a runtime GLB is `src/experiments/bdl-007/bdlOrganic.draco.glb`, committed
  next to the code that uses it and imported via `?url` so Vite hashes it.
  That pattern doesn't apply here only because the AR module itself has to be
  fetched from a stable, unhashed URL (see above); everything else about "the
  runtime asset lives next to the code, checked into git" still applies.
- **No separate `docs/ar-card/BACKLOG.md`.** The prompt pack's own Prompt 0
  text says to move that file to match this repo's convention if one exists —
  and one does: `docs/ar-card/BACKLOG.md` existed and was **merged into
  `docs/lab-backlog.md` under "AR card" on 08-26-26, at founder direction**
  ("there is one backlog file for the whole repo"). Recreating a separate
  file would undo that. This session added/tightened acceptance criteria for
  the six prompt-pack tasks inside the existing "AR card" section instead —
  see `docs/lab-backlog.md`.

## Local HTTPS for dev

Not set up this session (documentation only, per the prompt pack's own
fallback). Camera access requires a secure context; `localhost` counts as
secure in Chrome/Safari without a cert, but a phone testing over LAN (the
realistic way to test AR on an actual Android/iOS device against a dev
server) does not get that exemption and needs real HTTPS.

Recommended path when backlog task 2 needs to test on a phone:
1. Install `mkcert` (`choco install mkcert` on Windows, then `mkcert -install`
   once to trust its local CA).
2. `mkcert 192.168.x.x localhost 127.0.0.1` (use the dev machine's LAN IP) in
   the repo root to generate a cert/key pair; gitignore them.
3. Astro's dev server is Vite underneath, so `vite.server.https` in
   `astro.config.mjs`'s existing `vite: {...}` block takes `{ key, cert }`
   read from those files — or use `vite-plugin-mkcert` (not currently a
   devDependency) to automate steps 1-3.
4. `npm run dev -- --host` to bind on the LAN IP so a phone on the same
   network can reach `https://192.168.x.x:4321`.

This only covers `astro dev`. `wrangler dev` (the full-stack check mentioned
under "Deploy") proxies through `workerd` and has its own `--local-protocol
https` flag if that path is ever needed for AR testing too.

## Target inventory

Source of truth for which physical card design maps to which index inside
the single compiled `cards.mind`. Update this **every time** a design is
finalized or added, immediately after recompiling — index drift is the
easiest way to silently break multi-target.

| Index | Design | Tier | Status |
|---|---|---|---|
| 0 | kraft scatter (current printed design, name TBD) | 2 | Card printed and live at `/hello`; not yet compiled as a MindAR target |
| 1 | wood card (design TBD) | 1 | URL decided (`/greetings`); card not yet designed, not yet etched |

No `cards.mind` exists yet. Nothing above is a real target index until
backlog task 3 (asset pipeline) compiles one.

## Decisions this session (08-25-26)

- **The landing lives in `src/components/CardLanding.astro`**, rendered by a
  thin page per channel. Fully standalone: no BaseLayout, no site CSS import,
  no GA4. Token values are mirrored by hand from the dark face of
  `src/styles/tokens.css` (charcoal field, bark-warm mark, moss accent) with a
  comment marking the mirror.
- **AR stubbed, not teased, and per channel.** No page renders AR UI today.
  Enabling it later = ship a module at `AR_MODULE_URL` (`/ar/card-ar.js`)
  exporting `mount(rootEl, channel)`, then add `ar` to the channel pages that
  should have it; the mount point (`#ar-root`) and the lazy fetch are already
  in place. **AR is a property of the card, not of the app.** `/hello` is a
  card someone is holding, so it becomes an AR channel. `/showcase` is a QR on
  a television across a room, and pointing a phone back at that television
  tracks nothing, so it stays a plain landing forever: mark, save contact,
  visit the site, enter the Lab. The prop defaults to off so a new channel
  cannot inherit AR by accident. The module is fetched by URL rather than
  imported so that turning AR on for a card never pulls AR's weight into the
  landing's critical path.
- **vCard is generated client-side** as a Blob download, with a no-JS `data:`
  URI fallback rendered at build time. CRLF line endings (iOS is strict).
  Contact fields sit in the page's CONFIG object, **placeholder-marked**: the
  studio identity (name/company/email/url) is live-safe, but the founder fills
  name/title/phone with real values before any card is printed or etched.
  Empty fields are omitted from the vCard.
- **vCard building lives in `src/lib/vcard.ts`** (unit-tested in
  `tests/vcard.test.ts`), after the pre-merge adversarial review confirmed two
  defects in the inline first draft: no RFC 2426 escaping (a founder-filled
  title like "Founder, Principal" would silently corrupt the card at exactly
  the moment the URL is committed to physical inventory) and the whole display
  name landing in N's given-name slot (surname sorting breaks once a personal
  name goes in). The builder now escapes every value, puts the org identity in
  the family slot with `X-ABShowAs:COMPANY`, and splits a personal name on its
  last space when `card.isOrg` is set false.
- **Beacon endpoint stood up now** (chose the "small job" fork): `POST
  /api/beacon` in `worker/index.ts` writes one Workers Analytics Engine data
  point per scan — index = channel, double = client ts. That is the entire
  payload. No cookies, no IP, no UA, no PII. Fail-silent: always an empty 204.
  Binding `AR_ANALYTICS`, dataset `ar_card_scans`, auto-created on first
  write, currently unbilled. **Caveat: AE retention is ~3 months** — fine for
  the per-tier comparison that matters, but the durable-storage decision is a
  backlog item for the real analytics task. Query anytime via the AE SQL API
  (`SELECT index1, count() FROM ar_card_scans GROUP BY index1`, remember
  `_sample_interval` weighting for exact counts).
- **noindex + sitemap-excluded.** The landing is reached by scanning a card,
  not by search. OG/Twitter meta still ship (reusing `/og/home.png`) so a
  shared link unfurls cleanly.
- **No GA4 on this page** — the site's GA4 stays on business pages; the card
  landing's only analytics is the first-party beacon.

## Simplification (08-26-26)

The first build carried machinery for things that turned out not to exist.
Founder's call, and the right one: do not carry weight for a future that has
not been decided.

- **`?c=` card id: removed.** Kraft scatter cards are identical. There is no
  per-card identity to record, so the parameter labelled nothing.
- **`?s=` medium: removed.** NFC is dropped — the wood cards cannot be sourced
  with chips in them — so every scan is a QR scan and the field had one
  possible value.
- **`public/_redirects` and `/ar-card`: removed.** Serving every channel from
  one file behind a 200 rewrite meant a URL existed that nothing explained,
  which is exactly the confusion it caused. A channel is a page now. The path
  is the file, the channel label is a prop, and nothing is parsed at runtime.
- **NFC batch writer: dropped**, not deferred. Nothing else depended on it.

What survived is what earns its place: the channel label (two real channels
today, a third coming when the wood tier is decided), the beacon, the vCard,
and the AR stub.

## Current state

- Landing **done-with-caveat** (AR stubbed; vCard placeholders pending real
  founder details — note: the vCard placeholder caveat closed 08-27-26 per
  `docs/lab-backlog.md`, this file's own vCard paragraph above predates that).
  Tests: `tests/card-landing.test.ts` (source invariants),
  `tests/beacon-worker.test.ts` (endpoint behavior).
- Three channels wired: `/hello` (kraft, live), `/showcase` (the Cheer and
  Chatter break-screen QR, live), `/greetings` (wood, wired 08-28-26, no
  physical card yet — see URL scheme above).
- Beacon endpoint **live with the landing**; scans are counted from first
  deploy. Stats view, rate limiting, and durable storage are still open.
- AR experience, asset pipeline, QA pass: not started — see
  `docs/lab-backlog.md`. This session (08-28-26, "AR card phase 0") did no
  feature code by design: it set up the URL scheme, the directory layout for
  where AR code will live, and the vendoring/HTTPS groundwork above.

## Deploy

Repo's normal flow, nothing special: branch, PR, merge to `main`; Cloudflare
Workers Builds builds the merge commit and runs `wrangler deploy`. The
`AR_ANALYTICS` binding rides in `wrangler.jsonc`; `worker-configuration.d.ts`
was regenerated (`npm run types`). Local full-stack check: `npm run
dev:worker`.
