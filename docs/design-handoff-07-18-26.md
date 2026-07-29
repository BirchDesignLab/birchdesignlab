# Handoff 2026-07-18 — design-system port complete & deployed

Delta since [design-handoff-07-16](design-handoff-07-16.md) (the kit-port plan). That doc was the source; this one records what actually shipped. Live on Cloudflare Pages, commit `28642fe` on `main`. Parent: [birch-design-lab website spec](superpowers/specs/2026-07-15-birchdesignlab-website-design.md).

## What shipped

The three design-system passes from the 07-16 handoff, ported into the real Astro repo, one pass at a time with a founder site-check between each. Build verified (`npm run build`, 9 pages, OG gen ran), pushed to prod.

### Pass 1 — tokens (`src/styles/tokens.css`)
- `--text-3xl: clamp(2.75rem, 4.5vw, 4rem)`. **Floor is 2.75rem, not the doc's original 2.25rem** — 2.25rem equals `--text-2xl` exactly, so below ~800px the display moment collapsed into the scale it exists to escape. Corrected with Design 2026-07-18; the 07-16 doc's Pass 1 line was updated to match.
- `--space-6`/`--space-7` now fluid clamps (same max: 4rem/7rem).
- Loud-moment tokens per face: `--gf-mark / --gf-accent / --gf-link / --gf-on-accent / --gf-link-hover`, plus `--on-accent`. In all **three** semantic blocks (dark, light, and the no-JS `prefers-color-scheme: light` block — keep in sync).
- Light `--green-field` flipped to `--green-forest` (was sage-tint); `--green-surface` stays sage-tint.

### Pass 2 — primitives (`base.css`) + components
- `.cta-engraved` (fill wipes in under a fixed label) and `.more-link` (arrow nudges) primitives.
- **Reveal plumbing rewritten** (`base.css` + `BaseLayout.astro`): gated by `.reveal-on` (JS adds it to `<html>`; no-JS = content never hidden), `.is-settled` class, `rootMargin: '0px 0px -20% 0px'`, one-shot unobserve, in-view-on-load elements settle instantly (no flash). Replaced the old ungated `[data-reveal].is-revealed` + `html:not(.js)` system.
- Square wall-label tags (DeviceBadge + SpecimenPlate chips), flush footer (dropped its top margin), square theme toggle (radius only; logic untouched). Body-link press feedback + reduced-motion extension.

### Pass 3 — pages
Shared `.loud` green-field pattern, one per page, **`border-top` only** (the next section/footer owns the seam below). `data-reveal` is now **exclusive to `.loud`** sitewide — stripped from every other element, including `SpecimenCard` (which de-animated the Lab too, intended: reveal exclusivity is a foundation rule).

