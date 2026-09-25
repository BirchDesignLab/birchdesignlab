# Lab Backlog

*Experiment concepts agreed 2026-07-16, evening session. Parent documents: founding record, website spec, handoff. BDL-003 Novgorod Letters is specced and in build; everything here comes after. Each concept gets its own spec at its own build time, per house practice.*

*This is the only backlog file. The AR card had its own `docs/ar-card/BACKLOG.md` until 08-26-26; it is merged in below under "AR card" and the file is gone. Its `HANDOFF.md` stays where it is, as the project's context document.*

## Open gates — check before shipping the thing they gate

The one-way doors. Each has its full entry further down; this list exists so a gate cannot be buried in five hundred lines. Nothing goes here unless getting it wrong is expensive to undo.

- **Etch the tier 1 wood card.** Path is chosen and wired (`/greetings`, 08-28-26); the remaining one-way door is ordering the physical etched run. Full entry under AR card, decision gates.

*Closed: the card's phone number (08-27-26).*

## Numbering vs build order

BDL-004 originally reserved the Painting (view-source CSS feat). Reassigned 2026-07-16 evening: the goal right now is quick wins before the link spreads, the Painting is the most expensive item on this page, and 003 is already a heavy build. The Loom takes 004; the Painting returns to the backlog unnumbered and gets a number at its own build time.

## Specimen studies: standing rules

*Pulled forward 09-06-26 from the `docs/specimen-demos-backlog` branch, which
is now deleted. Everything else on that branch had gone stale: it listed
sequenced work that is done, and blockers that are resolved.*

**These are genre studies, not client case studies.** Bayou Kitchen and
Magnolia & Mane are fictional businesses. There is no client and no
engagement to narrate. Frame them that way if they get edited: they argue
what a genre of site should do, using one of our own specimen builds as the
proof. `/lab`'s own blurb was corrected in the same pass, because it used to
define a study as client work.

**Check at publish time what a specimen study is allowed to say.** These
describe how our own specimens are built, which is closer to the line than a
normal experiment writeup. No study may name the framework behind them,
describe it as a shared or reusable spine, or cite build-speed figures
("shipped in N hours because…"). Run the check against the final copy every
time. It is not an assumption inherited from this note, and a draft that read
clean weeks ago is not evidence about the copy being published today. Compare
the standing entry further down on what the BDL-005 page is allowed to say
about its client: same discipline, different subject.

**A fictional specimen's hero is a screenshot.** This supersedes the older
position that photography was a real blocker and that every Lab still must be
shot deliberately. That was written before anyone reckoned with the specimens
being fictional: there is no salon and no restaurant to photograph, and there
never will be. BDL-005 set the precedent that a study hero can be a
screenshot of the site; `scripts/lab/capture-study-hero.mjs` is the committed
tool, and `--clip-to` exists so a shot can stop short of placeholder imagery.

**The actionable version of specimen work lives with the specimens.** Their
own repo's `docs/BACKLOG.md` holds prerequisites, gates and acceptance
criteria. Entries here exist so the Lab side is not lost, not to duplicate
it. (Deliberately not naming that repo or its path here, per the rule above:
this repo is private today, but private is a setting, not a property, and the
name appears nowhere else in it.)

## In flight

### BDL-010 / BDL-011 · The Portal (theme schools) · IN FLIGHT

Current handoff: Stage 3, pair B (glassmorphism and vaporwave),
`docs/superpowers/specs/theme-schools-research/HANDOFF-09-24-26-stage3.md`
(Tier 1 and 2 done; the founder's decisions are in
`tier3-briefs/stage0-decisions.md`). Six tranche-1 schools built 09-23-26
(vaporwave, grandmillennial, glassmorphism, cottagecore, bauhaus, swiss).
Tier 3 Stage 1 (the portal) merged in PR #88 (BDL-010 is a working specimen
in the Lab). Stage 2 (the defect sweep) merged in PR #89 09-24-26; its
wrap-up (the press trigger dropped, final gates, review panel,
`tier3-stage2/stage2-report.md`) is on
`feat/theme-schools-tier3-stage2-wrapup`.

**Stage 2 results (09-24-26).** Every school's repair passes the shared
swap acceptance and the wordmark judge (56 of 56; blank at most 68 ms); the
switcher holds still in 72 of 72 strips. Drawing ahead cuts the first-draw
freeze for a visitor who rests the mouse on a school's row (grandmillennial
432 to 37 ms, cottagecore 396 to 67, dark desktop); a quick click or a phone
tap still gets the full freeze, by the founder's calls (no drawing on a
press or on the page's own links).

**Held for review after Stage 2's wave B (founder, 09-23-26), resolved in
Stage 2.** Four issues looked at together
(`theme-schools-research/tier3-stage2/wave-b.md`, "The held review"):
- Safari (below): still parked; the founder's equipment cannot test it.
- The first-draw freeze: measured (`tier3-stage2/freeze-investigation.md`)
  and reduced by drawing ahead on a 400 ms mouse rest on the switcher.
  What is left goes to the transitions phase: drawing ahead on a school's
  own links (grandmillennial About still holds about 260 ms), and phones,
  which never draw ahead (a tap gets the full freeze).
- The wordmark dropping in from above on a scrolled swap: fixed at the
  portal level for all seven schools. Its mirror, going Back to a scrolled
  page, still morphs toward an off-screen box (older than Stage 2,
  `harness/wm-close-back.mjs`).
- Glassmorphism's plain fade: part of a wider pattern (four schools'
  in-school swaps converged on one safe fade shape). The transitions phase
  gives every school its own gesture, glass's material one first.

**Parked from the Stage 2 start (09-23-26):**
- Safari. The founder's iPhone 17 Pro Max test (Safari, private) found some
  transitions "a little stuttery or buggy". Every film and trace so far is
  Chromium. For the transitions phase: film in WebKit too (Playwright's
  WebKit is a download, and its Windows build is not iOS Safari, so a real
  device pass stays the final word), and check Safari's view-transition
  support for each school's choreography.

**Parked from the Stage 1 stop (09-23-26):**
- Vaporwave's pressed task button switches instantly on an in-school swap
  (its group has no animation). The alternative is a 250 ms fade of only the
  pressed button. Founder: "address later". Decide it at vaporwave's pair
  stage.
- Root business pages inline about 1 to 2 KB of Astro's view-transition
  keyframes (`astroFadeInOut` and friends) that they never use. The router's
  CSS was bundled with quiet's Header styles (predates Stage 1; already on
  main). It is inert and invisible, and breaks only the letter of "the portal
  work leaves the root pages untouched". The fix is a bundling change that
  moves live CSS files, so it waits for a quiet moment with a before/after
  pixel diff of the root pages (`scripts/themes/diff-captures.mjs`).

**Founder read, 09-23-26, first pass at B.** "Very impressed." Vaporwave and
Bauhaus are great (personal favourites). Grandmillennial and Cottagecore are
"absolutely selling what we can do." Glassmorphism is the most lackluster,
Swiss right behind it. Mobile screenshots look good.

**Path to A+ (founder go 09-23-26).** Tier 1 fixes and tooling, Tier 2
primary-source research dossiers per school plus a critique panel, Tier 3
revisions fed by the dossiers, then a founder round. Research must come from
trusted, reliable primary sources.

**Sidenote, 09-23-26: transitions are the next push after A+.** Crank up the
transitions between schools and the motion within them. The founder,
clarifying at Stage 2: the push turns today's simple, low-motion transitions
into transformations; stalls are reduced where possible, never promised away. The model is the
wordmark morph: it transforms and moves while the page changes under it.
Purposefully built, possibly a distinct transition for each pair of schools
("this is a crown jewel for a while"). Scope it after A+; the research
dossiers record each school's motion vocabulary for it.
Founder, 09-23-26 (Stage 1): individual transitions from any school to any
other, no literal portal or passage gesture, and transitions must never stall
on loading; preloading and drawing destinations ahead of time, even
everything up front, is acceptable. The measurements and the off-screen draw
technique are in `theme-schools-research/tier3-stage1/p4-trace.md`.

**Then tranche 2** (founder, 09-23-26: "very likely"). Candidates and the
original ranking live in `theme-schools-research/`.

**Sidenote, 09-23-26: the order after the schools.** The founder's plan:
1. Ship the themes and the transitions.
2. Run the big site copy pass. It has been planned and audited twice but
   never executed; see the "Copy pass on the business pages (redo)" item
   further down.
3. Come back and sew up any weirdness between the Portal and the site in one
   go.

Consequences for the work before then:
- Every school renders quiet's words verbatim (word parity), so the copy pass
  lands in all seven schools at once. Expect it to reflow layouts built
  around today's copy lengths: billboard splits, "From the lab" summaries,
  the process row.
