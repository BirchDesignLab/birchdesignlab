# Handoff: porting the design-system passes into the Astro repo

Every change made in this design-system project since 2026-07-16, ordered for porting in passes. Targets are the real files in `birchdesignlab/`; sources are this project's files. Values are final — copy them verbatim, don't re-derive.

## Read first: where the repo is authoritative

Do NOT overwrite these with the kit versions — the kit holds simplifications:

- **BarkField** — the repo's `src/components/BarkField.astro` + `src/lib/bark/*` (WebGL engine, wake/gust/grow, reduced-motion + IO guards) is the real thing. The kit's `components/site/BarkField.jsx` and `assets/bark.js` are static 2D ports for preview only. Nothing in any pass changes bark. Port nothing.
- **Scroll-reveal plumbing** — the repo already has reveal machinery (IntersectionObserver in `BaseLayout.astro`, reveal/no-JS rules in `src/styles/base.css`, 14px rise). This project's `assets/reveal.js` is a standalone rewrite for the kit. **Port the new rules into your existing plumbing; don't add reveal.js as a second system.** The rules that changed: 8px rise (was 14px), `rootMargin: '0px 0px -20% 0px'`, one-shot with unobserve, in-view-on-load elements show instantly, and reveal is scoped to `[data-reveal]` = the green loud-moment field only (see Pass 3).
- **ThemeToggle logic** — keep your persistence/bootstrap; only the geometry changes (Pass 2).
- **Fonts** — repo self-hosts Marcellus + Spectral via @fontsource in `BaseLayout.astro`; this project's Google-CDN import is kit-only scaffolding. Port nothing.

## Kit-only scaffolding — do not port

- `ui_kits/website/index.html` hash router, `onNavigate` props, `Object.assign(window, …)`, React/Babel scripts.
- The Tweaks panel (`tweaks-panel.jsx`) and the `LoudMomentStyle` override block in `index.html` — dev comparison tools. The chosen values are already promoted into `tokens/colors.css`; port the tokens, not the tool.
- React inline-style syntax in `screens.jsx` — translate to scoped styles/classes in `.astro` files; the custom-property overrides port 1:1 as CSS (see Pass 3).

---

## Pass 1 — tokens (`src/styles/tokens.css`)

1. **Type:** add `--text-3xl: clamp(2.75rem, 4.5vw, 4rem);` — the interior display moment. Floor is `2.75rem`, not `2.25rem`: a `2.25rem` floor equals `--text-2xl` exactly, so below ~800px the display moment collapses back into the scale it exists to escape. (The `2.25rem` value drifted into the kit by accident during the mobile pass; corrected 2026-07-18 with Design.)
2. **Spacing:** big rhythm steps go fluid; small steps stay fixed:
   ```css
   --space-6: clamp(2.5rem, 2vw + 1.75rem, 4rem);
   --space-7: clamp(4rem, 8vw + 1rem, 7rem);
   ```
3. **Loud-moment tokens** (both faces):
   - dark: `--green-field: var(--green-pine-deep); --gf-mark: var(--bark-warm); --gf-accent: var(--green-moss); --gf-link: var(--green-moss); --gf-on-accent: var(--charcoal);`
   - light: `--green-field: var(--green-forest); --gf-mark: var(--bark-white); --gf-accent: var(--green-moss); --gf-link: var(--bark-white); --gf-on-accent: var(--charcoal);` — locked day face: forest / bark-white / moss. (Light face keeps `--green-surface: var(--green-sage-tint)` for quiet tinted surfaces.)
4. **Fill contrast:** `--on-accent: var(--charcoal)` (dark face) / `--on-accent: var(--bark-white)` (light face) — text on an accent fill.

## Pass 2 — shared primitives + components

`src/styles/base.css`:

5. **Engraved CTA** — replace the `.cta` pill with:
   ```css
   .cta-engraved { position: relative; display: inline-block; overflow: hidden; border: 1px solid var(--accent); padding: calc(var(--space-3) - 2px) var(--space-5) var(--space-3); text-decoration: none; font-family: var(--font-smallcaps); text-transform: uppercase; letter-spacing: var(--tracking-wide); font-size: var(--text-sm); line-height: 1; }
   .cta-engraved .fill { position: absolute; inset: 0; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform var(--dur-1) var(--ease-weighted); }
   .cta-engraved .lbl { position: relative; color: var(--accent); transition: color var(--dur-1) var(--ease-weighted); }
   @media (hover: hover) { .cta-engraved:hover .fill { transform: scaleX(1); } .cta-engraved:hover .lbl { color: var(--on-accent); } }
   .cta-engraved:active .fill { transform: scaleX(1); transition-duration: 100ms; }
   .cta-engraved:active .lbl { color: var(--on-accent); transition-duration: 100ms; }
   ```
   Markup: `<a class="cta-engraved"><span class="fill" aria-hidden="true"></span><span class="lbl">Label</span></a>`.
