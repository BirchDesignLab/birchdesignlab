# Birch Design Lab — Website Design Spec

*Date: 2026-07-15. Product of the brainstorming session following the naming decision recorded in `docs/birch-design-lab-founding-record.md`. That document is the brand authority; this one translates it into a website.*

---

## 1. Purpose & success criteria

**Purpose:** The public face of Birch Design Lab — a solo custom-website + custom-software business serving primarily non-technical business owners. The site must do two jobs at once:

1. **Sell to non-technical clients** — plain language, credible, calm, fast.
2. **Demonstrate superiority** — technically, visually, graphically outclass competing local/regional dev shops. The site itself is the first portfolio piece.

**Success criteria:**

- A non-technical business owner can land on Home and understand who/what/how-to-contact within seconds.
- Lighthouse 100s (performance, accessibility, best practices, SEO) on all core pages — treated as a brand feature, not a nice-to-have.
- The visual identity is unmistakably its own: generative bark, chiaroscuro light/dark, quiet-luxury restraint. No template look.
- The Lab grows one folder at a time with zero infrastructure work per experiment.
- Foundation-first: later renovations (CMS, Tailwind, blog, case studies) require no re-architecture.

**Explicitly out of scope for launch:** Work/case-studies page, blog ("Field Notes"), CMS integration, GSAP. All have reserved room (see §8).

---

## 2. Architecture & pages

**Stack: Astro 5**, static-first, deployed on **Cloudflare Pages** (domain `birchdesignlab.com` already held at Cloudflare). React and Svelte integrations installed but used only where a page opts in via islands.

```
birchdesignlab.com
├── /              Home
├── /services      Services
├── /about         About (the brand epic)
├── /lab           Lab index (specimen catalog)
│   └── /lab/bdl-001, /lab/bdl-002, …   Experiment pages
├── /contact       Contact
└── /404           Custom 404 (generative bark moment)
```

**Nav:** Home, Services, Lab, About, Contact. **Footer:** contact info, social handles (once registered), room reserved for future Work + Field Notes links.

### Home
- Full-viewport hero: generative bark field (WebGL) breathing slowly behind the wordmark and a tagline line. Current candidate: *"First green after the fire — and the bark you write on."* — **provisional copy;** founder is not married to it. Layout must not depend on any specific line.
- Services teaser (two offerings, one line each, link to /services).
- Three featured experiments pulled from the Lab collection (keeps Home fresh as the Lab grows).
- Contact CTA.

### Services
- Custom websites + custom software, described in plain language for non-technical business owners. No jargon walls.
- Process section (discovery → build → launch → care). The retired Fathom line — "to measure the unknown using yourself as the ruler" — is *available* as process copy per founding record §2, not required; founder is not married to it.
- Single clear CTA to /contact.

### About
- The brand-epic page, built from founding record §2: the etymological line (beorc → "to shine"), the founding myth (pioneer species + Novgorod bark letters), the credo, the founder.
- The founder resembles the namesake — the origin story clients retell. Written in first person or close third; warm, not corporate.

### Lab (see §5)

### Contact
- Simple: email link and/or a minimal form (Cloudflare Pages Functions or a form service — implementation planning decides). Phone number if desired.
- Tone matches the phone answer: *"Birch Design Lab, this is ___."*

---

## 3. Visual system

