# Lab Backlog

*Experiment concepts agreed 2026-07-16, evening session. Parent documents: founding record, website spec, handoff. Each concept gets its own spec at its own build time, per house practice. Brought up to date 11-17-26 against main (the 11-16 inventory was the input); closed items were removed, not struck through, unless the reasoning is worth keeping.*

*This is the only backlog file. The AR card had its own `docs/ar-card/BACKLOG.md` until 08-26-26; it is merged in below under "AR card". Its `HANDOFF.md` stays where it is, as the project's context document. The social pipeline keeps its own `docs/socials-backlog.md`.*

## Open gates — check before shipping the thing they gate

The one-way doors and the clocks. Each has its full entry further down; this list exists so a gate cannot be buried. Nothing goes here unless getting it wrong is expensive to undo.

- **Etch the tier 1 wood card.** `/greetings` is built and wired as the tier 1 wood landing (08-28-26), but which path the etched card actually prints is deliberately undecided until etch time; ordering the physical run is the one-way door. Before it: the trademark knockout search on the name (unchecked in the founding record), and the card-trio call (see "WOW slate"). Entry under AR card.
- **Repo visibility (open founder question, not decided here).** The founder intended to make the repo private again; it is public today, and the share-site config in the repo still names the client (the client pages themselves are kept out of git). Decide before more client-adjacent material lands.
- **Card-scan export before ~01-23-27.** Analytics Engine keeps about three months, so scans from 10-25 on age out after that. `scripts/analytics/export-card-scans.mjs` merges into a gitignored CSV; the dataset lives in the account that holds the Worker. Export done 11-17-26 (39 scans, 08-26 to 10-25).
- **Identity surface.** Google Business Profile, an LLC line in the footer, any address or phone on the business pages: each puts something real in public and is hard to take back. Founder call; entry under "Gulf Coast positioning".
- **Price sheet is frozen until the 02-15-27 review.** Do not exercise the document tooling by editing it.
- **What a study may say.** The publish-time check for genre studies, and the BDL-005 client clearance. Both below.
- **Stage 5 before the copy pass.** Merging Stage 5 to main is a production deploy, and the copy pass reflows all seven schools, so it lands after.

*Closed: the card's phone number (08-27-26); the deploy gate (CI `verify` is a required check, #109, 11-17-26).*

## Numbering vs build order

BDL-004 originally reserved the Painting. Reassigned 2026-07-16: the Loom took 004 (since retired, designation burned); the Painting returns to the backlog unnumbered and gets a number at its own build time. The next experiment takes the next free number.

## Genre studies: standing rules

*Pulled forward 09-06-26 from the `docs/specimen-demos-backlog` branch (deleted).*

**These are genre studies, not client case studies.** Magnolia & Mane (BDL-008) and Bayou Kitchen (BDL-009) are fictional businesses: no client, no engagement. They argue what a genre of site should do, with one of our own specimen builds as proof. **Reclassified 11-17-26 (#112, founder call):** they are experiments in the catalogue. They keep the study page layout; `genreStudy: true` in the schema (`src/lib/lab-schema.ts`, `src/lib/lab-sets.ts`) drops the client name and the Client plate row, badges them "genre study", and lists them with the experiments on `/lab` and `/lab/experiments`. `/lab/studies` is for real client work.

**Check at publish time what a study may say.** These describe how our own specimens are built, which is closer to the line than a normal writeup. No study may name the framework behind them, describe it as a shared or reusable spine, or cite build-speed figures. Run the check against the final copy every time; a draft that read clean weeks ago is not evidence. Compare the BDL-005 clearance entry below: same discipline, different subject.

**A fictional specimen's hero is a screenshot.** There is nothing to photograph. `scripts/lab/capture-study-hero.mjs` is the committed tool; `--clip-to` stops a shot short of placeholder imagery.

**The actionable version of specimen work lives with the specimens.** Their own repo's `docs/BACKLOG.md` holds prerequisites and gates; entries here exist so the Lab side is not lost. That repo is deliberately not named here or by path: this repo is public, and its name appears nowhere else in it.

## In flight

### BDL-010 / BDL-011 · The Portal (theme schools) · IN FLIGHT

**Where it is (11-21-26).** Stages 1 to 5 are on main (#88, #89, #93, #95, #117). **Stage 6, the set re-review**, goes to main from `feat/theme-schools-tier3-stage6`: waves 1 to 4 plus task 31 (final fixes), five founder stops (adversarial critique first at stops 2 to 5, every verdict taken), the interactables wave, hover gating across every school and the business site, and the welcome-prompt line "Tap around, too: every school hides a few things that answer back." Records: `docs/superpowers/specs/theme-schools-research/tier3-stage6/` (`stage6-report.md`, `stage6-plan.md`, `stage6-decisions.md`, stop 1 to 5 reports and critiques, briefs, proofs). Run ledger in gitignored `docs/private/stage6-ledger.md`. Stage 6 leftovers are listed below.

**Next, in order:** the transitions phase, then tranche 2. Founder, 10-02-26: steam through in that order, nitpicks and the iPhone pass at the end.

**Decisions on record.** Tier 1 and 2 done; the founder's decisions are in `tier3-briefs/stage0-decisions.md`, `tier3-stage3/stage3-decisions.md` and the stage 4/5 reports. Six tranche-1 schools built 09-23-26 (vaporwave, grandmillennial, glassmorphism, cottagecore, bauhaus, swiss); Research must come from trusted, reliable primary sources. Every school renders quiet's words verbatim (word parity). **Founder's first read of set B (09-23-26):** "Very impressed." Vaporwave and Bauhaus are great and personal favourites; Grandmillennial and Cottagecore are "absolutely selling what we can do"; Glassmorphism is the most lackluster, Swiss right behind it; mobile screenshots look good.

**Transitions are the next push after the schools** (founder, 09-23 and 10-02-26): crank up the transitions between schools and the motion within them; "this is a crown jewel for a while". Turn today's low-motion transitions into transformations, modelled on the wordmark morph (it transforms and moves while the page changes under it): possibly a distinct transition per pair, individual from any school to any other, no literal portal gesture, never stalling on loading (preloading and drawing ahead, even everything up front, is acceptable). Stalls are reduced where possible, never promised away. Measurements and the off-screen draw technique: `theme-schools-research/tier3-stage1/p4-trace.md`. Each school's research dossier records its motion vocabulary; use it when scoping this phase. The transitions phase absorbs the parked items below. Then **tranche 2** ("very likely"; candidates and the original ranking in `theme-schools-research/`, plus **TempleOS** added 10-02-26).

**Sequence after the schools (founder, 09-23-26):** ship the themes and transitions; run the big copy pass (see "Copy pass" below); then one reconciliation pass over Portal-versus-site weirdness. So: expect the copy pass to reflow layouts built around today's copy lengths (billboard splits, "From the lab" summaries, the process row); keep Portal-specific copy (first-load prompt, picker heading, BDL-010's lines) easy to find; fix structure, not line breaks.

**Parked for the transitions phase:**
- **First-draw freeze.** Drawing ahead on a 400 ms mouse rest cut it (grandmillennial 432 to 37 ms; `tier3-stage2/freeze-investigation.md`). Left: drawing ahead on a school's own links (grandmillennial About still holds about 260 ms), and phones, which never draw ahead (a tap gets the full freeze). By the founder's calls there is no drawing on a press or on the page's own links.
- **Back to a scrolled page:** the wordmark still morphs toward an off-screen box (`harness/wm-close-back.mjs`); the forward direction was fixed at portal level.
- **Glass arrival polish.** The CSS poster cannot refract, so the orb edge bends when the live lens takes over about 850 ms after the click (a baked raster poster was weighed and rejected: start spot varies with viewport, tint, scheme, time of day). Glass's first paint holds the old page until its first GPU raster (one 198 ms task of Skia compiles): a feel issue, not a delay. Levers: drawing glass ahead on cold clicks (portal-wide; the known glass text-thinning risk) or fewer paint kinds in the first view (`tier3-stage3/tier-b2-status.md`, "Round 5"). Read gate timing with `land90` beside `firstVisible` (`harness/b2r4-timing-compare.mjs --metric land90`): `firstVisible` can fire on the old page's fade-out.
- **Glassmorphism's plain fade** is part of a wider pattern (four schools' in-school swaps converged on one safe fade); each school gets its own gesture, glass's material first. **Glass on desktop "doesn't look right"** (founder, 10-02-26; specifics not yet given), and glass is the weakest school by the founder's own read.
- **WebKit.** Every film and trace so far is Chromium; an iPhone pass found some transitions "a little stuttery or buggy". For this phase: film in WebKit too and check Safari's view-transition support per school's choreography. *(From PR 96:)* a WebKit capture lane in `scripts/themes/` (Playwright WebKit, on Windows it is not iOS Safari, so a real device stays the final word), and Safari/iOS test notes per school and page, film-style; a volunteer could take either.
- **Screen-reader pass (from PR 96).** Parity and `aria-hidden` rules are enforced by guards, but no human screen-reader audit across the seven schools is recorded.
- **Mermaid render check (from PR 96).** The README charts were never rendered before PR 96 merged; add a check that they parse, to `npm run verify` (which CI now runs) so they stay valid as they change.
- **Vaporwave's pressed task button** switches instantly on an in-school swap (no animation on its group); alternative is a 250 ms fade of the pressed button. Founder: "address later". The pair stage has passed; decide it in the re-review.
- **Root pages inline 1 to 2 KB of unused Astro view-transition keyframes** (inert; the router's CSS was bundled with quiet's Header). Fixing it moves live CSS files, so it waits for a quiet moment with a before/after pixel diff (`scripts/themes/diff-captures.mjs`).
- **Front door.** `/lab/bdl-010` is a 404 by design, every `/t/` page is noindex and shares the generic Experiment share card, so a pasted Portal link unfurls anonymously. See "WOW slate" (fan deck).