6. **Arrow link** — replace the `.more` treatment with:
   ```css
   .more-link { color: var(--link); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.2em; }
   .more-link .arw { display: inline-block; transition: transform var(--dur-1) var(--ease-weighted); }
   @media (hover: hover) { .more-link:hover { color: var(--mark); } .more-link:hover .arw { transform: translateX(0.3em); } }
   .more-link:active .arw { transform: translateX(0.3em); transition-duration: 100ms; }
   ```
   The arrow becomes `<span class="arw" aria-hidden="true">→</span>` (it must be an inline-block element to transform).
7. **Body links:** add `transition: opacity var(--dur-1) var(--ease-weighted)` to `a` and `a:active { opacity: 0.55; transition-duration: 100ms; }` — touch acknowledgment for plain links (Contact's email).
8. **Reduced motion:** extend your existing reduce block with `a, .cta-engraved .fill, .cta-engraved .lbl, .more-link .arw { transition: none; }`.
9. **Reveal CSS** (goes with the plumbing merge above):
   ```css
   @media (prefers-reduced-motion: no-preference) {
     .reveal-on [data-reveal] { opacity: 0; transform: translateY(8px); transition: opacity var(--dur-2) var(--ease-weighted), transform var(--dur-2) var(--ease-weighted); }
     .reveal-on [data-reveal].is-settled { opacity: 1; transform: none; }
   }
   ```
   (`.reveal-on` is added to `<html>` by JS — content is never hidden without it.)

Components:

10. **SiteFooter.astro** — delete the footer's top margin (`--space-7`). The footer meets the preceding section flush; its own `border-top` is the single seam. Keep internal padding.
11. **ThemeToggle.astro** — geometry only: track `border-radius: 0` (was 999px), thumb square (drop `border-radius: 50%`). Logic untouched.
12. **DeviceBadge.astro** — square wall-label tag: smallcaps, `font-size: 0.68rem`, `border: 1px solid var(--line)`, `padding: 0.35em 0.8em 0.25em`, `line-height: 1`, no radius.
13. **SpecimenPlate.astro** — tech chips get the same square-tag treatment as DeviceBadge.

## Pass 3 — per-page

Shared pattern first — **the green loud-moment section**, one per business page:

```css
.loud { background: var(--green-field); color: var(--gf-mark); border-top: 1px solid var(--line); --accent: var(--gf-accent); --on-accent: var(--gf-on-accent); --link: var(--gf-link); --mark: var(--gf-mark); }
```
- `border-top` ONLY — never `border-block`. The next element (usually the footer) owns the seam below. This is the sitewide convention: sections separate by top borders; no doubled hairlines.
- `data-reveal` on this section and nothing else.
- Inner wrap: `padding-block: var(--space-7)`.

`index.astro` (Home — the hub):
- Opener paragraph at `--text-3xl`, max-width 22ch; subline at `--text-lg`; `--space-7` block padding. No CTA button on Home.
- Two doors: single-column on narrow (auto-fit minmax(260px,1fr)), gap `--space-6`, internal gaps `--space-2`, each with its own `.more-link`.
- Loud moment = Lab preview: smallcaps "From the lab" in `--gf-accent`, pull-line "Everything we sell, we practice in the open." at `--text-2xl`/24ch, two specimen lines (designation smallcaps + middot summary, `--space-2` gaps), "Visit the lab" arrow link.

`services.astro`:
- H1 "Two things, done properly." at `--text-3xl`/18ch under a smallcaps kicker; subline `--text-lg`.
- Process list: display-serif numerals (01–04) at `--text-2xl` in `--accent`, 7rem column, `--space-5` row padding, `--space-2` title-to-description.
- Loud moment = closing CTA: pull-line at `--text-2xl`/26ch + engraved "Tell us about your project".

`about.astro` (voice-forward):
- H1 "The shining tree" at `--text-3xl` over the quiet bark strip (`--space-7` padding).
- Prose grid, gap `--space-4`.
- Loud moment = manifesto, NO CTA: "Everything here is one person's work. That is not a limitation; it is the guarantee." at `--text-3xl`/20ch, signed with smallcaps wordmark in `--gf-accent` at `--space-5`.

`contact.astro` (business register):
- Kicker + H1 "Start a conversation" at `--text-3xl`; subline "No forms, no intake funnel. An email arrives, a person reads it."
- Loud moment = the CTA: invitation at `--text-2xl`/24ch, email as `--gf-link` text link with `overflow-wrap: anywhere`, fine print in `--gf-accent` at `--text-sm`.

## Rules to carry into your own docs

- **Radii: none. Birch is rectilinear.** No pills anywhere.
- **The loud moment is the one thing that arrives; everything else is already there.** Reveal is exclusive to the green field.
- Transform/opacity only; hover work behind `@media (hover: hover)`; every animation respects reduced motion; press acknowledgment at 100ms, recovery at `--dur-1`.