**Authority:** founding record §3 (visual direction). Register: Grand Seiko — the **Spring Drive "Birch" (SLGA009)**, the **Snowflake (SBGA211)**, and the **Hi-Beat White Birch (SLGH005)**: texture rendered as material, luxury that whispers. (The Snowflake's soft white dial is a fine reference for the light-mode field.)

### Chiaroscuro, light/dark native
- **Dark mode is the default face:** charcoal grain field, bark-white lettering.
- **Light mode is the true inverse:** bark-white field, charcoal marks. Both first-class.
- Honors `prefers-color-scheme`; manual toggle available; choice persisted.

### Design tokens (the real foundation)
All colors, spacing, and type sizes live as CSS custom properties in one token file. **Palette and type are explicitly provisional** — the founder will iterate until something screams. Swapping values must never require touching components.

Provisional anchors (founding record + founder's session notes):
- Bark white ~`#F4F1EA` · Charcoal ~`#1C1B19` · Birchwood tan (warm surfaces).
- **Green, used with confidence:** founder likes the whole family — british racing, forest, moss, hunter, pine, sea, kelly. Not confined to a single sparse accent; tasteful broader use is welcome. Token structure should allow 2–3 green roles (accent, surface tint, deep field) rather than one slot.
- **Leathery dark browns** and **castle/early-industrialist-mansion stone shades** (granite, limestone, weathered sandstone grays) as additional surface/neutral candidates — fits the leather-and-wood, stone-mansion-among-birches world.
- **Avoid:** navy + brass (reads fintech), anything competing with the wordmark.

### Typography
- Display/wordmark: wide-tracked serif or engraved small caps (candidates: Cormorant, Spectral SC, or similar — judged in the wordmark, not Helvetica).
- Body: restrained text face (same serif's text cut, or quiet humanist sans).
- Self-hosted, subset, `font-display: swap`. Fallback stacks defined so font fiddling is one-file cheap.

### Generative bark system (the signature)
- **One WebGL module** (raw WebGL2 or a thin wrapper like regl — no three.js unless needed), architected in two layers:
  1. **Pattern core:** seeded PRNG + the math that places lenticel dashes and grain. Renderer-agnostic, pure functions.
  2. **Draw layer:** shaders rendering the pattern; GPU handles the slow "breathing" animation at negligible runtime cost.
- **Seed support is mandatory** (BDL-001's interactive controls require it). Default seeding behavior — per-page fixed, per-visit random, or seed-by-date ("the site grows daily") — is a one-line choice deferred to implementation/taste. Foundation supports all three.
- Used as: hero background, section dividers, 404 page, loading states.
- Degrades gracefully: static fallback (pre-rendered or canvas2D) when WebGL is unavailable; effectively static under `prefers-reduced-motion`.

### Motion
- Quiet, weighted: slow reveals (300–600ms, heavy easing), subtle scroll-linked parallax on bark layers. **Never scroll-jacked.**
- Implemented with CSS (+ scroll-driven animations where supported) and small vanilla IntersectionObserver reveals. **No GSAP on the core site** — reserved as a future Lab-piece technology.
- `prefers-reduced-motion` respected everywhere.

---

## 4. Styling approach

**Vanilla CSS with design tokens. No Tailwind.**
- Rationale: bespoke animation-heavy design; CSS has no breaking majors; Astro scopes component styles natively.
- Structure: one global token file (custom properties, both themes), one thin global base (reset, type rhythm), everything else scoped inside Astro components.
- Tailwind remains a clean later addition (per-island or global) if ever wanted — renovation, not foundation.

---

## 5. The Lab

**Concept:** numbered experiments — a specimen catalog. Portfolio + playground + proof of superiority. Fits the name: the lab is where experiments live; the bark is what you write on.

### Index (`/lab`)
Specimen-catalog layout. Each entry shows:
- **Designation** (BDL-001, BDL-002, …) · title · one-line summary · date · tech tags.
- **Device badge:** `mobile-first` / `desktop-forward` / `universal`. Visual treatment TBD; the schema field ships now.
- Entries marked `status: forthcoming` render as listed-but-unlinked — open experiments, like a real lab notebook.

### Experiment pages (`/lab/bdl-nnn`)
- Full-bleed, zero shared chrome except a minimal escape hatch (small "← Lab" mark + designation).
- Per-page freedom via Astro islands: React, Svelte, WebGL, vanilla, WASM — whatever the piece needs, paid for only on that page.
- **Specimen plate:** a collapsible panel/footer on every experiment — what it is, how it works, tech used. Lab-notebook voice. Sales tool: clients see magic, technical readers see rigor.

### Content model
Astro content collection. Frontmatter schema:

```yaml
designation: "BDL-001"      # unique, ordering key
title: ""
summary: ""                  # one line for index + featured cards
date: 2026-07-15
tech: []                     # tags, e.g. [webgl, svelte]
device: universal            # mobile-first | desktop-forward | universal
status: live                 # live | forthcoming
featured: false              # eligible for Home's featured slots
```

**Adding an experiment = one folder** (markdown entry + component files). No infra work per piece.

### Launch experiments (seeds — replaceable)
1. **BDL-001 — The Bark Engine.** The site's generative birch system exposed full-screen with interactive seed/density/light controls. The brand mark as a playable instrument. Cheap: the module already exists for the site.
2. **BDL-002 — Novgorod Letters.** A birch-bark letter reader: real medieval bark letters (public domain), WebGL bark texture, scratch-to-reveal interaction. The artistic piece; ties directly to the founding myth.
3. **BDL-003 — a pure-CSS / scroll-driven technical feat** (e.g. scroll-driven-animations API showpiece or CSS-only 3D). The "view source and gasp" specimen. Exact concept chosen at build time.

Launch with 2–3 total; one may ship as `forthcoming`.

---

## 6. Content authoring

- **Markdown in the repo. No CMS at launch.** Sole author works in a code editor; git is the version history.
- Schemas defined via Astro's Content Layer so a future swap to Sanity (account already exists) is a loader change — pages and components untouched. This is the designated renovation path if authoring friction ever appears (phone editing, image pipeline, drafts).

---

## 7. Performance, accessibility, error handling

- **Budgets:** near-zero JS on core pages (bark module + theme toggle only); Lighthouse 100s across the board; fonts subset + self-hosted; images via Astro's asset pipeline (AVIF/WebP, sized).
- **Accessibility:** WCAG AA contrast in both themes (every green/brown/stone token role must pass on the fields it's used against — token tuning constraint); full keyboard navigation; visible focus states; semantic HTML; reduced-motion support.
- **Failure modes:**
  - No WebGL → static bark fallback; page fully functional.
  - No JS at all → core pages render and read completely (static-first guarantees this); experiments show their specimen plate + a "requires JS" notice.
  - Custom 404 as a small generative-bark moment.
- **SEO baseline:** per-page titles/descriptions, OpenGraph images (bark-generated OG images are a nice later touch), sitemap, canonical URLs.

---

## 8. Reserved room (deliberately not built now)

| Future thing | Reservation made now |
|---|---|
| Work / case studies | Footer slot; content collection pattern established by Lab |
| Field Notes (blog) | Footer slot; same pattern |
| Sanity CMS | Content Layer schemas = loader swap |
| Tailwind | Token-first CSS = additive integration |
| GSAP | Island-scoped, future Lab piece |
| Social handles | Footer placeholders until registered |

---

## 9. Verification

- Lighthouse CI (or manual runs pre-deploy) on all core pages — 100s or documented exception.
- Both themes visually checked per page; contrast checked when tokens change.
- `prefers-reduced-motion` and no-WebGL paths exercised manually.
- Mobile + desktop pass per page; Lab entries verified against their own device badge claim.

---

## 10. Non-goals / guardrails

- No scroll-jacking, ever.
- No stock photography, no literal birch-tree photos — the bark is generated or it isn't there.
- No jargon on client-facing pages.
- No *stacked* suffixes when naming anything new — never "Birch Labs Studio," never "Field Notes Journal" ("workshop workshop" rule). To be clear: **the name itself is Birch Design Lab and is used in full** — Design (what) + Lab (where) answer different questions and are not a stack.
- Don't relitigate the graveyard (naming or design decisions recorded here and in the founding record).