**Stage 4 leftovers (pair A, swiss and bauhaus; #95).** Stretch interactables not built, and always in per the founder: the swiss width dial (drag "Design" to change Archivo's width) and the bauhaus questionnaire card; pick up in Stage 6. The bauhaus `?bh-assembly=b|c` switch still ships (`a` is the default): founder 10-04-26, "i still haven't locked in a bauhaus pick, let's keep that option open please" (`theme-schools-research/tier3-stage5/stage5-decisions.md`, on `feat/theme-schools-tier3-stage5`). The end state is still to pick a feel, make it the default and remove the switch. Nitpicks: the bauhaus Services diagonal reads as a slash rather than a cross; swiss dark Home has two red bands close together. The bauhaus lab-band typophoto trial is dropped until a case study has a real photograph.

**Stage 6 leftovers (11-21-26, `feat/theme-schools-tier3-stage6`).** Minors the founder sent to the backlog at stop 5 (`tier3-stage6/stop5-critique.md`): the bauhaus corner square's hover lift scales with the corner's width instead of a fixed 4px (`bauhaus/theme.css` around 512); the swiss Contact hero's pressed edge is missing in the page margins (a transient 1.03:1, swiss `theme.css` around 535); a weak "no paper strip" check in `scripts/themes/stage6/w4-t29-fix1.mjs` (around 113); the cottagecore seed stagger counts unseated points, so births are uneven (`cottagecore/fx.ts` around 1259). **Copy pass:** the shared About copy (`src/content/copy/about.yaml` lines 21 and 32, "one man", "taught him") is gendered and singular against the unnamed-studio voice (flagged by two stop 4 critics; founder territory).

**Founder iPhone pass (checklist, end of run).** Accumulated across Stages 3 to 5: glass and vaporwave interactables after deploy, bauhaus shape dragging by touch, bauhaus press states on iOS Safari, the swiss grid key held by touch, Stage 5's phone fireflies and touch-scroll seeds.

### README charts to 11 · IN FLIGHT (feat/readme-charts)

Founder, 11-17-26: "those mermaid charts are cool but can we ... turn the WOW to 11 on them"; picked option C: the five structural charts generated from their Mermaid source into brand SVGs (light, dark, phone; motion once, then still), plus two hand-composed showpieces (the Portal, seven school panels in their own palettes and type; the Timeline, a birch trunk). Spec `docs/superpowers/specs/2026-11-17-readme-charts.md` and builder `scripts/readme/charts/` on that branch; a drift test fails `npm run verify` when a chart is stale. Owed before its PR: a look on github.com (fonts, picture swap, when motion plays) and a founder fiddle round. It also covers most of the "Mermaid render check" item below (`scripts/readme/mermaid-check.mjs`).

### BDL-012 · The Data Map · SHIPPED 11-16-26 (#106)

The C&C owner-facing data map rebuilt as a Lab experiment in the studio voice, with BDL-005 refreshed in the same PR (ticketing copy, a map link, a miniature). Founder call: Lab over an anonymized copy on the share site, because BDL-005 already names the client and the owners cleared that page. Founder-approved as built, including the full copy pass (`docs/bdl-012-copy-pass.md`, all recommendations applied) and a real iPhone and Android pass (pinch, scroll-versus-pan hand-off, Safari double-tap: all fine).

- **Differs from the owners' copy on purpose:** visitor-facing voice; Plant deck art only; no prices, venue, addresses, rate-limit numbers or key scopes; no event flyer. The rules are at the top of `src/experiments/bdl-012/data.ts`; `tests/bdl-012-data.test.ts` enforces the checkable ones.
- **Lab additions:** Plain English / Under the hood switch, attract mode, a ticket desk and bingo caller you can drive, `?play=` deep links, its own OG card (`scripts/og/capture-bdl-012.mjs`), a phone camera on the main map, drawers per box, a noscript still (`scripts/lab/capture-bdl-012-still.mjs`; **re-run after any change to the map**). Probes: `scripts/lab/probe-bdl-012.mjs`, `probe-bdl-012-desk.mjs`.
- **Wall label docks in the plate strip on this page** (CSS at the top of `Experiment.astro`'s style block), because a fixed label covers body copy on a long page. If the Lab theme pass moves placard furniture, this override goes with it.
- **A study's registered extra may carry its own script** (BDL-005's miniature is the first); the layout and narrative still ship none.
- **Social takes:** four 4:5 journey takes (publish, ticket, game, form) rendered on the GPU from the built site by `social/scripts/render-bdl-012.mjs` after the copy pass, checked frame by frame, founder-approved, not posted (social is parked; see `docs/socials-backlog.md`). Files `V012-*-PT-*s.mp4` sit in gitignored `social/out/review/`. The square cut, sold-out close-up and loop were not picked. The OG card was not re-shot (its map is unchanged).
- **Only deployed things get described** (see the BDL-005 clearance entry).

### BDL-009 · Bayou Kitchen · LIVE as a menu-honesty genre study (09-23-26), order half blocked

Published as a working specimen (deployed at `https://demo-bayou-kitchen.birchdesignlab.workers.dev`) arguing the menu alone. The order-taking section is unwritten and blocked on a founder decision: **whether to enable ordering in Stripe test mode** (the right target, since it produces a real authorization and webhook). A second prerequisite is an access application for the kitchen screen, without which "the kitchen taps Accept and that is the moment the customer is charged" cannot be verified. If the answer is no, BDL-009 stays menu-only until a specimen can take an order. Today the specimen takes no orders: checkout rejects every request at the bot-verification gate, no card has been authorized, the kitchen board holds nothing. `tech` omits `stripe` and `durable-objects` for that reason.

**Never claim, on any version of this page:** that a card is authorized at checkout, that an unacknowledged order releases its hold, that an unverified request is prevented from holding a card, that the audit runs against the served build, that every page scores in the high 90s (SEO is 66-69 permanently, by noindex design), that accessibility is perfect, that a locked-down business type cannot leak a marketing script, that the contact form delivers mail (its sender is on a reserved `.example` domain), that SMS works, or that the Spanish site is complete.

**Verified, unused, waiting for that section:** checkout recomputes every price from the menu; the contact endpoint rejects cross-origin POSTs first; the kitchen board fails shut (401); bot verification is enforced server-side and is deliberately stricter at checkout than on the contact form, the most defensible security claim available.

### BDL-008 · Magnolia & Mane · SHIPPED 09-05-26 (genre study)

Genre study of a Gulf Coast salon site, live at `/lab/bdl-008`; the specimen (`https://demo-magnolia-mane-salon.birchdesignlab.workers.dev`) is deliberately `noindex`. Its first draft's false claims were rewritten against the deployed specimen, not copy-edited: booking (one Cal.com iframe behind a reveal button, no per-service durations), consent (the specimen ships opt-out and says so), and "nothing phoning home" (a first-party `POST /api/counter` fires on load; the zero-third-party-scripts claim stands separately). Two live-page errors were corrected in #85 (the translation does not reach the English-only legal routes; "perfect SEO" is false because the deployed specimen is noindexed). The Vietnamese is demo-grade with no native-speaker pass, which the page states. The publish-time confidentiality check was performed, with zero hits.

**Still owed.**
- **Lighthouse on the deployed specimen.** The page claims every build clears 95 / 95 / 95, true of the enforced budget in the specimen's `lighthouserc.cjs`, not of a run on 09-05-26. Both demos also point canonical and share image at dead `.example` hosts, and Bayou's hero is about 800 KB. Real imagery would also allow a fuller hero crop.
- **Two accessibility defects in the specimens' shared chrome, byte-identical on both:** the About-section link at 4.23 contrast (`#b5502d` on `#f1eae0`, against a 4.5 threshold), and `role="button"` on a `<label>` in the mobile nav toggle. They belong upstream and will reach real client sites.
- **The plate tick orphans** when a long hostname wraps; a baseline-aligned flex row made it worse (reverted 09-06-26; the "same line" check also lied under flex). The real options are design choices, not CSS: move the tick beside the "Living specimen" label, lead with it, or shorten the displayed URL. Founder call; BDL-009 hits it too.

### BDL-007 · The Shining Tree · SHIPPED 08-18-26

Interactive three.js stage for the organic 3D wordmark, live at `/lab/bdl-007`, featured on home via the three-newest rule. Weighted drag/flick/zoom, breathing moss, 40 fireflies that gather after stillness. Shipped timings differ from the spec (60 s idle yaw, 20 s breath, 20 s gather); read the code for what ships. Spec `docs/superpowers/specs/2026-08-18-bdl-007-shining-tree-design.md`; plan `docs/archive/superpowers/plans/2026-08-18-bdl-007-shining-tree.md`.

**All closed.** Mobile framing, aware of aspect (#48, #66). Cache headers, keyboard path (arrows/zoom/reset, `role=application`; #56, #63), live `reduceMotion`, the gltf leak, and GPU cuts (pixel ratio 1.5, 30 fps ambient throttle; #59) landed 08-23-26. **Flick momentum is now dt-scaled, so a 120 Hz flick coasts the same (c8f5642, #110, 11-17-26; `stage.ts`).** Verified in real Chrome; the preview pane cannot composite WebGL.

Two non-obvious model facts: the glb declares `EXT_mesh_gpu_instancing`, so surface sampling must go through `getMatrixAt` (the base geometry gives node pivots buried inside the letterforms); and a uniform added through `onBeforeCompile` must be declared in the GLSL by hand or the shader fails with no JS signal. Material names mislead: `canopy` is the moss and lichen cover, `stone` is the bark face.

## AR card

The WebAR business card system. Merged here 08-26-26 from `docs/ar-card/BACKLOG.md`. Context and architecture stay in `docs/ar-card/HANDOFF.md`, which a session on this project reads first. History stays inline (strikethrough + DONE), never deleted.

### Decision gates

- [x] ~~**Get a Google Voice number and put it on the card.**~~ **DONE 08-27-26.** The card carries a Google Voice number in E.164, so `buildVcf` emits a `TEL`. Kept as a decision not to relitigate: putting a personal mobile in as a stopgap was **declined** (a vCard cannot be edited after someone saves it; the number would stay in git history; a personal mobile reverse-looks-up to a name, against the identity constraint). If a second number is needed, get another Voice line.
- [x] ~~**Choose + wire the tier 1 channel path.**~~ **DONE 08-28-26.** `/greetings` = tier 1 wood (AR card prompt pack v4, `docs/bdl-ar-card-prompt-pack-v4.md`; `src/pages/greetings.astro`, channel `wood`, excluded from the sitemap). The page is built and wired; **which path the etched card prints is deliberately undecided until etch time.** **Still a one-way gate: etching the URL into wood.** Do not order a run before the AR experience at least reaches the stubbed state `/hello` is in. Wood design does not exist yet.
- [ ] **Durable beacon storage.** Analytics Engine retention is about 3 months. **Interim: `scripts/analytics/export-card-scans.mjs` (#107, 11-17-26)**, re-run before ~01-23-27 (see Open gates). Decide in the analytics task below whether per-tier totals need a durable store (aggregate on a schedule, or D1/KV).

### Tasks

- [x] **Landing page — DONE-WITH-CAVEAT 08-25-26, restyled 08-26-26.** `src/components/CardLanding.astro`, rendered by `/hello` (kraft) and `/showcase` (the Cheer and Chatter break-screen QR). Caveat: AR stubbed (`AR_ENABLED: false`, no AR UI). vCard downloads client-side, beacon fires and fails silent, interactive under 2 s on 4G. Marcellus is inlined as a woff2 subset (built page 21.9 KB, 13.3 KB gzipped, one round trip); the header comment has the reasoning.
- [ ] **AR scene (multi-target).** Anchors for every target index in the compiled `cards.mind` (derived from the file), each triggering the identical logo experience: rise-from-card, tap-to-open portfolio panels, clean teardown on close and on switching targets. Lazy-loaded from `src/ar/`, built to `public/ar/card-ar.js`, behind a user tap from the landing's `#ar-root` mount. Card channels only (`/hello`, `/greetings`), never `/showcase`. Acceptance: any compiled design locks and behaves identically; no orphaned Three.js objects. The landing has a lazy import stub for a file that does not exist yet.
- [ ] **Asset pipeline + tracking harness.** `scripts/ar-card/` crunches the logo GLB under budget (see the perf-budget flag in `HANDOFF.md`: whether 1.5 MB is assets-only or assets plus framework; the vendored MindAR and three 0.160, about 3.9 MB, have no consumer yet and the site's three is 0.186); multiple source images (QR zone flattened to solid fill, compiled from vector art, not photos) into one `public/ar/assets/cards.mind`; a dev harness (`/dev/track` or similar) reporting fps and time-to-first-lock per target index; update the Target inventory in `HANDOFF.md` on every design change. Acceptance: each target locks under 2 s at 20-60 cm indoor light. Per-lead custom AR and card easter eggs exist only in the gitignored prompt pack, not in any tracked doc.
- [x] ~~**NFC batch writer.**~~ **DROPPED 08-26-26.** Wood cards cannot be sourced with chips; every card is QR.
- [ ] **Analytics endpoint + stats view.** The beacon (`POST /api/beacon`, `{ts, channel}`, no PII, fail-silent) shipped 08-25-26. Open: a stats view (totals by channel, by day), a channel allowlist and rate limit without storing raw IPs (any caller can write any channel today), and the durable-storage decision. **The privacy page omits this beacon** (see "Privacy page").
- [ ] **QA + hardening pass.** Produces `docs/ar-card/TESTING.md`: device matrix (recent and older iPhone Safari, mid-tier Android Chrome, low-power mode), the multi-target tracking protocol from the dev harness (every compiled target locks under 2 s), camera deny/re-grant, vCard import on both platforms, `prefers-reduced-motion` end to end (skip the particle burst, shorten the rise animation), offline/asset-failure state with retry, an error boundary around AR init that lands users back on the working landing page, Lighthouse >= 90 performance on the landing. Known deliberate layout gaps from the 08-26-26 restyle: at 320 px wide one action falls below the fold and in landscape two do (landscape wants two columns, mark beside the text; fixing 320 means shrinking the mark the founder asked to enlarge). Portrait phones from 375x667 up fit all three.
- [ ] **Point the Cheer and Chatter showcase QR at `/showcase`.** The change is in the C&C repo (`assets/brand/sponsor-card/qr-birchdesignlab.svg` here is the BDL-side artwork). Until then `showcase` reads zero scans, which is correct, not broken. The QR needs the trailing slash.

### Nice-to-have

- [ ] Dedicated OG card for the landing (`scripts/og/` manifest entry); it reuses `/og/home.png`, which unfurls fine.

## Branded client documents

How BDL produces documents it sends to clients: proposals, quotes, reviews, estimates, the price sheet. One branded face, one render path, so a new document is written rather than assembled. Started 09-03-26; reusable internal tooling, ingested from two proven Cheer & Chatter approaches and generalized. The price sheet was the first document through it, not the point of it.

**The shape, as built.** A new document is a content file and nothing else.

- **`scripts/docs/check-pages.mjs <doc.html>`** measures every `.page` for clipped overflow and shoots each one; **`build-pdf.mjs <doc.html> [out.pdf]`** renders. Run the checker first: `.page` is `overflow:hidden`, so overflow is clipped, nothing errors, and the only print signal is text colliding with the footer.
- **`docs/_letterhead/`** is the shared face: `letterhead.css` (skeleton, role tokens) plus `theme-day.css` and `theme-night.css`. A document links theme, skeleton, then its own thin CSS (`docs/pricing/pricing.css` is the model: two column widths).
- **The wordmark is injected at render time** (`scripts/docs/letterhead.mjs`) from `assets/brand/logos/files/8b-horizontal-{day,night}.svg` into empty `<div class="letterhead" data-for="...">` placeholders; `<body data-letterhead="night">` picks the face. Opened straight in a browser, the letterhead is empty; expected.
- **Source material:** `scripts/docs/reference/cheer-chatter/` (three original scripts, byte-identical, plus a README).

### Tasks

- [ ] **Port `build-manual-docx.mjs`** once a real DOCX deliverable is needed (likely the one-page proposal template, §9.5 of the services handoff). `docx` stays out of `package.json` per the source repo's reasoning; a scratch `NODE_PATH` install is the pattern.
- [x] ~~**Prove the letterhead on a second document.**~~ **DONE (verified 11-17-26 on disk):** a second, client-facing document (untracked, under `docs/briefs/`) renders through `docs/_letterhead/`. The split held; revisit the shared/doc-specific boundary only if a third document strains it.
- [ ] **Decide the light/dark selection rule.** The price sheet has both faces; no rule yet for which goes out by default (night for pitch decks and leave-behinds, day for print-and-read?).
- [ ] **Back up the one-disk documents.** The briefs and the price-sheet PDFs exist only on this machine (accepted risk 11-17-26: no external copy). The price-sheet source survives only in git history.

## Prod ops notes

### 08-19-26 — Safari "connection is not private" report

A visitor got Safari's certificate warning on birchdesignlab.com. Investigated same day: the live cert was valid from outside (Google Trust Services, SANs cover apex, wildcard and www; chain verifies; apex 200, www 301). Outcome: most likely the visitor's network re-signing HTTPS. For any repeat report the decisive tell is the warning cert's Issuer: a known filter or firewall vendor is benign, a self-signed or unknown CA is the network owner's problem. Ask for the exact URL, Wi-Fi versus cellular, and the device date before touching Cloudflare SSL/TLS. A visitor's network is never ours to probe.

### 11-17-26 — Lighthouse, Bot Fight Mode

First re-measure since 08-19-26: `scripts/lighthouse/run.mjs`, results in `docs/lighthouse/2026-11-17/summary.md` (mobile, median of 3, five business pages). Performance 99, accessibility 100, SEO 100 (66 on `/contact/sent/`, its intentional noindex), CLS 0.000 everywhere. **Best practices is 82 on every page, one cause:** Cloudflare's JavaScript detections inject `/cdn-cgi/challenge-platform/scripts/jsd/main.js`, which touches deprecated APIs. Bot Fight Mode is left off, but the JS detections still inject and the Free plan cannot toggle them. **Accepted 11-17-26**; revisit only if the plan changes.

### 11-17-26 — Contact safety net (#111)

`/api/contact` now runs honeypot, per-IP rate limit, validation, a **daily cap** (40, soft, fails open), then email. A failed send is **held in KV** (`CONTACT_KV`) and a **daily cron** (`17 14 * * *`) retries it, so a lead is never lost (`worker/index.ts`, `wrangler.jsonc`). No Turnstile, by decision. Owed from this: the privacy page should mention KV-held failed sends (founder copy), and the dashboard alerts (Worker errors, failed builds) are the founder's clicks, not code.

## Concepts, ranked by projected effort (lowest first)

1. **~~BDL-004 · The Loom~~ · RETIRED 2026-07-29.** Built, shipped, then pulled: founder verdict visually unacceptable, redo unlikely. Lives in `attic/bdl-004/` with a resurrection note; out of the site, registry and tests. Spec: `docs/archive/superpowers/specs/2026-07-16-bdl-004-the-loom-design.md`. (`attic/` README paths are stale.)
2. **The Orrery · artistic · mobile-native.** A working solar system at real ephemeris accuracy; drag time across centuries; brass-and-ink instrument aesthetic. Effort is in the Kepler-element math (unit-testable) and making the scrub feel like handling an instrument.
3. **The Type Instrument · technical · desktop-forward.** Sibling of the styleguide for typography: paste text, play with scale, pairing, measure, leading; copy tokens out. Model: full internal tool first, a curated public room when the controls prove interesting. The one deliberate reusable tool in this batch (every client site needs type decisions). Mobile gets a reduced view (DeviceBadge treatment).
4. **The Software Renderer · technical · mobile-usable.** A 3D scene rasterized from scratch on canvas2D: projection, z-buffer, lighting, all readable. Low-poly for phones. Needs art direction. (Parked or killed on purpose unless a slot opens.)
5. **The Painting · technical · mobile-usable.** The view-source CSS feat: one museum-grade illustration in pure CSS (no images, no SVG, no JS), hundreds of hand-placed gradients and shadows, commented, human stylesheet; the gasp is in devtools. Subject parked until spec time; lean into gradient and shadow, maximize the flex. Most expensive item here; the museum-grade bar set by 003 applies in full.

**Shelved, liked, not dead.** **Tonight's Sky** (UNSHELVED 2026-08-03: star chart of the visitor's actual sky; overlaps the Orrery, so sequence them). **One Kilobyte** (an entire experiment under 1024 bytes with a live counter; someday treat).

## Standing direction (founder sessions, 07-29 to 08-13-26)

- **The Lab is the entire portfolio**: experiments plus studies of client work. `docs/archive/lab-architecture-handoff.md` (experiment/study split, accession numbers, filterable catalogue) is the live starting point, NOT stale; reconcile with the shipped schema when building. First case study: Cheer and Chatter (BDL-005); the director's-commentary voice is part of the format. The client said at the time publishing "basically anything short of extremely personal details" was fine; the later, narrower BDL-005 clearance below is the one that binds. Fictional genre studies are experiments (11-17-26).
- **The Lab rolls heavy** (08-03-26). Founder, verbatim: *"we need to roll heavy in the lab... smack people in the face with technical and artistic flex."* The test is what a **non-technical** visitor feels in the first five seconds. Grounds for revisiting shipped pieces. **Permission prompts are allowed** ("the lab is the lab and the lab is free"): location, camera, mic, accelerometer; design the prompt moment deliberately.
- **The animation line is redrawn** (08-13-26). Quiet luxury names the business pages (Lighthouse 100s, restrained, no heavy motion); **the Lab is unbound**: GSAP (approved, not installed) and anything else, "any and everything to flex technically", for every experiment. GSAP stays banned from the core site. In the C&C live app the slideshow screen is the one animated surface (zero animation elsewhere there), and the BDL slide rides it.
- **No one-colour mark, deliberately** (08-13-26). Single-colour versions were explored and none worked; the two overlapping strokes are the idea. Accepted cost: nothing to print or stamp in one ink. Do not reopen as an oversight.
- **BDL-003 gate** (07-29-26). Novgorod Letters needs a **complete visual rework** before the hand-trace pass is worth sitting down for; strokes are placeholder scribble, no page is generated. It survives as a thematic lynchpin. The WOW slate proposes reviving it as "Onfim".
- **Conversion path first, whole-hog copy pass wanted.** Copy is founder-led with mechanical support (the founder does not consider Claude Code the tool for good creative writing); sequencing is after the Lab and Stage 5 work.
- **No individual is named anywhere on the site** (founder constraint, 08-18-26). One register, an unnamed studio "we", keeps the accountability promise without "I". **About's biographical specifics stay under review** (open; founder copy call).
- **Brand kit status.** The 08-08 mark set, lockups and sponsor card were a bridge, the founder disliked them, and they are superseded, not shipping (so is the Cheer and Chatter brand kit copied from them). **Unconfirmed: whether the Cheer and Chatter re-export onto the locked mark has happened; check the C&C repo.**

### The Lab's four design passes

Recorded because the frames were once downloaded, deleted, and unreferenced, and recovering them cost a session. **Project** `027db389-4762-4e10-9ccd-6ab6a7752652` (files `CatalogFrame.dc.html`, `Lab Density Pass.dc.html`, `Lab Accent Pass.dc.html`); **design system** `birch-design-lab-design-system-9084dec9-3437-4b45-9433-4ff780cc0cf9`.

| Pass | State |
|---|---|
| Density | **Shipped 07-30-26** (`c9186df`), the loose variant |
| Accent | **Shipped 08-13-26**, the loud variant (frame 1c) |
| Texture | **Never drawn.** Stages still show placeholder treatment. |
| Motion | **Never drawn**, and grown: the Lab's presentation language, entrance beats, transition grammar, motion budget, GSAP available |

*"Loud accents with the relaxed spacing"* is the founder's summary of the first two. Spec and plan: `docs/superpowers/specs/2026-08-13-lab-accent-pass-design.md`, `docs/archive/superpowers/plans/2026-08-13-lab-accent-pass.md`. Not to relitigate: the forthcoming chip keeps the word "forthcoming" (a claim about right now has to stay true through quiet weeks); the working dash is sized in `em` on purpose.

## WOW slate (from the 11-16-26 inventory)

36 ideas were generated and scored by three judges; the report is gitignored, so the slate that matters is here. Founder picks which ones; nothing builds without a go. In dependency order, after Stage 5:

1. **Contact Photo in the vCard** (S; ships first, real-device test on both platforms): the mark on bark as the saved contact's photo. **Decide the card trio before the wood etch:** numbered "Edition of Fifty" trees and "The Card Unfolds" (laser char at card scale, per-card cost, and per-card paths against the per-tier-only analytics decision).
2. **Portal front door** (M-L): "Fan Deck" plus "Your Name, Seven Coats" (type a business name, each chip wears it, tap to bloom into the live Portal, end on a prefilled contact link; on-device only). Also gives `/t/` a share card.
3. **BDL-001 revisit** (the bark engine page is the destination of the home bark credit; untouched since 07-16: a seed box and sliders; typing a seed skips the grow animation, a nit).
4. **Lab presentation layer** (motion/GSAP, texture, identity), before any new showpiece.
5. **Stage 6** and the two stretch interactables; **BDL-003 rework as "Onfim"** (reference tracings are in the gitignored `docs/refs/bdl-003/`); **BDL-011 Field Guide** (a front-matter stub; `studyExtras` is empty; the switcher's "how these were built" link stays hidden until it is live); the **AR scene**; **transitions** ("The Seam", a draggable split between two schools, doubles as the filming rig).
6. **Candidates for slots:** Be My Customer, Thirteen Days to Sold Out (use owner-cleared milestones, never commit counts), The Sealed Letter (ships with alerting; it intercepts the only lead path), Firefly Jar, Carved in the Bark 404, Climbing the Trunk (needs the trailing-slash fix, done, and a 2D still for Safari).
- **Ruled out:** a wallet pass and a commit-pattern ledger (identity exposure), auto-generated sites, race-your-site, live-presence features (an empty tree), a camera prompt for a sheen.

## Parked site notes (not experiments)

- **Bark peel.** Tap becomes the shed trigger on the living bark; its own round on the bark engine.
- **Lab visual identity and presentation ceiling.** The Lab will branch from the professional theme and grow its own style (also handoff open thread 4); decide before it has many live pieces, since each experiment inherits site tokens. The 07-16 awwwards browse found the concepts' substance strong and their arrival, motion and material feel modest; define entrance beats, transition grammar and a motion budget (optionally preceded by a session naming which techniques to steal). Founder installed a front-end design plugin for this.
- **Per-experiment OG art.** BDL-012 has its own; the rest share the catalogue's. Threshold was about a dozen live pieces. **Daily OG rebuild** (deploy hook on a cron) only matters if platform OG caching ever stops making it moot.
- **Copy pass on the business pages (redo).** The 07-16 pass is judged weak; founder wants a quality rewrite over home/services/about/contact, first-draft until then. The 08-28 review (`docs/birch-design-lab-copy-review.md`, gitignored, one disk) lists 12 "fix before 9/1" blockers and about 20 line edits; privacy fixes landed, the rest did not. After Stage 5; it reflows seven schools by five pages by two schemes. Added 11-17-26 (founder: "pile it in the copy passes"): About's pull quote "Everything here is one person's work" (the hoop in cottagecore) now sits against the README, which dropped "solo" the same day; and cottagecore's two-column cards from 860 to about 1000px set at 30 to 40 characters a line (one column ends at 859 per the founder's B2 answer), so the copy lengths and that breakpoint get one look together.
- **About page design check.** A brief pass against Claude's design guidance; a check, not a rework. Low effort. (About's bark hero uses `lockAspect`, which fixes dash shape, not scale, so About renders a different grain than Home by design; to re-weight it the knob is `density`, not dash width.)
- **BDL-005 optional screenshots.** Both reshoot targets and three additive shots landed in #70. The winner-hold frame goes in alone (the paragraph is about the screen no longer leaving the last winner up, so the hold is the fix and a before/after pair would repeat the beat). **Do not reshoot the announce frame:** it was shot and dropped because it showed the studio's own name in a prize slot on a client's page. Only the installed-PWA look is unshot, plus Sanity Studio captures (event editor, Caller readiness tool) that need the founder's Studio login (log in while a capture session runs and they slot into "The controls they keep"); do them when cheap (the PWA shot doubles as the owed on-device verification). `host-console.png` also shows a localhost URL in frame. Source: `docs/bdl005-refresh-pack-8-26-26.md` (untracked).
- **Privacy page refinement.** `/privacy` shipped 08-19-26; first draft, founder voice-and-legal pass owed. Waiting on: (1) the GA retention setting, confirmed in GA Admin; (2) a Google Ads clause once Ads goes live; (3) a legal read if a client has compliance needs. **New 11-17-26:** it says it lists everything but omits the card-scan beacon, and it should mention **KV-held failed contact sends** (founder copy). File: `src/pages/privacy.astro`.
- **Curator's note placards on studies.** Optional `note` field on the study schema, rendered as a wall-label near the plate. Decide during the Lab theme pass, which owns placard furniture.
- **Theme-pass triage.** Extract the shared chrome-free shell (StudyLayout duplicates ExperimentLayout's hatch/head; the hatch pill has two sources of truth); an `aria-live` count on the catalogue filter; a deliberate empty state for `/lab/studies`; the study loud band ships static, the theme pass decides its motion; capture study heroes at 1920px+; `bdl-006` runs h1 to h3 and the styleguide's h1 is a styled `p`.
- **MDX for study narratives, post-theming** (founder, 07-29-26): studies stay plain markdown until after the theme pass.
- **Brand mark LOCKED 08-13-26 (adoption DONE).** A stem with two chevron branches drawn twice at a 12 px offset: one stroke neutral, one canopy green, screen-blended on charcoal and multiplied on paper. Not horizontal dashes (every earlier candidate was). Files in `assets/brand/logos/`; outcome at the foot of `docs/brand-brief.md`. **Adoption is closed:** favicon, `icon-512`, manifest and the Organization `logo` use the mark (`public/`, `src/lib/seo/organization.ts`, #65); the three-dash placeholder is retired; header, footer and OG cards are the wordmark by design (brief: wordmark at 84 px). The mark is for social and paperwork. The asset pipeline is scripted and re-runnable: `scripts/brand/outline-logo-text.mjs` (**run first after any re-export**, or marks render in a fallback serif), `inline-logo-animations.mjs`, `rasterize-logos.mjs` (refuses live `<text>` or a dropped blend); `assets/brand/logos/README.md` is the manual.
- **Hand-synced copies, none blocking.** `public/site.webmanifest` is static JSON and a third copy of the description (home meta and `organization.ts` derive from `SITE_DESCRIPTION`, `src/lib/seo/site.ts`); it also hardcodes `512x512` against the OG logo size. `scripts/og/` logo exports exist for pixel tests that check self-consistency rather than fidelity to `favicon.svg` (the fix is a test that parses the SVG's rects). Nothing automated covers `StructuredData.astro`, the head slot, or home-only JSON-LD placement.
- **Reusable and small, from the inventory.** The phone-shot importer (`scripts/import-phone-shots.mjs`) blurs the on-TV pairing line with a weak blur: **harden it before the next reshoot**. **No LICENSE** on a public repo that invites contributions (founder call). **Dependabot alerts look disabled** (API 404, may be a permissions artefact). Lab layouts are not Latin-subset (CSS hygiene, not bytes; check the styleguide before trimming). Crawler housekeeping: no `favicon.ico`, `security.txt`, sitemap lastmod or theme-color meta; the sitemap filter hardcodes one noindex slug; `/styleguide` ships to production. Test holes: nothing covers the Regulator, the BDL-007 controls, the `BarkEngine` component, `_headers`, `seo/jsonld` or the studies registry.

### 08-28-26 — what the BDL-005 page is allowed to say about the client

Kept here because clearance gets lost in a merged PR body.

- **Owner-cleared:** the sixty presold tickets and the door walk-ups selling out at the second venue (#70). Anything further about their gate, pricing or headcount is not cleared; ask again.
- **The venue is not named and is not blamed.** The 08-20 lag was diagnosed to the iPad mirroring link, not the app; the page keeps the exoneration and the hardening, and states the constraint (screens out of reach, no borrowable HDMI, one bar of borrowed wifi) because it is the reason for the two-device design.
- **The numbers in "The shape of the work" are a dated snapshot with a fixed basis.** Re-pulled 11-16-26 with BDL-012: 815 commits / 245 merged PRs / 701 tests / 33,056 LOC at C&C `main` 11-11-26 (`e88ad3d`). LOC basis: tracked files, extensions `.ts/.tsx/.astro/.mjs/.css/.py`, under `src/` `scripts/` `tests/` `studio/` `workers/` plus root config; excludes docs, lockfile, dist, assets, binaries; tests are `vitest list` (counted, not run). BDL-012's closing figures are the same pull, and `src/studies/bdl-005/Extra.astro` draws the four figures plus commits by month: **refresh all three together, or none.** The page dates the figures in prose ("As of November 2026") because the frontmatter date stays the delivery date; keep that.
- **Only what is deployed gets described.** The C&C repo holds a nightly sold-out reconcile route and a cron Worker written but held (as of 11-16-26: PR #240 open, the cron Worker never deployed, the nightly rebuild runs from a GitHub Actions schedule); check the running system or the latest C&C handoff before a claim lands.
- **Testimonial.** The top trust lever (08-18-26 audit). Decision: the client quote goes inside the BDL-005 specimen as a pull-quote, not a testimonials page. Blocked on the founder asking the client; a five-minute ask.

## Dependencies: newest stable, secure

Policy in `CLAUDE.md`. **Done:** Astro 7, `@astrojs/svelte` 9 and zod 4 (09-22-26, pixel-diffed against the Astro 5 build; two regressions fixed in `astro.config.mjs`: `compressHTML` pinned `true`, and a CSS-restore plugin to delete when Astro restores via `emitFile`). **In-range updates 11-17-26 (#113):** Astro 7.4.12 (Vite 8 underneath, so it got the major verification), wrangler 4.164, vitest 5.1; verify and a browser pass clean.

- **Held back: TypeScript 7.0.** No classic compiler API, and `@astrojs/check` 0.9.x peers on `typescript ^5 || ^6`; on TS 7 the typecheck gate would not run. Pinned to **6.0.x**. Revisit when `@astrojs/check` supports TS 7.
- **Open advisories, triaged.** `npm audit` still lists findings, mostly dev tooling. The Astro-5-era advisories are unreachable here (static output; no `define:vars`, spread props, `server:defer` or SSR). **picomatch ReDoS: triaged unreachable (11-17-26),** a build-time glob dependency that never sees untrusted patterns. Never `npm audit fix --force`.
- **Check on every Astro upgrade (the Portal leans on Astro internals):** `loadWarmed` in `src/themes/portal/runtime.ts` stands in for Astro's loader on a warmed swap; the arriving wordmark is found by matching Astro's inline `transition:name` style text (a change silently breaks the scrolled-swap fix); Astro's `@layer astro` wordmark fade (180 ms) is overridden by the README's `inherit` recipe (re-run `harness/stage-gates.mjs --steps wordmark`). None has a test.
- **Workarounds with an expiry:** the CSS-restore plugin, the Draco pruner (`astro.config.mjs`), the `compressHTML` pin, the TypeScript 6 pin.

## SEO and site quality

The 08-18-26 audit's plumbing all shipped (indexing, canonicals, BreadcrumbList and Service JSON-LD, focusable `main` and skip links, theme-toggle state, OG alt, immutable `/_astro/*` cache and a bounded `/draco/*` rule, `SITE_DESCRIPTION` de-dup, Latin-only business-page fonts, serialized JSON-LD); history is `docs/archive/handoff-8-19-26.md`. **Closed and verified against main 11-17-26:** voice unified to an unnamed studio "we"; geography and credibility lines; home links to `/services/` and `/contact/`; the Lab filter chips are real links; `/models/*` cache (the glb is content-hashed under `/_astro/`); **`sameAs`** (Instagram and Facebook in `SOCIAL_PROFILES`, `src/lib/seo/site.ts`, feeding footer links and structured data, 1c1f418); **name the bark** (the home hero carries the slashed `BarkCredit` linking BDL-001, #112); **`CreativeWork`** on every indexable Lab page (`src/pages/lab/[slug].astro`); **font preload and metric fallback** (preload 08-28-26; fontaine generates `Marcellus fallback` and `Spectral fallback` with `size-adjust` at build, `astro.config.mjs`; CLS 0.000 on all five pages in the 11-17 baseline); **Cloudflare Web Analytics beacon** (live, verified 10-22-26, `docs/analytics.md`); **slashless links** (every link now carries the trailing slash, #110; the 307 hop is gone); **provisional-copy markers** (gone from `src`); **titles** (home and services are query-first: `src/content/copy/home.yaml`, `services.yaml`); `WebSite` JSON-LD (no `SearchAction`, because there is no site search) and `og:locale`. **Declined with reasons:** markdown content negotiation and `llms.txt` (no major crawler uses them; keep `robots.txt` allowing every crawler, retrieval bots especially). **Accepted:** the bdl-007 keyboard question is moot, since the keyboard path shipped.

**Gulf Coast positioning (08-28-26, founder call).** The meta description names the region and the model in the founder's words (`SITE_DESCRIPTION`; 187 characters, the second sentence clips in results, accepted). The home node is `ProfessionalService` with `areaServed` "Mississippi Gulf Coast"; `/services` is a plain `Service` naming it as provider. `address`, `telephone` and `founder` stay absent (identity call unchanged); Search Console's LocalBusiness report will flag a missing `address`, which is accepted.

### Founder territory, still open

- **Google Business Profile and the NAP problem** (highest leverage; an identity-surface call, see Open gates). Local SEO runs on consistent name, address and phone, none of which is published on purpose. A service-area business can hide the street address but Google still verifies a real one, and reviews cannot start until the profile exists. The phone exists (the Voice line on the card); only the business pages publish none. Resolve how much identity surface is acceptable, or defer knowingly.
- **Copy pass items (not started).** The title tag carries the query, so H1s keep the voice. The first 100 words of `/services` should contain the query. One plain-words `<h2>` per page. Name the towns once, naturally, in one honest sentence (no town is named anywhere today). `/services` could carry 200 to 300 more words; pages run 394 to 675. "Answers when you call" sits oddly while the business pages publish no number (a copy call). A segment phrase on the money pages.
- **Page architecture.** The zip-code doorway version would poison the brand; the defensible version is a few genuinely distinct pages on the verticals the copy names (restaurants, charters, venues). Three good pages beat thirty thin ones.
- **Proof lines.** **Home proof line DONE 11-17-26:** "One recent build went live on day thirteen. Its first nights sold out." (`src/content/copy/home.yaml`, #112; the home keeps the three newest Lab entries, founder call). Still open: a Result row on BDL-005 and a timing sentence on Services.
- **`/contact` right-hand space.** A design note from the 08-18-26 audit's still-open list; only its name was ever recorded. Undesigned; ask the founder what it meant before acting.
- **Pricing posture.** No prices (decided 08-18-26; the founder has a rough base structure from market-asking but will not list it); at most a no-numbers reassurance line ("leave discovery with a fixed number before any commitment"), or drop.
- **Contact context.** A service-area line and a response-time promise on `/contact` or the footer (needs no plan upgrade).
- **About.** The meta description describes a removed section and says "the man behind" (a founder copy call; the founding record's echo is the same family). Titles on About and Contact are fine.
- **Meta Pixel Lead event** on `/sent` and a consent-off check (sensitive: Zaraz; `docs/analytics.md`). The Pixel has been live since 10-22-26, PageView only, so ad spend cannot be tied to inquiries; Reject and Analytics-only paths were never verified.
- **Services H1 could carry the service keyword** (low), and "Studies is plural with one entry" (low; BDL-005 headlines).
- **Code-side, on request, no voice impact:** an internal-linking pass with descriptive anchor text in place of "How we build ->", and an image `alt` audit.

## Social

**Parked by the founder 11-17-26.** A few posts went out; the founder dislikes some of the tone and will revisit later. Q4 question (framing per clip, PHONE or SHORT) stays open: branch `feat/social-q4-screens` stays as it is. Pipeline work items live in `docs/socials-backlog.md`. Retire B2, C4, V005, V029 when it is picked up (the Q4 calendar no longer uses them). Postiz is on hold for Meta app review; posting is manual.

## Housekeeping, after Stage 5 merges

Prune `scripts/themes/.out` (about 20 GB; keep `stage4-after`, the next gate's baseline, and `stage5`), the about 20 `aplus-*-workflow.js` one-offs under `docs/superpowers/specs/theme-schools-research/`, `.superpowers/`, `graphify-out/`, empty dirs, `refs/gbt/snap/*`, and seven unreferenced scripts plus three unused 3D exports. Decide the fate of BDL-001, BDL-002 (designer-facing, fixes only since 07-20) and BDL-006 (noindex, unlisted): rebuild, demote or retire. Tranche 2 schools. The Software Renderer and One Kilobyte only if a slot opens.

## Documented renovation paths

Recorded in the website spec and core plan: contact form via Pages Functions (superseded: the Worker, `docs/deploy.md`), Sanity CMS via a Content Layer loader, Tailwind as a per-island addition, Google Workspace for send-as.
