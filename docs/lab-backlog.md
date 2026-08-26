# Lab Backlog

*Experiment concepts agreed 2026-07-16, evening session. Parent documents: founding record, website spec, handoff. BDL-003 Novgorod Letters is specced and in build; everything here comes after. Each concept gets its own spec at its own build time, per house practice.*

## Numbering vs build order

BDL-004 originally reserved the Painting (view-source CSS feat). Reassigned 2026-07-16 evening: the goal right now is quick wins before the link spreads, the Painting is the most expensive item on this page, and 003 is already a heavy build. The Loom takes 004; the Painting returns to the backlog unnumbered and gets a number at its own build time.

## In flight

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
- **BDL-005 screenshot reshoots (deferred 08-26-26).** The 08-26 copy refresh (#70) shipped against the existing images. Two are visually stale: `host-console.png` and `host-trivia.png` predate the #197/#199 console rework, and the trivia shot is a Plant Bingo night whose Final Boss tier reads 0. Captions were kept generic so nothing on the page over-claims what the images show. Founder bailed on the reshoot for now: the capture path (C&C `sweep-live-shots`, or driving the prod console) cost more session time than it was worth. Revisit when it is cheap, not on a deadline. Optional new shots the refresh pack wants if a session ever does this properly: the closing send-off card with its QR, the winner hold, the pre-show readiness line, and the installed-PWA look. Source of truth for what each shot needs: `docs/bdl005-refresh-pack-8-26-26.md` (untracked, founder working doc).

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
- **Orphan `/lab/experiments` + `/lab/studies` (MED).** Both are indexable and in
  the sitemap but have zero inbound links (the /lab filter is in-page JS). Either
  make the /lab filter chips real links to them (progressive enhancement, which
  kills the orphan status) or canonical them to /lab and drop them from the
  sitemap. Do not leave them unlinked-but-indexable.
- **Cache headers for `/models/*` + `/draco/*` (MED).** The 3.2MB glb still
  revalidates every visit (existing "still open" item from BDL-007). Either add a
  rule or hash the glb filename so it can be `immutable` like `/_astro/*` now is.
- **Latin-subset the Lab-detail + styleguide fonts (LOW).** `ExperimentLayout`
  and `StudyLayout` still import bare `@fontsource/marcellus` + full spectral;
  styleguide loads six families at full subset (its purpose is type specimens, so
  check before trimming). Only latin glyphs are ever used, but `unicode-range`
  already prevents the download, so this is CSS / request hygiene, not bytes. The
  business pages are already done.
- **Font preload + metric fallback (LOW).** Marcellus (the home LCP billboard) is
  discovered only after CSS parses and has no metric-adjusted fallback, so it
  FOUT-swaps with a small CLS on the largest type on the site (bounded by the
  fixed-height centered hero). Preload the display + body woff2 on business routes
  and add a `size-adjust` fallback @font-face (or adopt Astro 5's fonts API).
  Verify with a real-browser CLS trace; not Lighthouse-scored.
- **bdl-007 keyboard control (LOW).** The three.js stage is pointer / wheel only
  (WCAG 2.1.1 in principle). Contained because the canvas is `role="img"` with a
  real still + alt fallback. Accept as a documented Lab exception, or add
  `tabindex=0` + arrow / ± keys mirroring the Crown.
- **Smaller nits:** optional `WebSite` JSON-LD node (marginal without a
  SearchAction, since there is no site search); `og:locale=en_US`; `CreativeWork`
  on the study page; a speculative `public/llms.txt`; verify the deployed host
  3xx-redirects the slashless `/path` to `/path/`.

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

## Documented renovation paths (recorded elsewhere, listed for completeness)

These are not ideas to develop here; the website spec and core plan already carry them: contact form via Cloudflare Pages Functions (**superseded** — see the Pages-to-Workers item above), Sanity CMS swap via Content Layer loader, Tailwind as a per-island addition, Google Workspace for send-as on hello@.
