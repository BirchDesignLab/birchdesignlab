# Design schools: author's guide

Each school is the whole business site (home, about, services, contact, contact
sent) rebuilt in one design language, served at `/t/<id>/` and entered from the
Lab (BDL-010 Period Rooms). The design spec is
`docs/superpowers/specs/09-22-26-theme-schools-design.md`; this is the working
contract for building one.

## What is fixed and what is yours

**Fixed in every school:** every word (from `src/content/copy/`), every link
target, the contact form's behaviour, the page set, the head (PortalLayout owns
it), the switcher.

**Yours:** everything visual. Layout, grid, type, colour, ornament, motion,
background, the header and footer's form, section order on screen, the
wordmark's styling. A school should be recognisable from its `signature`
sentence in five seconds, by someone who is not a designer.

## Files

```
src/themes/<id>/
  meta.ts          ThemeMeta (src/themes/types.ts)
  theme.css        global: tokens for both schemes, globals, view-transition arrival
  Header.astro     props { chrome, theme, page }
  Footer.astro     props { chrome, theme }
  pages/Home.astro About.astro Services.astro Contact.astro Sent.astro
                   props { copy, chrome, theme }
  fx.ts            optional background (see Motion and backgrounds)
  assets/          optional original SVG ornament
src/pages/t/<id>/[...page].astro   the route; imports only this school
```

Start from `node scripts/themes/new-theme.mjs <id> "<Name>"`, which stamps a
working, unstyled school that already passes every guard. While a school is
under construction its route file is `_[...page].astro` (Astro ignores it), so
a half-built school never breaks anyone else's build and never appears in the
switcher (`THEMES` in `registry.ts` lists only schools with an enabled route;
`ALL_THEMES` includes drafts, for the contrast checker).
`scripts/themes/render.mjs` enables it only for its own build.

## Copy (never hardcode page text)

- `copy` and `chrome` come in as props (`CopyData<'home'>` etc.). Render every
  field. The guard compares each school's words against quiet's, word for
  word, so a missing or reworded field fails.
- Rich fields (about `etymology`) render with `set:html={rich(text)}`.
- `copy.trust` is a list: render the parts with a decorative separator marked
  `aria-hidden="true"`.
- **Decoration is `aria-hidden="true"`.** Ornamental text (numerals, glyphs,
  katakana, a giant background word) must be `aria-hidden` or it counts as copy
  and fails parity. Do not use `data-parity-skip`; it exists for quiet's bark
  credit and the lab-derived specimen lines only.
- The home page's "From the lab" lines come from `featuredSpecimens()`
  (`src/lib/copy.ts`); render them inside an element with `data-parity-skip`
  (they change whenever a specimen ships), like quiet does.
- The billboard is `chrome.name` ("Birch Design Lab"); split it however the
  school wants.
- No em dashes in anything a visitor can read. Studio "we".

## Links

- Use `hrefFor(target, theme)` from `src/themes/paths.ts` for every link
  (`'home' | 'about' | 'services' | 'contact' | 'lab' | 'privacy'`).
- Links that leave the school (Lab, Privacy, the BDL-001 credit if you have
  one) carry `data-astro-reload`.
- The header wordmark links home and carries `transition:name="wordmark"`.
  No other element may use `transition:name` (duplicates abort the
  transition). The guard checks.
- Header: a skip link to `#main` (`chrome.skip`), the wordmark
  (`chrome.wordmark` parts), the nav from `chrome.nav`, with
  `aria-current="page"` on the current page's link:
  `isCurrent(to, Astro.url.pathname)` from `paths.ts` (an exact page match;
  a path prefix would mark Contact current on the sent page).
- Footer: `chrome.name`, `chrome.location`, the nav, `©` year + name, and the
  privacy link (`chrome.privacy`).
- The portal adds a 76px strip below your footer so its fixed switcher never
  covers your last line. It is `[data-portal-tail]`; paint its background if
  your footer should run to the true bottom of the page. Never target the
  portal's DOM any other way.

## Components

- Never name a component prop `as`. Astro reserves it for polymorphic
  components and silently drops the whole `Props` type, so every caller fails
  `astro check` (use `tag`).

## Contact

The form contract is fixed and guarded:

```astro
<form method="post" action="/api/contact" data-astro-reload>
  <input name="name" ... required />  <input name="email" type="email" ... required />
  <textarea name="message" ... required></textarea>
  <ContactHidden theme={theme} label={copy.labels.honeypot} />
  <button type="submit">{copy.submit}</button>
</form>
```

`ContactHidden` (`src/themes/portal/ContactHidden.astro`) adds the `return`
field and the hidden honeypot. Labels come from `copy.labels`. Keep the
`maxlength`s quiet uses (200, 254, 5000). Visible focus styles on every field.

## CSS and tokens

`theme.css` is imported by the route and ships only on this school's pages.
Scope every global rule under `[data-theme='<id>']` anyway, so nothing can ever
bleed if a stylesheet lingers during a swap.

Required semantic tokens, defined for **both** schemes:

| token | used for |
|---|---|
| `--field` | page background |
| `--field-raised` | cards, panels, form fields |
| `--mark` | body text |
| `--mark-muted` | secondary text |
| `--accent` | kickers, rules, small accents used as text |
| `--link` | links |
| `--on-accent` | text on an `--accent` fill (buttons) |

Structure:

```css
:root[data-theme='x'] { /* primitives + the native scheme's semantic tokens */ }
:root[data-theme='x'][data-scheme='light'] { /* the other scheme */ }
```

The block without `data-scheme` is also what a no-JS visitor sees, so it must
be a complete, native scheme. The contrast checker
(`npx vitest run tests/theme-contrast.test.ts`, or
`npx tsx scripts/themes/check-contrast.ts --theme x`) holds every required
pair to 4.5:1 in both schemes. Anything else you put text on (a loud band, a
glass panel over a gradient, a poster block) goes in `meta.contrast`, with the
background stack listed top to bottom, translucent layers included.

## Type

- Fonts are installed already (see `package.json`, `@fontsource*`). Import the
  CSS in the route file (`@fontsource-variable/<x>/wght.css` or
  `@fontsource/<x>/latin-400.css`). Ask the orchestrator for anything not
  installed; do not run npm.
- `meta.fonts[].preload`: at most two woff2 files, imported with `?url` from
  the package's `files/` (latin subset), for the faces above the fold.
- Font stacks name the fontaine fallback: `'Exo 2 Variable', 'Exo 2 Variable fallback', system-ui, sans-serif`.

## Motion and backgrounds

- No persistent stage. A background is created per page and destroyed before
  the next swap: `onMount` from `src/lib/lifecycle.ts`, and the mount function
  returns immediately unless `document.documentElement.dataset.theme` is this
  school (module scripts stay loaded after you navigate away).
- Prefer CSS and SVG. Canvas or WebGL only when the school genuinely needs it.
  At most one WebGL canvas per page; cap `devicePixelRatio` at 1.5; pause when
  the tab is hidden or the canvas is off-screen; handle
  `webglcontextlost`/`restored` (see `src/components/BarkField.astro`); release
  the context in the teardown (`WEBGL_lose_context`); under
  `prefers-reduced-motion: reduce` draw one still frame. The page must read
  fine with the canvas blank.
- Arrival choreography: `html[data-theme='x']::view-transition-old(root)` /
  `::view-transition-new(root)` and `::view-transition-group(wordmark)` in
  `theme.css`. Keep it under ~700 ms. `html[data-from-theme='y']` is set on
  arrival if you want an entrance that depends on where the visitor came from.

## Dark and light

Both schemes are designed, not inverted. The doctrine per school is in spec §7
(e.g. Bauhaus primaries are poster blocks, never text; Cottagecore's dark is
lamplight, not inverted gingham).

## Guards you must pass

`node scripts/themes/render.mjs --theme <id>` builds with your route enabled,
captures every page in both schemes at desktop and mobile width (a 2x touch
phone; add `--viewports desktop,mobile,tablet` for tablet), runs the contrast
check and the built-site tests for your school, and prints where the PNGs are.
Read the PNGs. Iterate until the page is good, not just passing.

Stills cannot show motion. `scripts/themes/motion.mjs` films the arrival
transition, an in-school page swap and the background fx as timestamped frame
strips (serve a build first; usage in its header).
`scripts/themes/contact-sheet.mjs` composes a capture run into one sheet per
school.

Hard requirements: word and link parity with quiet, the contact contract,
no JSON-LD, no em dash, contrast in both schemes, one `transition:name`, no
horizontal scroll at 390 px, no console errors, no network requests outside
the site.
