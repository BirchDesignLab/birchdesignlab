# Lab Backlog

*Experiment concepts agreed 2026-07-16, evening session. Parent documents: founding record, website spec, handoff. BDL-003 Novgorod Letters is specced and in build; everything here comes after. Each concept gets its own spec at its own build time, per house practice.*

## Numbering vs build order

BDL-004 originally reserved the Painting (view-source CSS feat). Reassigned 2026-07-16 evening: the goal right now is quick wins before the link spreads, the Painting is the most expensive item on this page, and 003 is already a heavy build. The Loom takes 004; the Painting returns to the backlog unnumbered and gets a number at its own build time.

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
- **Design sweep planned within roughly a month** (stated 2026-08-08): primary-lockup pick (side-by-side vs canopy), favicon/OG adoption of the new mark, light-face variants. The copy rewrite rides the same window.

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

- ~~**Flip the host from Cloudflare Pages to Workers.**~~ **DONE 2026-07-29.** Worker live on both domains, Pages project deleted, verified in prod. Remainder: Email Sending onboarding deferred (paid plan, founder call); until then the form markup stays in its named git stash and /contact is mailto-only. Rationale and deploy config: `docs/deploy.md`; supersedes the spec's "Pages Functions" renovation path.

- **Curator's note placards on studies.** Founder liked the concept 2026-07-29, deferred: repurpose the wall-label form (square-tagged placard) as a short curator's note on study pages ("Commissioned work. Client's own vendor accounts throughout."). Cheap build: optional `note` field on the study schema branch, rendered in wall-label styling near the plate block. Decide during the Lab theme pass, which owns placard furniture.

- **Theme-pass triage from the BDL-005 final review (2026-07-29).** Extract the shared chrome-free shell (StudyLayout duplicates ExperimentLayout's hatch/head; the hatch pill has two sources of truth). Add an `aria-live` count to the catalog filter so assistive tech hears result changes. Give `/lab/studies` a deliberate empty state in case a study is ever pulled. Study loud band ships static (no reveal JS on study pages per spec); theme pass decides its motion. Imagery rule for future studies: capture heroes at 1920px+ so responsive widths stay honest. Recapture host-console.png against the production live app someday (localhost URL visible in frame).

- **BDL-005 founder follow-ups.** Two Sanity Studio captures (event editor, Caller readiness tool) blocked on your Studio OAuth; when convenient, log in while a capture session runs and they slot into "The controls they keep" without structural change. One real-browser visual pass over /lab, /lab/studies, and /lab/bdl-005 (the session's preview pane could not composite frames; structural checks all passed). First-draft copy across the study and catalog awaits your content pass.

- **MDX for study narratives, post-theming.** Founder call 2026-07-29 during the BDL-005 design round: studies author in plain markdown (blockquote commentary asides) for now; add the MDX integration after the Lab theme pass so component-rich narratives (galleries, embeds, asides as components) become possible without pre-theming one-off components.

- **A real logo — mark CHOSEN 2026-08-08 (PR #9), adoption pending.** The
  dense-bark scatter mark and two lockups live in `assets/brand/` (lockups
  generated by `scripts/brand/build-lockups.mjs`; never hand-edit them). The
  generated favicon scale-up at `public/og/logo.png` is still what the site
  serves — swapping favicon/OG/manifest onto the new mark, and picking the
  primary lockup, belongs to the design sweep (direction set 2026-08-13).
  Replacing the file needs no code change.

- **One loose end from the 2026-08-04 dashboard work.** The Cloudflare Web Analytics beacon is enabled but not appearing in the HTML. Purge cache and recheck; if it is still absent, embed the snippet manually in `HeadCommon.astro`. Documented in `docs/deploy.md`. (A second issue, two simultaneous DMARC records silently disabling DMARC entirely, was found and fixed the same day; the trap is written up in `docs/deploy.md` so it does not recur.)

- **Brand social accounts to `sameAs`.** Founder intends to create the BDL accounts (Postiz mentioned for automation). `sameAs` is deliberately omitted from the Organization structured data while empty rather than emitted as an empty array. When the handles exist they land in two places: Search Console's platform list, and a one-line addition to `src/lib/seo/organization.ts`. This is the single biggest weakness in the brand-search signal and no amount of markup fixes it; only registering the profiles does.

- **Code-review backlog from the SEO pass (2026-08-03), none blocking.** The site description now lives in three places (`src/lib/seo/organization.ts`, `public/site.webmanifest`, and `index.astro`'s meta) and has already drifted. `site.webmanifest` hardcodes `512x512` against `LOGO_SIZE` in `scripts/og/logo.ts`, two sources of truth with nothing tying them. `scripts/og/logo.ts` exports `renderLogoCanvas`/`BG`/`MARK`/`DASHES` purely for pixel tests. Those tests verify self-consistency rather than fidelity to `favicon.svg`; the fix is a test that parses the SVG's rects. `StructuredData.astro` injects `JSON.stringify` via `set:html` with no escaping of `<`, harmless while every field is a static constant but worth noting before `sameAs` lands. Nothing automated covers `StructuredData.astro`, the head slot, or home-page-only JSON-LD placement, which would need a new dist-reading test category. `bdl-006` runs `h1` to `h3`, a skipped level, and the styleguide specimen block still has real `h2`/`h3` while its `h1` is now a styled `p`; both belong to the theme pass.

- **Dependency upgrades: get to newest stable, stay there.** Founder direction 2026-08-04: the standing pattern is **newest stable and secure**. Not bleeding edge, not frozen. The policy itself lives in `CLAUDE.md`; this entry is the work queued against it.

  **Audited 2026-08-04.** Installed Astro is **5.18.2**; `npm audit` reports 9 vulnerabilities (4 high, 3 moderate, 2 low) across three independent groups:

  1. **Astro 5 to 7.1.6** (two majors) pulls `astro`, `esbuild`, `sharp`, and `@astrojs/svelte` 7 to 9. **The advisories are not reachable here**, verified by grep: no `define:vars`, no spread props on elements, no `server:defer`, no SSR, output is static. The one `set:html` takes a static constant. Exposure is a red number in `npm audit`, not a real risk.
  2. **Wrangler to 4.35** (one major) clears the `undici` and `miniflare` highs. Separate from Astro, deploy toolchain rather than site, much smaller blast radius. Worth doing first.
  3. **`fast-uri` and `postcss`** have non-major fixes. Plain `npm audit fix`, no breaking changes, free.

  **Do (3) any time. Do (2) in a quiet window. Do (1) as its own piece of work, and not before 2026-09-01** — there is no security pressure and it competes with the Lab direction session, which is what actually decides whether launch lands.

  What the Astro jump actually touches: content collections (`content.config.ts`, the glob loader, `lab-schema.ts`, and zod if it majors too), `@astrojs/sitemap` compatibility, the three Svelte 5 islands, and `astro:assets` image optimization used by the BDL-005 hero. The 123 tests plus `astro check` catch structural breakage; they do **not** catch rendering and CSS drift, so it needs a real browser pass like the CSP gate got. Fully reversible: revert the commit, redeploy.

## Documented renovation paths (recorded elsewhere, listed for completeness)

These are not ideas to develop here; the website spec and core plan already carry them: contact form via Cloudflare Pages Functions (**superseded** — see the Pages-to-Workers item above), Sanity CMS swap via Content Layer loader, Tailwind as a per-island addition, Google Workspace for send-as on hello@.