- Keep Portal-specific copy (the first-load prompt, the picker heading,
  BDL-010's lines) easy to find, so the reconciliation pass can sweep it
  together with the site.
- Don't polish copy-dependent layout details to the pixel before the copy
  pass. Fix structure, not line breaks.

### BDL-009 · Bayou Kitchen · LIVE as a menu-honesty study (09-23-26), order half blocked

**Published 09-23-26 (founder call, PR #88)** as a working specimen arguing
the menu alone, the "menu-honesty study" branch of the decision below. The
order-taking section is still unwritten and still blocked on the Stripe
test-mode decision; the never-claim list below still binds the page.

Stood up as `status: forthcoming` in PR #85, which generated no page: the
catalog row rendered and nothing else, so a half-argued study could not reach
a reader. Hero captured from the deployed specimen at
`https://demo-bayou-kitchen.birchdesignlab.workers.dev`.

**The menu half is written and verified. The order-taking half is
deliberately unwritten.** The draft argued three things: show the menu
honestly, take a real order, and never lie about whether the kitchen can fill
it. Only the first is true today. The specimen takes no orders at all:
checkout rejects every request at the bot-verification gate, no card has ever
been authorized, and the kitchen board holds nothing because the order webhook
is unconfigured. That is not something to soften in copy.

`tech` deliberately omits `stripe` and `durable-objects`. Listing them claims
a payment flow that has never run.

**Blocked on a founder decision:** whether to enable the ordering flow in
Stripe test mode. Test mode is the right target rather than a compromise, since
it produces a real authorization and a real webhook. A second prerequisite is
an access application for the kitchen screen, without which "the kitchen taps
Accept and that is the moment the customer is charged" cannot be verified at
all. If the answer is no, BDL-009 either publishes as a menu-honesty study
alone or waits for a specimen that can take an order.

**Never claim, on any version of this page:** that a card is authorized at
checkout, that an unacknowledged order releases its hold, that an unverified
request is prevented from holding a card (true only because nothing can hold
one), that the audit runs against the served build, that every page scores in
the high 90s (SEO is 66-69 permanently, by noindex design), that accessibility
is perfect, that a locked-down business type is prevented from leaking a
marketing script, that the contact form delivers mail (its sender is on a
reserved `.example` domain and can never be verified), that SMS works, or that
the Spanish site is complete.

**Verified, unused, and waiting for that section:** checkout recomputes every
price from the menu and never reads a price off the request; the contact
endpoint rejects cross-origin POSTs before anything else runs; the kitchen
board fails shut (401); bot verification is enforced server-side and is
deliberately stricter at checkout than on the contact form, which is the most
defensible security claim available.

### BDL-008 · Magnolia & Mane · SHIPPED 09-05-26

Genre study of a Gulf Coast salon site, published from the draft that sat on
the `lab-drafts` branch as `docs/lab-draft-magnolia-mane.md`. Live at
`/lab/bdl-008`; the specimen it studies is deployed at
`https://demo-magnolia-mane-salon.birchdesignlab.workers.dev` and is
deliberately `noindex`.

*Mirrored from the other repo's `docs/BACKLOG.md` Item 4, which recorded this
as birchdesignlab's work living in the wrong backlog. Item 4 also covers the
Bayou Kitchen half, which is still unbuilt.*

**It took BDL-008, not the BDL-009 the draft proposed.** The Bayou Kitchen
draft in the same branch proposes BDL-008, but a number is claimed at build
time and Bayou Kitchen has not been built. BDL-007 was the newest shipped, so
008 was the next free slot and this is the study that actually reached
publication. **Bayou Kitchen needs renumbering to BDL-009 when it ships** —
its draft header is now wrong.

**The three blockers the draft named, and how each was settled.**

- **Photography** — resolved as a screenshot, and the blocker was never
  really achievable as written. Magnolia & Mane is a fictional salon; there
  is no salon to photograph. BDL-005 already set the precedent that a study
  hero is a screenshot of the site. The capture is
  `scripts/lab/capture-study-hero.mjs`, committed rather than run by hand:
  header plus hero band only, clipped to the `.hero` element so it stops
  short of the service cards. That matters because **every image on the
  specimen is a flat placeholder JPG**, and a wider shot advertises the
  placeholders instead of the site. Captured at 1600 CSS px at 2x (3200x1194,
  2.68:1), which clears the 1920px+ rule and sits close to the ~2.9:1 the
  full-bleed hero box crops to.
- **`liveUrl`** — resolved by the deploy.
- **Designation** — see above.

**Three claims in the draft were false against the deployed specimen and were
rewritten, not copy-edited.** This is the part worth remembering: the draft
was written before the specimen was deployed, and it described the site the
argument wanted rather than the site that exists.

- **Booking.** The draft claimed every service is its own bookable thing with
  its own real length, that "the calendar shown is the calendar that's
  actually open", and that "the booking is final the moment it's made". None
  of that is true here. There is one `/book` page holding one Cal.com iframe
  behind one reveal button, pointed at a demonstration account; services carry
  no duration field and no book button. Rewritten to the narrower claim that
  is true and still worth making: booking stays on a route the site owns, in
  the site's own chrome, and nothing third-party is contacted until the
  visitor clicks. The page now says outright that the calendar is a
  provider's and not something we wrote.
- **Consent.** The draft's "nothing fires until a visitor actually says yes"
  reads as this site's behavior. The specimen ships `consent: { mode:
  "opt-out" }` and its banner says, visibly, that the site uses marketing
  analytics by default. Rewritten so opt-out is described as the setting this
  specimen makes and opt-in as the setting a business can choose instead.
- **"Nothing phoning home on page load."** A first-party `POST /api/counter`
  fires on load. The zero-third-party-scripts claim survives and is now
  stated separately from the counter, which the page describes rather than
  omits.

**Verified true and kept:** the four prices ($65 / from $120 / $45 / $55,
matching the live services page), `BeautySalon` JSON-LD with address, geo,
hours and priced services, no `analytics` block configured at all, zero
third-party scripts on the homepage, honeypot plus Turnstile on the contact
form (test site key on the specimen), and the security header set (HSTS
preload, `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
Referrer-Policy, Permissions-Policy).

**New since the draft: the specimen is bilingual,** English at the root and
Vietnamese at `/vi/`, and the study now argues it as genre rather than
technology — Ocean Springs sits between the Biloxi and Bayou La Batre
communities. Translation coverage is complete through nav, FAQ, testimonials,
service bodies, and localized dates. **The Vietnamese is demo-grade with no
native-speaker pass**, which the published page states on the record rather
than burying.

**Confidentiality check performed at publish time, not assumed.** Scanned the
final copy for the internal framework's name, for any description of a shared
framework, template, spine, or scaffold, and for build-speed figures. Zero
hits. The founder copy pass also stripped every em dash: shipped Lab copy is
em-dash-free and the draft was full of them.

**Still owed.** Lighthouse was not run against the deployed specimen during
this session. The page claims every build clears 95 / 95 / 95 with a perfect
SEO score, which is true of the enforced budget in the specimen's
`lighthouserc.cjs`, not of a run performed on 09-05-26. Worth one real run
against the live URL to convert a gate into a measurement. Replacing the
specimen's placeholder JPGs with real imagery would also allow a fuller hero
crop later.

**Catalog blurb fixed 09-06-26.** `/lab` used to say "Studies are client
work, shown in the same way," which BDL-008 and BDL-009 both contradict. Now
reads "Studies are finished sites, client work and our own." Considered
retyping both as experiments instead and rejected it: the schema requires an
experiment to carry a `howto` wall label or an `href`, and `ExperimentLayout`
renders an interactive stage, so these would fall through to "no interactive
stage yet" and lose the hero, the live URL, and the client plate. The page
shape that fits is `study`; the definition was what was wrong.

**Two false claims were found on the live page and corrected in PR #85.**
"The translation reaches everywhere the English does" was false:
`/vi/legal/privacy` and `/vi/legal/terms` 404 while the English return 200,
and that turns out to be deliberate upstream, where legal routes are declared
English-only. "A perfect SEO score" was misleading: the audited build is
crawlable, the deployed specimen is noindexed, so live SEO sits in the 60s
permanently. The 95 threshold for performance, accessibility and
best-practices is accurate and stayed; live accessibility measures 96, so the
page never claimed a perfect accessibility score.

**Two real accessibility defects, in shared chrome, still unfixed and not
ours to fix here.** A contrast failure on the About-section link (`#b5502d`
on `#f1eae0`, ratio 4.23 against a 4.5 threshold) and `role="button"` on a
`<label>` in the mobile nav toggle. Both are present on both specimens
byte-identically, so they belong upstream and will reach real client sites.

**The plate tick still orphans, and the obvious fix made it worse.** A
hostname long enough to wrap pushes the accent tick onto a line of its own,
where it reads as a stray pipe. Tried a baseline-aligned flex row on
09-06-26 and reverted it: the anchor wraps inside its own flex box and the
tick ends up floating at the right margin, further from the text than before
(reproduced at a 390px viewport). Worth knowing that the measurement lied
too, since making the anchor a flex item collapses its per-line client rects
into a single box, so a "does the tick share a line with the link" check
passes while the URL is visibly wrapping.

Inline layout will not bind the tick to the last line while the hostname
itself wraps mid-word, so the real options are design choices, not CSS
tweaks: move the tick beside the "Living specimen" label, lead with it
instead of trailing it, or shorten what the link displays. Founder call.
BDL-009's hostname will hit this too.

### BDL-007 · The Shining Tree · SHIPPED 08-18-26

Interactive three.js stage for the organic 3D wordmark (bdlOrganic). Live
at `/lab/bdl-007`, and featured on the home page, which takes the two
newest `status: live` specimens by designation rather than any flag.

Weighted drag/flick/zoom, two living beats: moss that breathes in glow and
size together, and 40 fireflies that gather to it after a spell of
stillness and scatter on a grab. Idle yaw until first grab, then never
again. Reduced motion honored narrowly (interaction stays, autonomous
motion stops). One new dependency: `three`.

**Shipped timings differ from the spec.** 60s idle yaw, 20s breath, 20s
gather, against the spec's 30/9/8; retuned by eye against the real page.
The spec stays as the record of what was agreed, so read the code for what
ships.

- Spec: `docs/superpowers/specs/2026-08-18-bdl-007-shining-tree-design.md`
- Plan: `docs/superpowers/plans/2026-08-18-bdl-007-shining-tree.md`
- PR #29 (the build, subagent-driven), #32 (re-shot still), #30 (brand test),
  #31 (8c favicon set), #48 (mobile framing + disclosure affordances +
  bordered hatch + ground shadow removed)

