# Bark-Generated OG Images · Design

*Spec agreed 2026-07-16, evening session. Site feature, not a Lab experiment. Parent documents: website spec (SEO section flagged this as "a nice later touch"), lab backlog.*

## 1. What it is

Every shared link to birchdesignlab.com shows a bark-textured OpenGraph card instead of nothing. Cards are generated at build time from the same seeded bark math the site runs live, so a shared link carries the tree of the deploy.

## 2. Composition

- 1200x630 PNG per page.
- Dark face always (warm charcoal `#1c1a17`, bark mark `#f4f0e6` range): a dark card looks deliberate on every platform regardless of the viewer's theme.
- Bark dashes at the existing alpha treatment, wordmark centered in Marcellus, billboard style.
- Smallcaps page title beneath the wordmark in muted (Services, The Lab, About, Contact). Home gets the wordmark alone, no title line: pure billboard.
- Lab experiment pages share the catalog's card for now. Per-experiment OG art becomes worthwhile at around a dozen live experiments (parked in the lab backlog).

## 3. Generation

- Prebuild Node script, runs before `astro build` (npm prebuild step).
- Pattern comes from the existing pure core (`generateBark` in `src/lib/bark/pattern.ts`, seeded math, renderer-agnostic by design). Seed derivation matches the site's date seed, evaluated at build time, so the card is the tree of the deploy.
- Drawing via `@napi-rs/canvas` (prebuilt binaries, no native build step, runs on the Cloudflare Pages build image), reusing the canvas2D drawing approach from `renderBark2D`.
- Marcellus registered from a TTF/OTF committed to the repo for build use (the site's woff2 stays as is; Node canvas font registration wants TTF).
- Output: `public/og/<page>.png`, one per page in a small page manifest inside the script.

## 4. Wiring

- `Seo.astro` gains `og:image` (absolute URL), `og:image:width`/`og:image:height`, and `twitter:card` = `summary_large_image`.
- Each page resolves its own image path; pages pass their OG title through existing props.

## 5. Testing

- Unit (vitest, alongside the existing suite): seed determinism (same date, same dashes), output dimensions, and a manifest check that every registered page has an OG entry.
- Manual after deploy: one pass through an OG preview tool (or a real share) to confirm platforms pick up the card.

## 6. Out of scope

- Daily scheduled rebuild (Cloudflare deploy hook on cron) to keep the card's tree truly daily. Parked; the card stays the tree of the last deploy, and platform-side OG caching makes daily freshness half illusion anyway.
- Per-experiment OG art (parked until the catalog holds about a dozen live pieces).
- Light-face or theme-varied cards.