- **Home** — opener display lead at `--text-3xl`/22ch + subline; two doors, each with its own `.more-link`; loud Lab preview renders the **two newest live** specimens as lightweight lines (kept the 3a6a0d1 auto-feature logic, `slice(0,2)`, not `SpecimenCard`). **No CTA button** on Home. Billboard weight → 400 (see Type).
- **Services** — kicker + H1 "Two things, done properly." at `--text-3xl`/18ch; process list with **7rem display-numeral column** (Marcellus, `--text-2xl`, `--accent`) that **collapses to one column ≤640px** (authored fresh — the kit's collapse rule was scaffolding, never ported); loud closing CTA (`.cta-engraved`).
- **About** — full-height bark **hero** (Home construction: `min-height: 88vh`, `place-items: center`, `BarkField density={170}` `absolute inset:0`, H1 overlaid). H1 colored `--billboard-color` (distinct from bark's `--mark` hue so it stays legible over the brightest lenticels). "The shining tree" is the H1; loud manifesto pull-quote at `--text-3xl`/20ch + smallcaps wordmark signature, **no CTA**. (Founder iterated the header structure live; final markup is what's in the file.)
- **Contact** — kicker + H1 "Start a conversation"; loud CTA with the email as a `--gf-link` text link (`overflow-wrap: anywhere`) + `--gf-accent` fine print.

### Type fixes
- `h1–h3` and the **Home billboard** dropped to `font-weight: 400`. `@fontsource/marcellus` ships **400 only**, so 500 was faux-bolding and coarsening the display type. `--billboard-weight: 500` **token is left as-is** — styleguide and bdl-002 swap in other faces that may really ship 500; the Home billboard overrides to 400 at its own instance.

### Header mobile
Kit treatment: wordmark left, nav as a **2×2 grid** on the right, toggle top-right. Wordmark is a **deterministic 2-line split** — "Birch" / "Design Lab" via two `.wm-line` spans (first `display:block` ≤640px, `nowrap` keeps "Design Lab" whole). Nav column-gap tightened to `--space-2` **inside the ≤640px block only** to give the wordmark the ~7px it needed; desktop nav gap unchanged.

## Gotchas / decisions worth carrying

- **Loud-link hover collides on the light face without `--gf-link-hover`.** Inside `.loud`, dark rests at moss / light rests at bark-white. Plain `--mark` hover is invisible on light (gf-link == gf-mark == bark-white); plain `--gf-accent` is invisible on dark (gf-link == gf-accent == moss). The `--gf-link-hover` token resolves both (dark→bark-warm, light→moss). `.loud a:hover, .loud .more-link:hover` uses it.
- **Marcellus is single-weight (400).** Any element asking for 500+ on `--font-display`/`--font-billboard` faux-bolds. Watch this when adding headings.
- **Preview-browser artifacts** (the in-app browser used to verify): IntersectionObserver won't fire under programmatic scroll, and the compositor forces reduced-motion, so the reveal *animation* couldn't be exercised there — verified structurally instead. Real-browser eyeball of the scroll reveal still worth doing.

## Parked (both in `docs/lab-backlog.md`, sequenced AFTER the Lab pass)

- **Copy pass on the business pages (redo).** A founder copy pass was done 2026-07-16 and carried through this port, but founder judges it **weak and wants a quality rewrite**. The copy exists — treat it as **first-draft, not final** (founder territory per the writing rules), not as placeholder.
- **Shorter About bark hero (~½ homepage height).** Founder wants a shorter field here, but the bark engine has **no aspect correction** — cutting `min-height` squishes lenticels into horizontal streaks. Needs the aspect-safe path, not a height cut.

### `lockAspect` — BUILT 2026-07-19

Shipped as an opt-in `BarkField` prop (`lockAspect`), default off, so every existing field is untouched. Implementation differs from the analysis below in one way that matters: the fix is applied to the **rotated offset**, not to `halfSize.x`. Scaling `halfSize.x` before the rotation only corrects the dash at `rot: 0` and leaves the rotation itself skewed on a non-square canvas. Dividing the rotated offset x by the aspect corrects scale and keeps rotation rigid at every angle.

- `renderer.ts`: new `uAspectLock` uniform (0/1, set once at create); `p.x /= mix(1.0, aspect, uAspectLock)` after the rotation, with `aspect = uResolution.x / max(uResolution.y, 1.0)`. `VERT` is now exported as `BARK_VERT_SOURCE` so the shader source is assertable from tests.
- `draw2d.ts`: 7th positional param `lockAspect = false`; dash width measures against `H` instead of `W`. Canvas2D already rotates in screen space, so no rotation fix is needed there.
- `pattern.ts` untouched. Generation stays pure, daily-seed determinism preserved.
- All three consumers stay default-off: `BarkField`, bdl-002's styleguide field, and the OG build script.

Verified by GL pixel readback in a real browser (covered-pixel counts, white dashes at alpha 1). Lock off: 912 / 2285 / 4541 at 160x160, 400x160, 800x160, scaling linearly with width, which is the streak bug. Lock on: 912 / 919 / 918, flat. At square both paths return an identical 912, confirming the default-off path is unchanged. Unit tests cover the canvas2D path and the shader source in `tests/bark-lock-aspect.test.ts`.

The original analysis, kept for the record:
Mark on-screen aspect == canvas aspect, because `renderer.ts` (VERT shader) and `draw2d.ts` map normalized `w/h` straight to the canvas with no aspect compensation. A lenticel on a 5:1 strip stretches into a streak. Fix belongs **at draw** (`renderer.ts` shader scale `halfSize.x` by `uResolution.y/uResolution.x`; `draw2d.ts` reference height), **opt-in per instance** via a `BarkField` prop (default off so Home is untouched — Home's hero is ~2:1, not square, so a global fix would shift it), `pattern.ts` **untouched** (that's what preserves daily-seed determinism: generation stays pure). Three consumers to keep in parity: WebGL shader, 2D fallback, and the OG build script (both use `drawBarkDashes`). Worth building when the shorter-About-hero want comes up.

## Repo-authoritative — do NOT overwrite (unchanged reminder)

Bark WebGL engine (`src/components/BarkField.astro` + `src/lib/bark/*`) is the real thing; the port changed **nothing** in it. All the About-hero work reused the `BarkField` component unchanged, so its guards (reduced-motion `renderOnce`, ResizeObserver, theme MutationObserver, offscreen-scroll guard, pagehide cleanup) are intact. `@fontsource` self-hosting, ThemeToggle persistence/bootstrap, BaseLayout reveal script — all repo, not kit.

## Not touched (deferred to the Lab pass)
`SpecimenCard`, `SpecimenPlate`, `WallLabel`, and the Lab catalog/stage pages. `SpecimenCard` had its `data-reveal` stripped (foundation rule) but no styling pass — it's still gallery furniture awaiting the Lab pass.
