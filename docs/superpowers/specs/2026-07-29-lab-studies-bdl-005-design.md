# Lab Studies + BDL-005 Cheer and Chatter · Design

**Date:** 2026-07-29
**Status:** Approved by founder in session (sections 1-4), pending spec review
**Parents:** `docs/lab-architecture-handoff.md` (the original experiment/study architecture; this spec reconciles it with what shipped), `docs/lab-backlog.md` (Direction set 2026-07-29: Lab becomes the entire portfolio)
**Supersedes:** the schema sketch in `lab-architecture-handoff.md` (accession numbers, separate problem/process/outcome frontmatter fields)

## What this builds

The Lab's second resident type: **studies** (client work), joining experiments in one catalog. First study: **BDL-005, Cheer and Chatter Social Club** (marketing/ticketing site + live event application, delivered 2026-07-28).

## Decisions locked with the founder

1. **Taxonomy:** client entries are called *studies*. They take numbers in the one BDL sequence (Cheer and Chatter = BDL-005; 004 stays burned). "Specimen" remains the umbrella word for anything on the wall.
2. **Catalog:** full three-route structure. `/lab` merged wall + filter toggle, `/lab/experiments`, `/lab/studies`.
3. **Study detail page:** hybrid — chrome-free stage hero, then long-form prose. Built properly now; the Lab theme pass restyles later.
4. **Authoring:** plain markdown body; director's commentary written as blockquotes, styled as voice asides. **MDX is deliberately deferred until after the theme pass** (backlog item).
5. **Disclosure:** effort, stack, and scope in full; **zero dollar figures and zero mention of engagement terms**. Cheer and Chatter is not framed as a first client; they arrived as the business was being stood up.
6. **Imagery:** captured by Claude — public site in the browser; live app and Sanity Studio from a local run against the development dataset. Nothing client-private in frame; crop/blur anything sensitive before it enters the repo.

## Schema: discriminated union (Approach B)

`src/lib/lab-schema.ts` becomes `z.discriminatedUnion('type', [experiment, study])` over a shared base.

- **Base:** `designation` (`/^BDL-\d{3}$/`), `title`, `summary`, `date` (coerced), `tech: string[]`, `status: 'live' | 'forthcoming'` (default live).
- **Experiment** (`type: 'experiment'`): `device` enum as today; optional `howto` (1-4) and `href` (leading `/`); refine keeps "howto or href required".
- **Study** (`type: 'study'`): required `client`, `liveUrl` (full URL), `hero` (`image()` + `alt`); optional `gallery: { src: image(), alt, caption? }[]`. No `device`, no `howto`.

Notes:
- `type` must be authored explicitly in every entry (discriminated unions cannot default it). The three existing entries each gain `type: experiment`.
- `image()` helper: the schema builder gains access to Astro's image context, so `lab-schema.ts` exports a function taking `{ image }` rather than a bare object. Study images live at `src/content/lab/bdl-005/` beside the content and are referenced relatively; templates render via `<Image>` for build-time AVIF/WebP.
- Rationale for the union over optional fields on one flat object: required-ness lives in the type system, half-filled studies fail the build naming the field, and templates get real narrowing (`entry.data.type === 'study'` proves `client` exists).

## Routes and catalog

- **`/lab`** — merged wall, designation-desc sort unchanged. New filter toggle (All / Experiments / Studies): pure in-page show/hide of already-rendered cards. No fetch, no URL change, hence no canonical handling. Square-tag visual family. No-JS: toggle hidden or inert, all cards visible.
- **`/lab/experiments`, `/lab/studies`** — thin filtered indexes sharing a card-list component extracted from `/lab` (one list component, three pages). Real sitemapped pages; `/lab/studies` is the shareable "client work" URL. Neither starts empty (3 experiments / 1 study).
- **`/lab/[slug]`** — generates for every `status: live` entry of either type. Experiment branch: exactly today's flow (`!href` guard, ExperimentLayout, WallLabel, registry component, SpecimenPlate). Study branch: StudyLayout below.
- **`SpecimenCard`** — type chip (EXPERIMENT / STUDY) in the DeviceBadge visual family. Every card shows its type chip first; experiments additionally show the device badge after it. Studies show the type chip only.
- **Home "From the lab"** — no change; the two-newest-live logic naturally admits studies. Founder accepted.

## Study page anatomy (`StudyLayout.astro`)

Sibling of ExperimentLayout: no SiteHeader, fixed back-to-Lab hatch pill, then:

1. **Stage hero** — full-bleed hero image with color-washed overlay carrying designation, title, client, one-line summary. Scrolls away (About-hero grammar).
2. **Plate block** — in-flow metadata strip in SpecimenPlate's visual language (not a bottom drawer): client, delivered date, tech chips, live-site link.
3. **Narrative** — prose column at site reading measure. Markdown sections; blockquotes render as director's-commentary asides (offset, accent-marked, distinct voice). Gallery images as full-width captioned figures between sections.
4. **Closing** — `.loud` band with one line and `.cta-engraved` to `/contact`, then SiteFooter. Studies end at the door.

No JS anywhere on the study page. Reduced-motion and keyboard behavior inherit site rules.

## BDL-005 content (first draft by Claude, founder rewrites in content pass)

- Frontmatter: `type: study`, `designation: BDL-005`, client "Cheer and Chatter Social Club", `date: 2026-07-28`, `liveUrl: https://cheerandchatter.com`, `tech: [astro, react, sanity, cloudflare, durable-objects]`, hero + gallery.
- Narrative shape: what they needed → the site (Sanity-driven, owner-owned vendor accounts, ticketing embed) → the live event application (host console + venue TV, Durable Object sync, offline art cache, hardware drill) → what it proves. Commentary asides carry the candid voice.
- Effort evidence allowed: ~3 weeks spec-to-delivery, 259 commits, 97 PRs, 242 tests, 800 trivia questions imported, 120-artwork offline cache. **No dollars, no terms.**
- Source material: `C:\git\websites\cheerAndChatter\files\docs\` (handoffs, specs) and the session survey; client cleared publishing anything short of personal details.

## Imagery plan

- Public site: browser captures (home, event page, calendar; desktop + one phone width).
- Live app: local run of the C&C repo against the **development** dataset; host console mid-game, TV crowd screen with watercolor art.
- Sanity Studio: event editor + Caller-readiness tool, structure only; no submissions/emails/tokens in frame.
- All images: real alt text, through the Astro image pipeline.

## Tests

- Rewritten `lab-schema` suite: valid experiment; valid study; study missing `client`/`liveUrl`/`hero` fails; experiment carrying study fields fails; `howto`/`href` rule intact; explicit-`type` requirement.
- Route generation is validated by the build (a bad entry fails the build; that is the union doing its job). Existing 92 tests stay green.

## Build order (one commit each)

1. Schema union + `type: experiment` lines on existing entries + test rewrite.
2. Card-list extraction, type chip, wall toggle, `/lab/experiments` + `/lab/studies`.
3. StudyLayout + `[slug]` branching.
4. BDL-005 content + imagery.
5. Browser verification pass, push.

## Out of scope

MDX (backlogged, post-theme-pass), theme-pass styling ambition, per-study OG art (already backlogged), WallLabel on studies, pagination (revisit past ~30 entries per the architecture handoff).