**Mobile + polish pass (#48), 08-19-26.** Framing is now aspect-aware
(`frameCamera()` fits the front silhouette to the tighter axis, recomputed on
resize) and aims above centre (`FRAME_DROP`) because the mark is top-heavy;
`FIT_FILL` 0.74 keeps margin so nothing clips. The ground-shadow pedestal was
removed (a fixed plane drew as a blob/smear once distance was aspect-aware,
and implied a floor the starfield lacks). The specimen plate and how-to label
got disclosure carets + a hover wash. The hatch kept its floating pill but
gained an accent-60% border (`--line-accent` at 45% blended in). Verified in
real Chrome; the preview pane can't composite WebGL.

Two things about the model that were not obvious and cost real time:

- The glb declares `EXT_mesh_gpu_instancing`. Moss and lichen are placed
  by `instanceMatrix`, not node transforms, so anything sampling the
  surface must go through `getMatrixAt`. Sampling base geometry gives node
  pivots buried inside the letterforms.
- A uniform added through `onBeforeCompile` has to be declared in the GLSL
  by hand. three auto-declares only its own built-ins, and binding a value
  without the declaration fails to compile with no signal on the JS side.

Material names mislead: `canopy` is the green moss and lichen cover,
`stone` is the birch bark face.

**Closed 08-23-26 (launch-prep sweep).** Cache headers: the glb moved into the
experiment dir and is `?url`-imported, so it lands content-hashed in `/_astro/`
and inherits the immutable rule; the Draco decoder got a bounded rule (#56).
Keyboard path added (arrows/zoom/reset, `role=application`), `reduceMotion` is
now live via a change listener, and the gltf teardown leak is disposed (#63).
GPU cut with pixel-ratio 1.5 and a 30fps ambient throttle (#59).

**Still open, not blocking:** flick momentum assumes a 60Hz pointer cadence, so a
flick on a 120Hz touch device coasts about half as far. The only item from this
list not closed this session.

Closed earlier: the 1.3MB of dead Draco decoder copies are dropped by a build
plugin in `astro.config.mjs`, and the still's `sizes`/`fetchpriority` were
corrected in #32.

## AR card

The WebAR business card system. Merged here 08-26-26 from `docs/ar-card/BACKLOG.md`, which is deleted; one backlog file, at founder direction. Context and architecture stay in `docs/ar-card/HANDOFF.md`, which a session on this project still reads first. History stays inline (strikethrough + DONE markers), never deleted.

### Decision gates

- [x] ~~**Get a Google Voice number and put it on the card. HIGH PRIORITY.**~~ **DONE 08-27-26.** The card now carries a Google Voice number in E.164, so `buildVcf` emits a `TEL` and a saved contact has a phone. Kept as the record of a decision that should not be re-litigated: putting the **personal mobile** in as a stopgap was raised 08-26-26 and **declined**. A vCard is not a web page, so once someone taps Save contact the number is in their phone permanently and a later edit reaches nobody who already saved it; the number would also have stayed in git history after any swap; and a personal mobile reverse-looks-up to a name, against the standing identity constraint. Waiting one day for a Voice line cost nothing and closed all three. If a second number is ever needed, get another Voice line rather than reaching for the personal one.
- [x] ~~**Choose + wire the tier 1 channel path.**~~ **DONE 08-28-26.** `/greetings` = tier 1 wood (AR card prompt pack v4). Wired: `src/pages/greetings.astro` (channel `wood`), excluded from the sitemap in `astro.config.mjs`. **What remains a one-way gate: etching the URL into physical wood.** Do not order a run of etched cards before the AR experience below at least reaches the stubbed state `/hello` is already in.
- [ ] **Durable beacon storage.** Analytics Engine retention is ~3 months; decide (during the analytics task below) whether per-tier totals need to outlive that — aggregate on a schedule, or move to D1/KV. Until then, run totals via the AE SQL API before data ages out.

### Tasks

- [x] **Landing page — DONE-WITH-CAVEAT 08-25-26, simplified 08-26-26, restyled 08-26-26.** The landing is `src/components/CardLanding.astro`, rendered by one page per channel: `/hello` (kraft) and `/showcase` (the Cheer and Chatter break-screen QR). One caveat left, AR stubbed (`AR_ENABLED: false`, no AR UI at all); the vCard's placeholder caveat closed 08-27-26 when the Google Voice number landed, so every contact field is now real. Acceptance met: vCard downloads client-side, beacon fires and fails silent, interactive < 2s on 4G. The restyle traded the old ~14KB critical-path target for the brand face: Marcellus is now carried in the document as an inlined woff2 subset rather than linked, which is the one thing on the page that buys weight instead of saving it. Built page is 21.9KB, 13.3KB gzipped, still one round trip. See the header comment in that file for the reasoning.
- [ ] **AR scene (multi-target).** Anchors set up for every target index the compiled `cards.mind` contains (derived from the file, not hardcoded), each triggering the identical logo experience: rise-from-card animation, interactions (tap-to-open portfolio panels), clean teardown on close and on switching targets. Lazy-loaded from `src/ar/`, built to `public/ar/card-ar.js`, only behind a user tap from the landing's `#ar-root` mount. Applies to card channels only: add `ar` to `/hello` and `/greetings`, never to `/showcase`, which is a QR on a television. Acceptance: any card design already compiled into `cards.mind` locks and produces identical behavior; closing or switching cards leaves no orphaned Three.js objects.
- [ ] **Asset pipeline + tracking harness.** `scripts/ar-card/` build step crunches the raw logo GLB under budget (see the perf-budget flag in `docs/ar-card/HANDOFF.md` re: whether 1.5MB is assets-only or assets+framework); multiple source images (QR zone flattened to solid fill, compiled from vector art not photos) compile together into one `public/ar/assets/cards.mind`; a dev harness (`/dev/track` or similar) reports fps and time-to-first-lock per target index, and the Target inventory table in `docs/ar-card/HANDOFF.md` is updated every time a design is added or recompiled. Acceptance: each compiled target locks in under 2s at 20-60cm indoor light.
- [x] ~~**NFC batch writer — CONDITIONAL.**~~ **DROPPED 08-26-26.** The wood cards cannot be sourced with chips in them, so there is nothing to write. Dropped rather than deferred: nothing else in the project depended on it, and the `?s=` medium parameter that existed to tell NFC scans from QR scans went with it. Every card is QR.
- [ ] **Analytics endpoint + stats view.** The interim AE beacon shipped 08-25-26 (`POST /api/beacon`, no PII, fail-silent) and was cut back 08-26-26 to `{ts, channel}`. Open: stats view (totals by channel, counts by day), rate limiting without storing raw IPs, and the durable-storage decision above.
- [ ] **QA + hardening pass.** Produces `docs/ar-card/TESTING.md`: physical device matrix (recent iPhone Safari, older iPhone, mid-tier Android Chrome, Android low-power mode), the multi-target tracking protocol from the dev harness (confirm every compiled target locks under 2s), camera permission deny/re-grant flows, vCard import verified on both platforms, `prefers-reduced-motion` honored end-to-end (skip the particle burst, shorten the rise animation), offline/asset-fetch-failure state with retry, an error boundary around AR init that lands users back on the working landing page, Lighthouse >= 90 performance on the landing route. Two known layout gaps from the 08-26-26 restyle, both deliberate: on a 320px-wide handset one action falls below the fold, and in landscape two do. Landscape wants a two-column layout (mark beside the text, not above it); fixing 320-wide means shrinking the mark the founder asked to enlarge. Portrait phones from 375x667 up fit all three actions.
- [ ] **Point the Cheer and Chatter showcase QR at `/showcase`.** The page is live and its channel is wired, but nothing links to it yet: the QR on the BDL card in C&C's break screen still points wherever it pointed before. The change is in the C&C repo (`assets/brand/sponsor-card/qr-birchdesignlab.svg` here is the BDL-side artwork; C&C bakes its own). Until it is repointed, `showcase` will read zero scans, which is correct rather than broken.

### Nice-to-have

- [ ] Dedicated OG card for the landing (`scripts/og/` manifest entry); currently reuses `/og/home.png`, which unfurls fine.

## Branded client documents

How BDL produces the documents it sends to clients: proposals, quotes,
reviews, reclaim estimates, the price sheet. One branded face, one render
path, so a new document is written rather than assembled, and every one that
goes out looks like it came from the same studio.

Started 09-03-26. Reusable internal tooling per house practice, and not
invented here: two proven approaches were already sitting in the Cheer &
Chatter repo (they produced the delivered project-review PDF and the two
owner-manual DOCX files), unwired to this one. Ingested, then generalized.
The price sheet is the first document through it, not the point of it.
Expect the shape to move as real documents land — see the tasks below.

**The shape, as built.** The tooling is document-agnostic; pricing is its
first caller, not its subject. A new document is a content file and nothing
else.

- **`scripts/docs/check-pages.mjs <doc.html>`** measures every `.page` for
  clipped overflow and shoots each one. **`build-pdf.mjs <doc.html>
  [out.pdf]`** renders. Both take a path and know nothing about any
  particular document. Always run the checker first: `.page` is
  `overflow:hidden`, so content that does not fit is CLIPPED rather than
  reflowed, nothing errors, and the only signal in print is text colliding
  with the footer.
- **`docs/_letterhead/`** is the shared face: `letterhead.css` (the skeleton,
  written once, colors expressed as role tokens) plus `theme-day.css` and
  `theme-night.css`. A document links theme, then skeleton, then its own
  thin CSS. `docs/pricing/pricing.css` is what a document-specific file
  should look like: two column widths.
- **The wordmark is injected at render time** (`scripts/docs/letterhead.mjs`)
  from `assets/brand/logos/files/8b-horizontal-{day,night}.svg`, into empty
  `<div class="letterhead" data-for="...">` placeholders;
  `<body data-letterhead="night">` picks the face. Before this each page
  carried its own pasted 15KB copy of the outlined mark — the two price-sheet
  variants were 57KB each and about 90% logo path, and one truncated paste
  rendered as "BIRCH DE" on a single page while the others were fine. Now
  11KB, one source. Documents opened straight in a browser show an empty
  letterhead; that is expected, render through the scripts.
- **Source material:** `scripts/docs/reference/cheer-chatter/` — the three
  original C&C scripts, byte-identical, plus a README on what each does and
  what's ported vs. not.

### Tasks

- [ ] **Port `build-manual-docx.mjs`** once a real DOCX deliverable is
  needed. Same conversion coverage (headings/bold/italic/code/lists/tables/
  images/rules) should already fit anything markdown-authored in this repo's
  `docs/`. Likely first caller is the one-page proposal template (§9.5 of the
  services handoff), which wants to be editable rather than a PDF. `docx`
  stays out of `package.json` per the source repo's own reasoning; a scratch
  `NODE_PATH` install is the pattern to keep.
- [ ] **Prove the letterhead on a second document.** Everything above is
  factored against one caller, which is exactly how a bad abstraction gets
  locked in. The proposal template is the test: whatever it needs that
  `letterhead.css` cannot give it is the real boundary between shared and
  doc-specific, and the split should move to wherever that lands.
- [ ] **Decide the light/dark selection rule.** Price sheet has both faces;
  no rule yet for which goes out by default (valuation-style night for pitch
  decks and leave-behinds vs. day for print-and-read documents?).
- [ ] **Pricing content is frozen until the February 15, 2027 review**
  (founder, 09-03-26), so this tooling should not be exercised by editing the
  price sheet. Next real document drives the next change to it.

## Prod ops notes

### 08-19-26 — Safari "connection is not private" report (birchdesignlab.com)

A friend of the founder got Safari's "This Connection Is Not Private /
certificate is not valid" on birchdesignlab.com. Investigated same day:
the live cert is fully valid from an outside vantage. Both apex and www
serve a Google Trust Services cert (CF's default issuer), notBefore
2026-07-29, notAfter 2026-10-27, SANs cover birchdesignlab.com,
*.birchdesignlab.com and www. `curl` reports ssl_verify_result=0, the
chain verifies OK, apex returns 200 and www 301-redirects to apex.

So the site is not misconfigured. The warning is device- or network-side,
or a transient CF edge blip. Ranked causes: (1) the friend's iPhone clock
set before the cert's 07-29 notBefore, which makes Safari read any valid
cert as not-yet-valid; (2) a TLS-intercepting network (captive portal,
content filter, some VPN/DNS) — retry on cellular; (3) transient edge
provisioning, gone on retry. Ask for the exact URL, WiFi vs cellular, and
whether the device date is correct before touching Cloudflare SSL/TLS
settings. Not reproduced from here.

Follow-up: founder believes it was the friend's WORK network. That makes
corporate TLS inspection the leading explanation: an SSL-inspecting
middlebox (Zscaler/Netskope/Palo Alto/Fortinet/Cisco et al.) decrypts and
re-signs HTTPS with the company root. A managed laptop trusts that root; a
personal iPhone on guest/BYOD WiFi does not, so Safari reports the re-signed
cert as impersonation. A young domain (launched this month) is also commonly
intercepted or blocked by enterprise filters as newly-registered. This reads
as a legitimate proxy, not a lingering breach: covert MITM avoids triggering
warnings, and interception is not site-specific. To confirm, have the friend
read the warning cert's Issuer (corporate/vendor CA = inspection; unrelated
self-signed = report to their IT). Not the founder's network to probe.

Escalation 08-19-26: the friend's employer is a 10-15 person shop, not a
corporation, and had sensitive data stolen a few months ago. That lowers
the odds of legitimate enterprise TLS inspection and raises the weight of
"something still wrong on the network." Still calibrated, not alarmist:
small shops do run prosumer firewalls/DNS filters (Sophos, Fortinet,
SonicWall, Meraki, NextDNS, Cloudflare Gateway) that also re-sign HTTPS.
The site is confirmed not the vector (valid cert, Cloudflare DNS). Decisive
tell is the warning cert's issuer: known filter/firewall vendor = benign;
self-signed / unknown CA / mismatched org / very-recently-issued = escalate.
Separators between filter and attacker, all read-only on the friend's own
device: (1) scope — if major sites (bank, Apple) also warn, treat the
network as hostile; (2) DNS — if the domain resolves to a private IP
(10.x/192.168.x) on the work WiFi vs Cloudflare ranges on cellular, that's
LAN DNS hijacking; (3) cellular clean confirms it's that network. Post-breach
device hygiene: check Settings for unknown configuration profiles and
untrusted root certs (a rogue trusted root is how MITM goes silent; getting
a warning means the device did NOT silently trust the fake cert). If issuer
is unknown/self-signed, or major sites warn, or DNS points to a private IP,
the network should be treated as compromised and handled by a real security
professional. NOT the founder's to probe: testing someone else's employer
network is unauthorized regardless of the breach.

## Concepts, ranked by projected effort (lowest first)

### 1. ~~BDL-004 · The Loom~~ · RETIRED 2026-07-29

**Built, tested, shipped, then pulled.** Founder verdict: visually unacceptable, redo unlikely. The whole build (components, weave lib, tests, catalog entry) lives in `attic/bdl-004/` with a resurrection note; it is out of the site, the registry, and the test run. The BDL-004 designation stays burned; the next experiment takes the next number.

**Specced 2026-07-16:** `docs/superpowers/specs/2026-07-16-bdl-004-the-loom-design.md`. The paragraphs below are the pre-spec sketch, kept for the record.

Generative woven textile. Pick warp and weft colors, pick a draft pattern, watch the cloth weave itself thread by thread on canvas. Download the finished cloth as a wallpaper. Craft rather than nature: tactile like 003's dig, but a different sense entirely, and not a tree in sight.

Why cheapest: the weave math is a grid of over/under decisions driven by the draft, plain canvas2D rendering, and controls the styleguide pattern already knows how to build. The polish budget goes to making the thread render feel like fiber instead of pixels.

### 2. The Orrery · artistic · mobile-native

A working solar system, planets where they actually are right now, at real ephemeris accuracy. Drag time to scrub across centuries. Brass-and-ink instrument aesthetic. Artistic face, serious math underneath: the living, time-based ethos of the site without a single birch.

Effort sits in the ephemeris math (simplified Kepler elements are well published and unit-testable) and in making the time scrub feel like handling an instrument rather than a slider.

### 3. The Type Instrument · technical · desktop-forward

Sibling of the styleguide, for typography. Paste your own text, play with scale ratios, pairings, measure, and leading; watch live rag and x-height comparisons; copy tokens out. Follows the proven instrument-to-curated-room model: full internal tool first, curated public room when controls prove interesting.

The one deliberate reusable tool in this batch. Every client site needs type decisions, so this pays rent forever. Effort is UI breadth rather than hard problems, and the styleguide provides the pattern to copy. Mobile gets a reduced view with the DeviceBadge treatment.

### 4. The Software Renderer · technical · mobile-usable

A 3D scene rasterized from scratch on canvas2D. No WebGL, no library: projection, z-buffer, lighting, all handwritten and readable. Touch-orbit on mobile with resolution scaled to the device, since a CPU rasterizer on phone silicon wants a low-poly scene. The specimen plate explains the pipeline stage by stage. The credential: we understand rendering down to the pixel.

Bounded, well-trodden math, but a lot of it, and the scene itself needs art direction to be worth staring at.

### 5. The Painting · technical · mobile-usable

The view-source CSS feat, now a concept. Unnumbered since 2026-07-16; takes a number at its own build time. One museum-grade illustration built from pure CSS: no images, no SVG, no JS. Hundreds of hand-placed gradients and shadows. The page shows the plate and an invitation to view source; the gasp is in devtools, where the whole painting reads as a clean, commented, human stylesheet.

Subject parked until spec time, with one constraint agreed: lean into gradient and shadow, because that is what CSS painting does best. Maximize the flex.

Most expensive item here: the cost is artisan hours placing gradients until the subject breathes, and the museum-grade bar (set by 003) applies in full.

## Shelved experiment concepts

Liked, not dead. Revisit when the moment fits.

- **Tonight's Sky.** ~~Shelved.~~ **UNSHELVED 2026-08-03** (permission prompts now allowed — "the lab is the lab and the lab is free"). Star chart of the visitor's actual sky, computed client-side from clock and location. Overlaps the Orrery conceptually; sequence them deliberately rather than building both.
- **One Kilobyte.** Entire experiment, markup plus style plus script, under 1024 bytes, live byte counter on the page. Demoscene discipline, pure optimization flex. Shelved as a someday treat, not a priority.

## Direction set 2026-07-29 (founder session)

- **The Lab becomes the entire portfolio.** Two kinds of resident: experiments (technical/artistic flexes, the current BDL-00N line) and specimens/case studies of client work. Exact shape not fully flushed out; `docs/lab-architecture-handoff.md` (the experiment/study split, accession numbers, filterable catalog) is the live starting point, NOT stale — reconcile it with the shipped schema when building.
- **First case study: Cheer and Chatter** (just wrapped). Director's-commentary voice is part of the format, not a separate idea. Client cleared publishing basically anything short of extremely personal details.
- **BDL-003 gate changed.** The founder hand-trace pass (Task 8) is deferred indefinitely — too much time/effort right now. New gate: BDL-003 needs a **complete visual rework** before the trace pass is even worth sitting down for. It survives the Loom's fate only because it is a thematic lynchpin.
- **Conversion path is the near-term priority.** Pages-to-Workers migration + contact form slot right behind the hygiene commit; specimen/case-study work after that.
- **Whole-hog content/writing pass wanted** across the site. Founder does not consider Claude Code the tool for good creative writing; treat this as founder-led with mechanical support. Sequencing unchanged (after Lab work).
- **Lab presentation language / visual identity** stays a "come back to very soon" item ahead of the Lab theme pass.

## Direction set 2026-08-03 (founder session)

- **The Lab rolls heavy.** Founder verdict, verbatim: *"we need to roll heavy in the lab. i wanted to be tentative at first but, within the bounds of 'quiet luxury,' smack people in the face with technical and artistic flex. I hated the experiments because they're paltry and boring. even i can't get excited for that and it's my site. how am i going to explain it to someone who's not 7/8ths as technical as i am"*. The early tentativeness is retired. Both halves of the bar bind: flex hard, stay inside quiet luxury. The test is what a **non-technical** visitor feels in the first five seconds; impressive-to-engineers is not the target. This is grounds for revisiting shipped pieces, not only for judging new ones. Needs its own session.
- **Permission prompts are allowed.** The permission-free rule is dead: *"the lab is the lab and the lab is free."* Location, camera, microphone, accelerometer, whatever a piece needs. Tonight's Sky is unshelved as a direct result, and no Lab concept gets rejected for needing a prompt. Still design the prompt moment deliberately; an unexplained prompt on load is bad interaction design, but that is craft now, not a rule.
- **GSAP is in.** Recorded above under the concept list. The website spec already reserved it as an island-scoped future Lab piece, so nothing structural blocks it. *Expanded 2026-08-13 — see that direction set: every experiment is opened up, not one reserved piece.*
- **A real logo.** The generated 512x512 mark is a placeholder; see the note in the parked list below. *Resolved 2026-08-08 — mark chosen; see the parked-list entry.*

## Direction set 2026-08-13 (founder session)

- **The animation line is redrawn.** The 2026-08-03 "flex within quiet luxury" bound is split in two: **quiet luxury now names the business pages** (home, services, about, contact — Lighthouse 100s, restrained, no heavy motion), and **the Lab is unbound** — GSAP and anything else, "any and everything to flex technically," for every experiment, not a single reserved piece. In the C&C live app the slideshow screen is the one animated surface (zero animation elsewhere there), and the BDL slide rides it. The Lab's quality bar is unchanged: what a non-technical visitor feels in the first five seconds.
- ~~**Nothing brand-side is settled.**~~ **Superseded the same day.** The
  2026-08-08 mark, lockups and sponsor card were a bridge to 2026-09-01 and the
  founder disliked all of them. A brief was written against that failure record,
  run through Claude Design, and **a mark was locked 2026-08-13** — see the logo
  entry in the parked list below. The 08-08 set is superseded, not shipping.
- **Design sweep, reduced.** The logo question is answered, so the sweep no
  longer owns mark direction, lockups or light-face variants. What remains is
  **adoption** (favicon, OG, manifest, header, footer), the Cheer and Chatter
  re-export, and the copy rewrite that always rode the same window.
- **No one-colour mark, deliberately.** Single-colour versions were explored and
  none worked; the founder went the other direction. The two overlapping strokes
  are the idea, so flattening them removes the mark. Accepted cost: nothing to
  print or stamp in one ink. Do not reopen this as an oversight.

## The Lab's four design passes — where they stand

The Lab was to get four passes: **accent, density, texture, motion**. They were
reviewed as frames in a Claude Design project. Recording the identifiers here
because the frames were once downloaded, deleted, and unreferenced anywhere in
the repo, and recovering them cost a session.

- **Project** `027db389-4762-4e10-9ccd-6ab6a7752652`, files `CatalogFrame.dc.html`,
  `Lab Density Pass.dc.html`, `Lab Accent Pass.dc.html`.
- **Design system** `birch-design-lab-design-system-9084dec9-3437-4b45-9433-4ff780cc0cf9`.

| Pass | State |
|---|---|
| Density | **Shipped 07-30-26** (`c9186df`), the loose variant |
| Accent | **Shipped 08-13-26**, the loud variant (frame 1c), plus the chiaroscuro flip |
| Texture | **Never drawn.** No frame exists. Stages still show placeholder treatment. |
| Motion | **Never drawn**, and has since grown: the 08-13 direction asks for the Lab's presentation language, entrance beats, transition grammar and a motion budget, with GSAP available |

The founder's summary of the first two, from the time: *"loud accents with the
relaxed spacing."* Both halves are now in.

Spec and plan: `docs/superpowers/specs/2026-08-13-lab-accent-pass-design.md`,
`docs/superpowers/plans/2026-08-13-lab-accent-pass.md`.

Two decisions worth not relitigating. The forthcoming chip keeps the word
**"forthcoming"**; the frame's "in progress" was declined because it is a claim
about right now that has to stay true through quiet weeks. And the working dash
is sized in `em`, so it is deliberately smaller beside the specimen plate's
smaller type than it is in the catalog: it scales with the text it marks.

## Parked site notes (not experiments)

Side ideas from earlier sessions, gathered here so the handoff stops carrying them:

- **Bark peel.** Tap becomes the shed trigger on the living bark. Its own future round on the bark engine.
- **Client-study section.** Director's commentary on a client site once one exists to narrate.
- **From-the-Lab recency switch.** Home section flips to recency ordering at 4+ live entries.
- **Lab visual identity.** The Lab will eventually branch away from the professional site theme and grow its own style. Nothing decided; also tracked as handoff open thread 4. Worth deciding before the Lab has many live pieces, since each experiment currently inherits site tokens.
- **Presentation ceiling (the awwwards note).** Founder browsed awwwards 2026-07-16 and found the backlog concepts presentation-modest by comparison. Diagnosis agreed: the concepts' substance is the differentiator (working systems, not demo shells), but the specs say little about arrival, motion, and material feel. Action when ready: define the Lab's presentation language (entrance beats, transition grammar, motion budget; GSAP is already reserved for Lab pieces) under the Lab visual identity thread, optionally preceded by a study session naming which awwwards techniques to steal and which scroll-jack noise to skip. The Loom would ship as the language's first full expression. Founder installed a front-end design plugin for this work.
- **Bark-generated OG images.** Seeded bark rendered into per-page OpenGraph images at build time. Flagged as "a nice later touch" in the website spec's SEO section. Specced 2026-07-16: `docs/superpowers/specs/2026-07-16-bark-og-images-design.md`.
- **Per-experiment OG art.** Each Lab piece gets its own OG card instead of sharing the catalog's. Worthwhile once the catalog holds about a dozen live experiments.
- **Daily OG rebuild.** Cloudflare deploy hook on a cron so the OG card's tree is truly daily rather than tree-of-last-deploy. Only matters if platform OG caching ever stops making it moot.
- **GSAP as a Lab-piece technology.** ~~Reserved, no concept attached.~~ **Committed 2026-08-03** (see the direction set above). Still banned from the core site by the spec; the Lab is where it lives. Open: which piece uses it first.
- **Heavier location-aware work.** ~~Waiting on a decision about permission prompts.~~ **Unblocked 2026-08-03.** Permission prompts are allowed in the Lab now, so location-aware pieces need no special justification. Tonight's Sky came off the shelf with this.
- **Copy pass on the business pages (redo).** A founder copy pass was done 2026-07-16 and carried through the 2026-07 design-system port, but founder judges it weak and wants a quality rewrite over home/services/about/contact. First-draft, not final (founder territory per the writing rules); sequence after the Lab work, not before.
- **About page design revisit (Claude Design check).** Founder wants a brief pass over the About page run against Claude's design guidance — a check, NOT a rework. Just validating the page against some things, no rebuild intended. Low-effort review, do when founder has time.
- ~~**Shorter About bark hero.**~~ **Done 2026-07-19**, founder-approved (44vh, `lockAspect`). Kept caveat: `lockAspect` fixes dash shape not scale, so About renders a finer sparser grain than Home by design; to re-weight it, the knob is `density` (~600), not dash width.
- **BDL-005 optional screenshots (deferred 08-26-26).** Both images the refresh pack marked for reshoot were reshot in the 08-26 copy refresh (#70), from a phone: `host-console.png` on the #197/#199 console layout (3x2 nav grid, full-width Winner, exit controls, phone-width viewport), and `host-trivia.png` on the Swiftie theme, so the tier row shows the Final Boss tier the pack specifically asked to feature. The five files the pack marked Keep are untouched, and every image `bdl-005.md` references exists. Three of the pack's four additive shots then landed too, all from a real paired TV client: the pre-show readiness line (which host preview and Mirror both suppress, so it could only ever come from a paired TV), the closing send-off card with its QR, and the winner hold against the paragraph about the lingering-winner fix. The hold frame goes in alone: the pack offered a before/after pair, but the paragraph is about the screen no longer leaving the last winner up, so the hold IS the fix and the reveal after it only repeats the beat. The announce frame was shot and dropped, and it is the one that showed the studio's own name as grand prize winner on a client's page. Only the installed-PWA look is still unshot, and it is worth doing for its own sake rather than for the page, since it doubles as the still-owed on-device verification. Revisit when it is cheap, not on a deadline. Source of truth for what each shot needs: `docs/bdl005-refresh-pack-8-26-26.md` (untracked, founder working doc).

### 08-28-26 — what the BDL-005 page is allowed to say about the client

Kept here because it is the kind of clearance that gets lost in a merged PR body, and the next session to touch this page will otherwise have to re-ask the owners.

- **Owner-cleared for publication:** the sixty presold tickets and the door walk-ups selling out at the second venue. Cleared by the owners for #70. Anything *further* about their gate, pricing, or headcount is not cleared, and needs asking again rather than inferring from this.
- **The venue does not get named, and does not get blamed.** The 08-20 lag was diagnosed to the iPad mirroring link, not to the app. The page keeps the exoneration and the hardening that followed, but as of #70 it no longer says the venue's wireless was at fault. The client has to keep booking that room; we do not get to spend their relationship on our engineering anecdote. The constraint (screens mounted out of reach, no borrowable HDMI, one bar of borrowed wifi) is fine to state, because it is the reason the two-device design exists.
- **The numbers in "The shape of the work" are a dated snapshot, and the basis is fixed.** As of #70 they read 651 commits / 192 merged PRs / 562 tests / 19,685 LOC, which is C&C `main` at 08-26-26, matching this page's frontmatter date. LOC basis, reproducible: tracked files on C&C `main`, extensions `.ts/.tsx/.astro/.mjs/.css/.py`, under `src/` `scripts/` `tests/` `studio/` `workers/` plus root config; excludes docs, lockfile, dist, assets, binaries. Re-pull all four on the same basis or leave them alone; do not refresh three and strand the fourth.

- ~~**Flip the host from Cloudflare Pages to Workers.**~~ **DONE 2026-07-29.** Worker live on both domains, Pages project deleted, verified in prod. ~~Remainder: Email Sending onboarding deferred (paid plan, founder call); until then the form markup stays in its named git stash and /contact is mailto-only.~~ **Contact form SHIPPED and LIVE 08-19-26** (PRs #36 / #43 / #45): the Worker was always deployed; only the front-end markup was stashed. It emails the verified Email Routing destination `birchdesignlab@gmail.com`, which is **free on all plans** — no Email Sending onboarding / paid plan needed. The 405 that blocked real submits was Cloudflare Static Assets intercepting navigation POSTs before the Worker; fixed with `assets.run_worker_first: ['/api/*']`. The old `stash@{0}` is now obsolete (safe to drop). Rationale and deploy config: `docs/deploy.md`; supersedes the spec's "Pages Functions" renovation path.

- **Privacy policy refinement.** `/privacy` shipped 08-19-26 with basic,
  accurate copy (Google Analytics + contact form, the only two data flows the
  site has), linked from the footer. First-draft, not final: a founder
  voice-and-legal pass is owed (copy is founder territory per the writing
  rules). Three concrete edits waiting on real facts: (1) state the actual GA
  data-retention setting once confirmed in GA Admin, Data Settings; (2) add a
  Google Ads clause on advertising cookies and remarketing when Ads goes live,
  the tag is already in place so only the disclosure is missing; (3) a proper
  legal review if the business takes on clients with their own compliance
  needs. Page and file header: `src/pages/privacy.astro`.

- **Curator's note placards on studies.** Founder liked the concept 2026-07-29, deferred: repurpose the wall-label form (square-tagged placard) as a short curator's note on study pages ("Commissioned work. Client's own vendor accounts throughout."). Cheap build: optional `note` field on the study schema branch, rendered in wall-label styling near the plate block. Decide during the Lab theme pass, which owns placard furniture.

- **Theme-pass triage from the BDL-005 final review (2026-07-29).** Extract the shared chrome-free shell (StudyLayout duplicates ExperimentLayout's hatch/head; the hatch pill has two sources of truth). Add an `aria-live` count to the catalog filter so assistive tech hears result changes. Give `/lab/studies` a deliberate empty state in case a study is ever pulled. Study loud band ships static (no reveal JS on study pages per spec); theme pass decides its motion. Imagery rule for future studies: capture heroes at 1920px+ so responsive widths stay honest. Recapture host-console.png against the production live app someday (localhost URL visible in frame).

- **BDL-005 founder follow-ups.** Two Sanity Studio captures (event editor, Caller readiness tool) blocked on your Studio OAuth; when convenient, log in while a capture session runs and they slot into "The controls they keep" without structural change. One real-browser visual pass over /lab, /lab/studies, and /lab/bdl-005 (the session's preview pane could not composite frames; structural checks all passed). First-draft copy across the study and catalog awaits your content pass.

- **MDX for study narratives, post-theming.** Founder call 2026-07-29 during the BDL-005 design round: studies author in plain markdown (blockquote commentary asides) for now; add the MDX integration after the Lab theme pass so component-rich narratives (galleries, embeds, asides as components) become possible without pre-theming one-off components.

- **A real logo — LOCKED 2026-08-13.** A stem with two chevron branches, drawn
  twice at a 12px offset: one stroke neutral (stone at night, leather by day),
  one canopy green, screen-blended on charcoal and multiply on paper. Files in
  `assets/brand/logos/`; the outcome, including what it closed and what it did
  not, is at the foot of [`docs/brand-brief.md`](brand-brief.md).

  Notable: it is **not** horizontal dashes. Every earlier candidate was, which
  is what the brief pointed out and what the round finally tested.

  **Adoption is the open half, and it is mechanical.** The site still serves the
  generated favicon and `public/og/logo.png`; favicon, OG cards, the web
  manifest, and the site header and footer all still point at the placeholder.
  The 2026-08-08 dense-bark mark and its lockups are superseded, and so is the
  Cheer and Chatter brand kit copied from them. Founder 08-13-26: adoption is
  wanted but deliberately later.

  **The asset pipeline is finished and scripted**, all of it re-runnable after
  the re-export the kit expects:

  - `scripts/brand/outline-logo-text.mjs` — outlines the wordmarks to Marcellus
    paths. **Run this first after any re-export**, or the marks render in a
    fallback serif everywhere except the review sheet.
  - `scripts/brand/inline-logo-animations.mjs` — gives the 11 animated marks
    their own keyframes. Timing is one number per mark here.
  - `scripts/brand/rasterize-logos.mjs` — 29 PNGs of the static set. Refuses to
    run against live `<text>` or a dropped `mix-blend-mode`.

  Both silent-substitution failures this pass hit (a rasteriser dropping the
  blend, a missing font swapping the typeface) are now guarded rather than
  trusted. `assets/brand/logos/README.md` is the operating manual.

- **One loose end from the 2026-08-04 dashboard work.** The Cloudflare Web Analytics beacon is enabled but not appearing in the HTML. Purge cache and recheck; if it is still absent, embed the snippet manually in `HeadCommon.astro`. Documented in `docs/deploy.md`. (A second issue, two simultaneous DMARC records silently disabling DMARC entirely, was found and fixed the same day; the trap is written up in `docs/deploy.md` so it does not recur.)

- **Brand social accounts to `sameAs`.** Founder intends to create the BDL accounts (Postiz mentioned for automation). `sameAs` is deliberately omitted from the Organization structured data while empty rather than emitted as an empty array. When the handles exist they land in two places: Search Console's platform list, and a one-line addition to `src/lib/seo/organization.ts`. This is the single biggest weakness in the brand-search signal and no amount of markup fixes it; only registering the profiles does.

- **Code-review backlog from the SEO pass (2026-08-03), none blocking.** ~~The site description now lives in three places (`src/lib/seo/organization.ts`, `public/site.webmanifest`, and `index.astro`'s meta) and has already drifted.~~ **Partly resolved 08-18-26:** `organization.ts` and the home meta now both derive from a single `SITE_DESCRIPTION` in `src/lib/seo/site.ts`; `public/site.webmanifest` is static JSON and remains a third, hand-synced copy. `site.webmanifest` hardcodes `512x512` against `LOGO_SIZE` in `scripts/og/logo.ts`, two sources of truth with nothing tying them. `scripts/og/logo.ts` exports `renderLogoCanvas`/`BG`/`MARK`/`DASHES` purely for pixel tests. Those tests verify self-consistency rather than fidelity to `favicon.svg`; the fix is a test that parses the SVG's rects. ~~`StructuredData.astro` injects `JSON.stringify` via `set:html` with no escaping of `<`, harmless while every field is a static constant but worth noting before `sameAs` lands.~~ **Resolved 08-18-26:** all JSON-LD now serializes through `serializeJsonLd` (`src/lib/seo/jsonld.ts`), which escapes `<`. Nothing automated covers `StructuredData.astro`, the head slot, or home-page-only JSON-LD placement, which would need a new dist-reading test category. `bdl-006` runs `h1` to `h3`, a skipped level, and the styleguide specimen block still has real `h2`/`h3` while its `h1` is now a styled `p`; both belong to the theme pass.

- **Dependency upgrades: get to newest stable, stay there.** Founder direction 2026-08-04: the standing pattern is **newest stable and secure**. Not bleeding edge, not frozen. The policy itself lives in `CLAUDE.md`; this entry is the work queued against it.

  **Audited 2026-08-04.** Installed Astro is **5.18.2**; `npm audit` reports 9 vulnerabilities (4 high, 3 moderate, 2 low) across three independent groups:

  1. **Astro 5 to 7.1.6** (two majors) pulls `astro`, `esbuild`, `sharp`, and `@astrojs/svelte` 7 to 9. **The advisories are not reachable here**, verified by grep: no `define:vars`, no spread props on elements, no `server:defer`, no SSR, output is static. The one `set:html` takes a static constant. Exposure is a red number in `npm audit`, not a real risk.
  2. **Wrangler to 4.35** (one major) clears the `undici` and `miniflare` highs. Separate from Astro, deploy toolchain rather than site, much smaller blast radius. Worth doing first.
  3. **`fast-uri` and `postcss`** have non-major fixes. Plain `npm audit fix`, no breaking changes, free.

  **Do (3) any time. Do (2) in a quiet window. Do (1) as its own piece of work, and not before 2026-09-01** — there is no security pressure and it competes with the Lab direction session, which is what actually decides whether launch lands.

  What the Astro jump actually touches: content collections (`content.config.ts`, the glob loader, `lab-schema.ts`, and zod if it majors too), `@astrojs/sitemap` compatibility, the three Svelte 5 islands, and `astro:assets` image optimization used by the BDL-005 hero. The 123 tests plus `astro check` catch structural breakage; they do **not** catch rendering and CSS drift, so it needs a real browser pass like the CSP gate got. Fully reversible: revert the commit, redeploy.

  **Done 09-22-26 on the theme-schools branch stack** (`chore/deps-minors`, `chore/astro-7`, then one branch per remaining major). Astro 7.3.4 + @astrojs/svelte 9 + zod 4 landed together; every root and Lab page was pixel-diffed against the Astro 5 build (`scripts/themes/capture.mjs` + `diff-captures.mjs`, GPU). Two regressions surfaced and are fixed in `astro.config.mjs`: `compressHTML` pinned to `true` (the new `'jsx'` default ate whitespace in the copy) and a CSS restore plugin (Astro's CSS plugin cannot restore deleted CSS under Rolldown, which broke `/?tune`). Delete that plugin when Astro restores via `emitFile`.

  **Check on every Astro upgrade (the Portal leans on Astro internals, 09-24-26):**
  - `loadWarmed` in `src/themes/portal/runtime.ts` stands in for Astro's own loader when a warmed page is swapped in; check it against the new router.
  - The arriving wordmark is found by matching the inline style text Astro writes for `transition:name` (`runtime.ts`); a change in that text silently breaks the scrolled-swap wordmark fix.
  - Astro's `@layer astro` wordmark fade (180 ms) is overridden by the README's `inherit` recipe; re-run the wordmark judge (`harness/stage-gates.mjs --steps wordmark`).

  **Held back, with reasons:**
  - **TypeScript 7.0** ships no classic compiler API (its package exports only `version.cjs` plus `unstable/*` native bindings), and `@astrojs/check` 0.9.10 peers on `typescript ^5 || ^6`. On TS 7 the typecheck gate would not run, which is the failure mode `npm run verify` exists to prevent. Pinned to **TypeScript 6.0.x**, the newest version the gate supports; `astro check` proven live on it with a planted error. Revisit when `@astrojs/check` / `@astrojs/language-server` add TS 7 support.

## SEO + site-quality pass — 08-18-26

Full pre-launch audit of the whole site across six dimensions (head / metadata /
indexation, structured data + AEO, performance / CWV, content / IA / internal
linking, accessibility, positioning / differentiation), each finding
independently verified. Headline: the SEO **foundation is genuinely strong** —
no indexing bugs, unique titles and descriptions, correct canonicals (apex +
trailing slash matching the sitemap), `lang`, correctly scoped `noindex`,
complete OG core, working sitemap, honest minimal Organization JSON-LD, and
answer-engine-friendly prose (offering / audience / hire-path all crawlable, not
locked in canvas). The real gaps are **conversion, proof, and voice**, not
plumbing.

### Execution since the audit (08-18 / 08-19) — see `docs/handoff-8-19-26.md`

Most of the audit's actionable items shipped this session, in small PRs:

- **Voice unified to studio "we"** (#37), not first-person — the founder tried
  "I" (#35, closed) and reversed. Contact copy followed.
- **Geography + credibility** (#41): "New Orleans to Mobile" on home; an
  enterprise-credibility line on Services. Kept generic per the obfuscation call.
- **Conversion linking**: home closing CTA to /contact (#40); a single
  "How we build ->" services link under the doors (#42).
- **Orphan Lab pages fixed** (#38): the filter chips are now real progressive-
  enhancement `<a href>` links to `/lab/experiments` and `/lab/studies`.
- **Contact form is LIVE** (#36 / #43 / #45): see the Pages-to-Workers item above
  for the full story (405 root cause = Static Assets intercepting nav POSTs, fixed
  with `run_worker_first`; notify inbox is the verified free destination).
- **Process copy tweaks** (#39) and the **sent page** got the shining-tree bark
  hero (#46).

Still open (founder / later): client testimonial (needs C&C wrap + permission),
per-experiment OG art, `sameAs` (needs accounts), font preload + metric fallback,
bdl-007 keyboard, optional WebSite schema / `og:locale` / `llms.txt`, and the
/contact right-hand-space design note.

### Shipped this pass — PR branch `seo/prelaunch-pass`

Nine invisible-correctness fixes (no copy, positioning, or visible-UX change);
vitest 138/138, `astro check` clean, build clean, all dist-verified:

- **BreadcrumbList JSON-LD** on `/lab/<slug>` (Home > The Lab > entry) — the one
  schema type here that yields a visible SERP rich result, from data already on
  hand. Guarded off for noindexed instruments. A `<slot name="head" />` was added
  to both Lab layouts to carry it.
- **Service JSON-LD** on `/services` (plain `Service`, provider = Organization,
  the two offerings as `serviceType`). Entity / AEO signal; deliberately not
  `ProfessionalService` (that is a LocalBusiness subtype and would invite
  address warnings against the founder-abstracted, no-local-intent posture).
  *Partly superseded 08-28-26 — see "Gulf Coast positioning" below. The
  `/services` node is still a plain `Service`; the home-page node is not.*
- **`main` is focusable** (`tabindex="-1"`) on every layout so the skip link
  moves focus, not just scroll position; **skip link added to the two Lab
  layouts** (they carry no SiteHeader). `.skip` hoisted to `base.css` so all
  layouts share one treatment.
- **Theme toggle** now exposes state to assistive tech: dynamic `aria-label`
  ("Switch to light/dark theme") plus `aria-pressed`, synced on load and on
  toggle.
- **`og:image:alt` + `twitter:image:alt`** (per-page title).
- **`Cache-Control: public, max-age=31536000, immutable` on `/_astro/*`** in
  `public/_headers` (content-hashed, safe forever). Unhashed `/models/*` and
  `/draco/*` are deliberately still uncovered — see the follow-up below.
- **404 `noindex`** (belt-and-suspenders; still confirm the Worker returns a true
  404 status for unmatched routes).
- **Description de-dup**: `organization.ts` and the home meta now derive from
  `SITE_DESCRIPTION` in `src/lib/seo/site.ts` (webmanifest remains a hand-synced
  third copy).
- **Latin-only fonts on the business pages**: `BaseLayout` imports
  `@fontsource/marcellus/latin.css` + spectral `latin-400/600`. Home and services
  CSS bundles verified free of cyrillic / greek / vietnamese / latin-ext.
- Also folded in: `StructuredData.astro` now serializes via `serializeJsonLd`
  (escapes `<`), closing the 08-03 set:html note.

### Founder territory — copy / positioning (before or at launch)

Not touched, per the writing rules. These are the highest-impact items and they
are yours:

- **Unify the voice to one register (HIGH).** Copy flip-flops "we" ↔ "I" across
  home / services / contact, quietly contradicting the one-accountable-person
  wedge that is the entire differentiator (`index.astro:30` singular vs `:43` /
  `:61` "we"; `contact.astro:14` "I answer" vs `:21` "Tell us"). About and
  Contact are emphatically singular. Pick one register and hold it site-wide;
  first-person singular is the braver, on-brand choice. Subsumed by the queued
  business-page copy rewrite — raise its priority.
- **One real client testimonial (HIGH).** No client-attributed quote exists
  anywhere; the Cheer & Chatter client already cleared publishing "basically
  anything." A named human vouching de-risks "unknown solo vs agency" more than
  any craft copy. Place a pull-quote on home (near "From the lab") and on the
  BDL-005 study. Needs client outreach.
- **Segment / local phrase on the money pages (MED).** "small business" appears
  nowhere in `src/pages`; "Gulf Coast" only mid-paragraph on About. One honest
  mention of the segment / geography in the Services intro and/or home subline
  captures local + long-tail intent a solo local studio can realistically win.
- **Services H1 could carry the service keyword (LOW).** H1 is "Two things, done
  properly." while "custom software / websites" live only in the H2s and title.
  Optional; home H1 as brand name is fine.
- **Pricing posture (MED).** No price, range, or model anywhere; a bespoke,
  custom-everything studio with no numbers can read "expensive and
  unpredictable." A quiet-luxury posture line (not a menu) — e.g. "leave
  discovery with a plain-language scope and a fixed number" — removes the
  open-ended-bill fear. Founder decision.
- **Contact context (MED).** Mailto-only with no service-area or response-time.
  Independent of the stashed form: add a service-area line and an "I reply within
  one business day" promise to /contact and/or the footer.
- **Provisional copy is still shipping.** Every business page carries a
  `<!-- provisional copy -->` marker. Lock a finished home hero / opener,
  Services intro, and Contact CTA before 9/1; Lab specimen copy can trail.
- **"Studies" is plural with one entry (LOW).** Soften the plural framing or
  fast-track a second study; the single study is strong enough to headline.

### Standout moves (the "how do I stand out" ask)

- **Name the bark (LOW effort, highest payoff).** The living BarkField behind
  home and about IS BDL-001, a working generative system, but nothing on the page
  says so. One restrained line near the hero ("The bark behind this page is
  generated live") linking to BDL-001 converts ambient craft into a felt "wow" on
  the highest-traffic page without breaking quiet luxury. Best impact-to-effort
  on the site.
- **Client testimonial** (above) — also the top trust lever.
- **Adopt the locked mark** in header / footer. Both are text-only today while
  the 08-13 locked mark sits unused; cheapest perceived-polish lift with a
  finished asset behind it. (Adoption was deliberately deferred; this is a design
  call, not an oversight.)

### Technical follow-ups — not shipped, ranked

- **Homepage internal linking + conversion (MED).** Home's only body link goes to
  /lab; the Software / Websites "doors" do not link to /services and there is no
  body CTA to /contact. Wire the doors to /services and add a "Start a project"
  CTA (the existing `.cta-engraved` pattern). Structural, but the anchor copy is
  founder territory, so it stayed out of the invisible batch.
- ~~**Orphan `/lab/experiments` + `/lab/studies` (MED).**~~ **DONE** — fixed by
  #38 and this list was never updated. `dist/lab/index.html` carries real
  `href="/lab/experiments"` and `href="/lab/studies"` anchors. Verified 08-28-26.
- ~~**Cache headers for `/models/*` + `/draco/*` (MED).**~~ **DONE, both halves.**
  `public/models/` no longer exists: the glb is imported via `?url` and ships
  content-hashed as `/_astro/bdlOrganic.draco.<hash>.glb`, so it is already
  covered by the `/_astro/*` immutable rule. Confirmed against production
  08-28-26 — that URL returns `Cache-Control: public, max-age=31536000,
  immutable`. `/draco/*` got its own 7-day + `stale-while-revalidate` rule in
  `public/_headers`. Nothing left to do.
- **Latin-subset the Lab-detail + styleguide fonts (LOW).** `ExperimentLayout`
  and `StudyLayout` still import bare `@fontsource/marcellus` + full spectral;
  styleguide loads six families at full subset (its purpose is type specimens, so
  check before trimming). Only latin glyphs are ever used, but `unicode-range`
  already prevents the download, so this is CSS / request hygiene, not bytes. The
  business pages are already done.
- **Font preload + metric fallback (LOW) — PRELOAD DONE 08-28-26, fallback still
  open.** The preload half shipped: `BaseLayout` imports the Marcellus and
  Spectral 400 woff2 through `?url` and emits `<link rel="preload" as="font">`
  for both, so all five business pages (home, services, about, contact, privacy)
  fetch them in the first wave instead of after CSS parse. The `?url` import
  matters — it resolves to the same content-hashed asset the stylesheet uses, so
  there is no double fetch; verified in `dist` that the preload href and the CSS
  `url()` carry an identical hash. Spectral 600 is deliberately left out: preloads
  compete for the same early bandwidth and the semibold face is not critical-path.
  The Lab layouts are untouched (different layout, no preload).
  **Still open: the `size-adjust` metric fallback**, which is the half that
  actually removes the CLS rather than shortening it. Held back because it
  changes rendered type and needs a real-browser trace to verify, per the
  standing rule about not shipping visual changes unseen.
- **bdl-007 keyboard control — ACCEPTED AS A LAB EXCEPTION, 08-28-26.** Founder
  call. The three.js stage stays pointer / wheel only. The containment argument
  is what makes it acceptable: the canvas is `role="img"` with a real still image
  and alt text, so a keyboard user is never blocked from the content, only from
  the toy. This is the documented exception, not an outstanding defect. The Lab
  rolls heavy and this is the cost. Revisit only if the Lab grows an experiment
  where the interaction *is* the content.
- **Smaller nits:** ~~optional `WebSite` JSON-LD node (marginal without a
  SearchAction, since there is no site search)~~ **DONE 08-28-26**, shipped
  knowingly marginal: no `SearchAction`, because there is no site search and
  inventing one would be a lie to the crawler. What it buys is a small entity
  signal naming the site, its language, and its publisher. Add the SearchAction
  if a site search ever ships; ~~`og:locale=en_US`~~ **DONE
  08-28-26**, in `Seo.astro` so every page carries it; `CreativeWork` on the
  study page (still open, and more attractive now that `/services` will point at
  BDL-005); ~~a speculative `public/llms.txt`~~ **DECLINED** on evidence, see the
  AEO section below; ~~verify the deployed host 3xx-redirects the slashless
  `/path` to `/path/`~~ **VERIFIED 08-28-26** — production returns `307` to the
  trailing-slash URL on both `/services` and `/lab/bdl-005`.

### Still-open known items, re-confirmed accurate by this pass

`sameAs` (blocked on real social accounts existing — the single biggest
brand-entity gap, and only registering the profiles fixes it), per-experiment OG
art (deferred), bdl-006 h1→h3 skip (noindexed instrument), and the
`site.webmanifest` 512x512 / description hand-sync. All unchanged.

### Founder responses to the audit (08-18-26, same session)

- **Voice / identity (audit #1).** Founder constraint: identity must stay
  obfuscated while a day-job noncompete is unresolved (founder is a 10-year
  engineer). The real protection is that no personal name appears anywhere, not
  the choice of "we" vs "I"; the live defect is the *inconsistency*. Revised
  recommendation: pick one register and hold it, leaning to an **unnamed studio
  "we"** for the most distance from the individual, keeping the accountability
  promise without "I", and reviewing About's biographical specifics ("one man",
  "over a decade on the Gulf Coast") as possible identity breadcrumbs. Not legal
  advice: an employment lawyer should read the noncompete; enforceability varies
  by state and obfuscation is not a legal shield.
- **Testimonial (audit #2).** Decision: place the client quote *inside* the
  BDL-005 specimen as a pull-quote, not a separate testimonials page. Blocked on
  Cheer & Chatter fully wrapping and the founder asking permission.
- **Homepage links (audit #3).** Confirmed: the only /services link was just
  removed, and there was never a body link to /contact (header/footer only).
  Reinforces the "homepage internal linking + conversion" follow-up.
- **Orphan /lab/experiments + /lab/studies (audit #4).** Confirmed intentional:
  they exist as crawlable category URLs because the in-page /lab filter is JS and
  does not navigate. The gap stands anyway: nothing links to them, so they are
  orphans. Fix that honors the intent = wire real links to them (progressive-
  enhancement anchors on the filter chips, or a "Browse: Experiments / Studies"
  line in the /lab intro), rather than canonicalizing them away.
- **Pricing (audit #9).** Decision: founder will not list prices (has a rough
  base structure from market-asking). Reduce to at most a no-numbers reassurance
  line ("leave discovery with a fixed number before any commitment"), or drop.
- **Provisional copy (audit #8).** Founder ran a copy pass 08-18-26; improved.
  Remove the `<!-- provisional copy -->` markers as each page is finalized.
- **Contact form / plan (audit #10) — RESOLVED via Cloudflare docs 08-18-26.**
  The paid-plan assumption in `docs/deploy.md` is wrong for a self-notifying
  form. Current Cloudflare Email Service docs
  (`/email-service/platform/pricing/`, `/platform/limits/`):
  - Sending to **arbitrary recipients requires Workers Paid.**
  - **Sending to a verified destination address in your account is free on all
    plans, "including when only Email Routing is configured,"** and such sends
    "do not count toward your monthly quota or your daily sending limits."
  - So a contact form that only notifies the owner is the **free** case, with no
    Workers Paid and no `wrangler email sending enable` (Email Routing alone
    suffices), **provided the Worker sends to a verified Email Routing
    destination** (the real inbox), not an arbitrary address.
  - Action to ship free: (1) confirm the owner inbox is a verified Destination
    address in Email Routing (it already is — hello@ forwards there);
    (2) set `CONTACT_TO` in `worker/index.ts` to that verified destination (or
    test whether sending to the `hello@` routing address also qualifies — the
    one thing worth a live test); (3) `git stash pop` the form, wire it into
    `contact.astro`, add the two missing Worker response headers
    (`docs/deploy.md` "Headers the Worker must set"); (4) deploy, send a test,
    confirm receipt; own PR. Limits on the free path: 50 recipients/msg, 25 MiB.
  - The service-area / response-time copy line on /contact needs no plan either
    way. Supersedes `docs/deploy.md` "One-time setup" step 2's paid-plan gate.

## Gulf Coast positioning — 08-28-26 (founder call, days before launch)

The founder read the live SERP snippet, disliked it, and rewrote it. The new
blurb names the region and the model in the founder's own words:

> Custom software and websites for businesses across the Mississippi Gulf Coast
> that want to grow and thrive. Concocted in a lab where the same hands that
> build your site answer your email.

That copy already existed as the home-page opener; the meta had simply never
followed it. It is now `SITE_DESCRIPTION` in `src/lib/seo/site.ts`, which the
home meta, the webmanifest, and the structured data all derive from. The
tagline sentence is exported separately as `SITE_TAGLINE` for the places that
want the short form.

**Length, knowingly.** The full blurb is 187 characters. Google renders roughly
155, so the second sentence clips in the result. Accepted: the region keyword
sits in the part that survives, and the hook still reads as entity text for
answer engines. The old ", Quiet, fast, built to last." tail was dropped rather
than pushing to 215.

**The schema posture reversed.** Every earlier note in this file and in
`organization.ts` said no LocalBusiness subtype, because there was no
local-search intent and the subtype would only invite address warnings. Naming
the Gulf Coast is local-search intent. So:

- The home-page node is now `ProfessionalService` (a subtype of both
  `LocalBusiness` and `Organization`) with
  `areaServed: { "@type": "AdministrativeArea", name: "Mississippi Gulf Coast" }`.
  One node, not two, so the page still declares a single entity.
- `/services` stays a plain `Service`, now carrying the same `areaServed` and
  naming `ProfessionalService` as its `provider`.
- `address`, `telephone`, and `founder` stay absent. The identity call is
  unchanged.

**Known and accepted:** Search Console's LocalBusiness report will flag a
missing `address`. `address` is not required by schema.org and the markup stays
valid without it; what it costs is the local rich result, which a business with
no publishable street address was never eligible for. Revisit if an address
ever becomes publishable.

**Not done, founder territory:** a Google Business Profile. The schema says
"Gulf Coast"; nothing yet corroborates it in Google's local index. The markup
is the cheap half of local SEO and the profile is the half that actually ranks.

### AEO — investigated 08-28-26, deliberately declining both

Asked whether to serve markdown to AI crawlers, and whether to add `llms.txt`.
Answer to both is no, on current evidence:

- **Markdown content negotiation.** No major crawler sends
  `Accept: text/markdown` by default, so the endpoint rarely fires. Bing fetches
  both representations and diffs them, making it extra crawl load rather than a
  saving. The token savings accrue to the crawler's inference bill, not to us.
  Google's John Mueller called the idea "a stupid idea" publicly (02-26).
- **`llms.txt`.** Of 500M+ AI bot visits measured over 90 days, 408 touched
  `/llms.txt`. A second study: 84 of 62,100. GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot and Google-Extended skip it and crawl the HTML. No major
  provider has committed to reading it; Google's Gary Illyes said outright that
  they do not and will not. It stays on the optional list from the 08-18 pass,
  and it should stay unbuilt.

What actually carries AEO here is the HTML the engines already crawl, which is
in good shape, plus one thing we have not done: `public/robots.txt` allows every
crawler, which is correct and worth protecting. The retrieval bots
(`OAI-SearchBot`, `PerplexityBot`, `ChatGPT-User`, `Claude-User`) are the ones
that can cite us, as distinct from the training crawlers. Blocking them is the
one self-inflicted AEO wound available and we have not made it. Do not.

### SEO — the copy-pass list (founder, not started)

Audited 08-28-26 against the built pages and the real competitive set. The
technical side is at or near its ceiling; what is left is copy and two
decisions. **The founder has this on their list; nothing below is started.**

Competitive read: the Gulf Coast field is templated location-page shops
(DreamCo, Toucan, TurkReno's page-per-zip-code, Standard American Web, Gulf
Coast Web). The bar is low and this is a winnable niche on merit.

**Titles are the weak link.** Every page is `<Thing> · Birch Design Lab`. The
title tag is still the strongest on-page signal, and brand-first titles are for
brands that already have search demand. Put the query first, brand last, under
~60 characters, `·` not emdashes:

| Page | Now | Targets |
|---|---|---|
| `/` | `Birch Design Lab · Custom software and websites` | no geography |
| `/services` | `Services · Birch Design Lab` | nothing; "services" is not a query |
| `/about`, `/contact` | `About` / `Contact · Birch Design Lab` | fine as they are |

**Four copy notes, none of which cost the voice:**

1. The first 100 words of `/services` should contain the query. The second
   subline ("the businesses that keep the Gulf Coast running") already does the
   work; it just sits too late.
2. H1s keep the voice as long as the title tag carries the query. "Two things,
   done properly." and "The shining tree" stay. The title tag pays the tax.
3. One `<h2>` per page in plain words. "Custom software" / "Custom websites"
   already qualify.
4. Name the towns once, naturally. People search Gulfport, Biloxi, Ocean
   Springs, Pascagoula, Bay St. Louis, not "Gulf Coast". One honest sentence, not
   a stuffed footer.

Pages run 394-675 words. Thin for commercial queries; `/services` would carry
another 200-300 words of substance well.

**Two decisions that are the founder's:**

- **Page architecture.** Competitors rank on location and service pages. The
  zip-code doorway version is what Google's doorway guidance targets and would
  poison the brand besides. The defensible version is a few genuinely distinct
  pages on the three verticals the copy already names (restaurants, charters,
  venues). Three good pages beat thirty thin ones.
- **The NAP problem, which gates everything else.** Local SEO runs on consistent
  Name / Address / Phone across the web, and we publish none of it on purpose.
  Google Business Profile is the single highest-leverage item on this list and
  it needs a verifiable address and a phone number. A service-area business can
  hide the street address publicly, but Google still verifies against a real one,
  and the Google Voice number is already gated behind the card-printing
  decision. Reviews are a direct local ranking factor and cannot start until the
  profile exists. So: resolve how much identity surface is acceptable, or defer
  knowingly. Everything else here is worth less than that one call.

**Code-side, available on request, no voice impact:** retitle the four pages
(wording founder-approved), `og:locale`, an internal-linking pass with
descriptive anchor text in place of "How we build ->", and an image `alt` audit.

## Documented renovation paths (recorded elsewhere, listed for completeness)

These are not ideas to develop here; the website spec and core plan already carry them: contact form via Cloudflare Pages Functions (**superseded** — see the Pages-to-Workers item above), Sanity CMS swap via Content Layer loader, Tailwind as a per-island addition, Google Workspace for send-as on hello@.
