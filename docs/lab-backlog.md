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

- **Tonight's Sky.** ~~Shelved.~~ **UNSHELVED 2026-08-03.** Star chart of the visitor's actual sky, computed client-side from clock and location. It was shelved because the location prompt ruins immersion and Lab pieces stayed permission-free. That rule is dead: founder direction 2026-08-03 is that the Lab may use location, camera, microphone, accelerometer, or anything else an experiment needs. "The lab is the lab and the lab is free." Still overlaps the Orrery conceptually, so sequence them deliberately rather than building both.
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
- **GSAP is in.** Recorded above under the concept list. The website spec already reserved it as an island-scoped future Lab piece, so nothing structural blocks it.
- **A real logo.** The generated 512x512 mark is a placeholder; see the note in the parked list below.

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
- ~~**Shorter About bark hero (~1/2 homepage height).**~~ **Done 2026-07-19.** About's hero is now `min-height: 44vh` with `lockAspect` on its `BarkField`, founder-approved on sight. One consequence worth knowing before touching it again: `lockAspect` fixes dash *shape*, not dash *scale*. Because locked dash width is measured against canvas height, About's lenticels render ~4x narrower than Home's (mean 10.7px vs 42.9px at 1265px wide) and ink coverage fell from 3.83% to 0.98%, so About reads as a finer, sparser grain than Home's bold marks. That is the current intent. If a future pass wants About's marks to carry Home's visual weight, the knob is `density` (~600 restores 3.87% coverage, matching About's old weight with many more fine marks); matching Home's mark *size* instead would need wider dashes in `pattern.ts`, which is generation, not draw.

- **Flip the host from Cloudflare Pages to Workers.** ~~Agreed 2026-07-19.~~ **DONE 2026-07-29.** Worker live on both domains via Workers Builds, Pages project deleted, endpoint verified in prod. One remainder: Email Sending onboarding deferred (paid plan, founder call); until then the form markup stays held back locally and /contact is mailto-only. Original rationale kept below.
  Agreed 2026-07-19. The site is on Pages today, which is correct for a purely static build: Cloudflare runs `npm run build` and serves `dist` off the CDN, no per-request code. The contact form changes that, and the founder expects it sooner rather than later. Cloudflare has been steering new projects toward Workers and treating Pages as the settled path, and Workers Static Assets now covers the static side, so the form is the natural moment to move rather than bolting a Pages Function onto a product being wound down. Note this supersedes the "contact form via Cloudflare Pages Functions" renovation path recorded in the website spec and core plan; do the migration and the form as one piece of work, not two. Deploy config that has to survive the move is in `docs/deploy.md` (build command, output dir, the `.nvmrc` Node pin, custom domain).

- **Curator's note placards on studies.** Founder liked the concept 2026-07-29, deferred: repurpose the wall-label form (square-tagged placard) as a short curator's note on study pages ("Commissioned work. Client's own vendor accounts throughout."). Cheap build: optional `note` field on the study schema branch, rendered in wall-label styling near the plate block. Decide during the Lab theme pass, which owns placard furniture.

- **Theme-pass triage from the BDL-005 final review (2026-07-29).** Extract the shared chrome-free shell (StudyLayout duplicates ExperimentLayout's hatch/head; the hatch pill has two sources of truth). Add an `aria-live` count to the catalog filter so assistive tech hears result changes. Give `/lab/studies` a deliberate empty state in case a study is ever pulled. Study loud band ships static (no reveal JS on study pages per spec); theme pass decides its motion. Imagery rule for future studies: capture heroes at 1920px+ so responsive widths stay honest. Recapture host-console.png against the production live app someday (localhost URL visible in frame).

- **BDL-005 founder follow-ups.** Two Sanity Studio captures (event editor, Caller readiness tool) blocked on your Studio OAuth; when convenient, log in while a capture session runs and they slot into "The controls they keep" without structural change. One real-browser visual pass over /lab, /lab/studies, and /lab/bdl-005 (the session's preview pane could not composite frames; structural checks all passed). First-draft copy across the study and catalog awaits your content pass.

- **MDX for study narratives, post-theming.** Founder call 2026-07-29 during the BDL-005 design round: studies author in plain markdown (blockquote commentary asides) for now; add the MDX integration after the Lab theme pass so component-rich narratives (galleries, embeds, asides as components) become possible without pre-theming one-off components.

- **A real logo.** The 512x512 mark at `public/og/logo.png` is generated at
  build time from the favicon geometry and is a placeholder: it is a faithful
  scale-up of a 32px favicon, so the padding is proportionally large and the
  lenticels sit small in the frame. Fine for a knowledge-panel logo, wrong for
  a real mark. Founder verdict 2026-08-03: "logo sucks but it's fine for now."
  Try Claude's design tooling or an MCP first; commission someone if that does
  not land. Replacing the file needs no code change, the structured data and
  manifest already point at that path.

- **Astro 5 to 7 upgrade.** npm audit (2026-07-29) flags Astro <=7.0.9 advisories (XSS in define:vars/spread props/server islands, plus vulnerable esbuild/sharp pins). All involve rendering untrusted data, which this static site does not do, so exposure is near zero today; the contact Worker escapes its own output. Still worth doing as its own piece of work: `npm audit fix --force` jumps two majors and should not be run casually. Do it when the stack is quiet, run the full test suite and a visual pass after.

## Documented renovation paths (recorded elsewhere, listed for completeness)

These are not ideas to develop here; the website spec and core plan already carry them: contact form via Cloudflare Pages Functions (**superseded** — see the Pages-to-Workers item above), Sanity CMS swap via Content Layer loader, Tailwind as a per-island addition, Google Workspace for send-as on hello@.
