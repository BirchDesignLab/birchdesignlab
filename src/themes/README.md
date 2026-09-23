# Design schools: author's guide

Each school is the whole business site (home, about, services, contact, contact
sent) rebuilt in one design language, served at `/t/<id>/` and entered from the
Lab (BDL-010, the Portal). The design spec is
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

**More interactable details, not fewer**, even if they do nothing. Switches,
sliders, segmented controls, steppers, draggable panes: the portal is a Lab
piece, and things to touch are part of the exhibit. Where it is cheap, let a
control do something small and playful; it may also do nothing.

- A control that does something is a real control (a `<button>`, an
  `<input>`) with an `aria-label`.
- A control that does nothing is `aria-hidden="true"` and not focusable.
  Draw it with plain elements, or give any `<button>` or `<input>` inside it
  `tabindex="-1"` (focusable content under `aria-hidden` is an
  accessibility fault).
- Visible label text on a control counts as copy for word parity, unless it
  sits under `aria-hidden`. Parity counts every word, so any extra visible
  label fails it. The walker skips every `aria-hidden` subtree, SVG `<text>`
  included, and never reads `aria-label`
  (`scripts/themes/lib/visible-text.mjs`). So letter a live control's
  visible label inside an `aria-hidden` span and name the control with
  `aria-label`, starting with the words the visitor sees (so voice control
  can find it).

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
  (`src/lib/copy.ts`, the three newest); render them inside an element with
  `data-parity-skip` (they change whenever a specimen ships), like quiet does.
  Each designation links to its entry through `specimenLink(entry, theme)`:
  use its `href`, add `data-astro-reload` when `leaves` is true, and give the
  link `aria-label="<designation>, <title>"`. The summary stays text.
- The billboard is `chrome.name` ("Birch Design Lab"); split it however the
  school wants.
- No em dashes in anything a visitor can read. Studio "we".

## Links

- Use `hrefFor(target, theme)` from `src/themes/paths.ts` for every link
  (`'home' | 'about' | 'services' | 'contact' | 'lab' | 'privacy'`).
- Links that leave the school (Lab, Privacy, the BDL-001 credit if you have
  one) carry `data-astro-reload`.
- The header wordmark links home and carries `transition:name="wordmark"`.
  It is the only `transition:name`; any other view-transition name follows
  the contract below. The guard checks.
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

### View-transition names

A page may declare three kinds of view-transition name, each once:

- `wordmark`: the header wordmark, via `transition:name="wordmark"`. The one
  name that pairs across schools, so the wordmark morphs from one school's
  header into the next.
- `bdl-switcher`: the portal's switcher, which holds still above every swap.
  It belongs to the portal. Never name it or style it; no school stylesheet
  may mention it.
- `<id>-<part>`: your own persistent chrome (a taskbar, a header bar), for
  example `vaporwave-taskbar`, used once per page. Name it only when both
  sides of the swap are your school, so it holds still on an in-school page
  change and rides your arrival and departure otherwise:

```css
html[data-theme='x']:is([data-to-theme='x'], [data-from-theme='x']:not([data-to-theme])) .taskbar {
  view-transition-name: x-taskbar;
}
```

Why each part is there:

- `html[data-theme='x']`: scopes the rule to your school, like every global
  rule here.
- `[data-to-theme='x']`: names the chrome on the old side of an in-school
  swap. Just before the old page is captured, the portal sets
  `data-to-theme=<destination school>` on it.
- `[data-from-theme='x']`: names it on the new side. From the swap until the
  arrival transition finishes, the arriving page carries
  `data-from-theme=<school it came from>`.
- `:not([data-to-theme])`: the stale `data-from-theme` trap. A visitor who
  clicks again before an arrival has finished leaves the page carrying
  `data-from-theme='x'` while it departs for another school; without this,
  the old side would be named and the chrome would animate apart from your
  departure.
- At rest neither attribute is set, so the chrome is unnamed.

Rules:

- One rule per name. The guard counts `view-transition-name` declarations
  on each page, so put both sides in one `:is()`, as above, and declare the
  name once.
- A named element becomes its own group for the swap. It is lifted out of
  the root snapshot and drawn above it for the whole transition (groups stack
  in paint order), so your root choreography passes beneath it and never
  moves it.
- Style the group in `theme.css` if you want to, with
  `html[data-theme='x']::view-transition-group(x-taskbar)` and its
  `-image-pair`, `-old` and `-new`. With no rule it gets the browser's
  default morph and crossfade, which suits chrome that sits in the same place
  on every page. To pin it, give the group `animation: none`, as vaporwave's
  taskbar does. That also ends the crossfade at once (the old and new images
  of a name you set yourself inherit the group's animation timing; the
  wordmark's do not, see "The wordmark"), so the new picture simply replaces
  the old; `animation-name: none` pins it and keeps the crossfade.
- While named, an element is a stacking context and a backdrop root. The
  spec says so for any element whose name is not `none`, at any time, not
  only during a transition, and Chrome agrees. The recipe keeps your chrome
  unnamed at rest, so this bites only during an in-school swap. Name the
  element that carries a `backdrop-filter` itself, never an ancestor of
  elements that blur what is behind them: their backdrop would stop at the
  named ancestor.
- The element must be rendered on both pages of an in-school swap. A name on
  one side only animates on its own.
- Never use another school's prefix. `auto`, `match-element` and `var()`
  names are not allowed.
- Wildcard choreography (`::view-transition-group(*)` and the rest) is
  yours; the portal sends every property of the switcher's own
  pseudo-elements back to the browser's defaults, so a wildcard never
  reaches it. The shared `::view-transition` pseudo is different: it is the
  parent of every group, the switcher's included, and nothing can undo what
  it draws. A background there is fine (vaporwave has one); never set
  `opacity`, `filter`, `backdrop-filter`, `clip-path`, `mask`, `transform`
  (or `translate`, `rotate`, `scale`, `perspective`), `mix-blend-mode`,
  `visibility`, `display` or `zoom` on it.
- The guard (`tests/built/portal.test.ts`) enforces the shapes (`wordmark`,
  `bdl-switcher`, your own `<id>-*`), one use of each name per page, an
  `<id>-*` name set only by a rule keyed on `data-to-theme` or
  `data-from-theme`, a `bdl-switcher` that names only the switcher and
  appears in no school stylesheet, and none of the properties above on
  `::view-transition`.

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
  the context in the teardown (`WEBGL_lose_context`). The page must read
  fine with the canvas blank.
- Arrival choreography: `html[data-theme='x']::view-transition-old(root)` /
  `::view-transition-new(root)` and `::view-transition-group(wordmark)` in
  `theme.css`. Keep it under ~700 ms. The view-transition pseudo-elements
  are styled by the arriving page, so these rules are yours on arrival.
- Two attributes say where a swap is going and where it came from:
  - `html[data-to-theme='y']` is set on the departing page just before it is
    captured, naming the destination school. It decides only what the old
    page's capture sees (which elements carry a view-transition name, as in
    the naming recipe above). The swap removes it with the rest of the old
    page's `<html>` attributes before any `::view-transition-*` pseudo-element
    exists, so a pseudo-element selector keyed on it never matches.
  - `html[data-from-theme='y']` is set on the arriving page from the swap
    until the arrival transition finishes, naming the school the visitor
    came from. Use it for an entrance that depends on where they came from.
  - Choreography for a pair of schools (both the old and the new snapshot)
    is always styled by the arriving page: key it on
    `html[data-theme='<destination>'][data-from-theme='<source>']::view-transition-*`
    in the destination's `theme.css`. The departing school's stylesheet is
    gone by then too.
- Reduced motion is out of scope for the portal's schools. This is a Lab
  piece and the motion is part of the exhibit. Existing reduced-motion code
  in a school may stay but gets no further work, and reviewers do not flag
  its absence. The root business pages quiet renders (`/`, `/about/` and the
  rest) keep their behaviour exactly. One tooling catch: `capture.mjs`
  emulates reduced motion for deterministic stills (unless `--motion`), so a
  school that stops honouring it is caught mid-animation in its stills. That
  is fine for review, not for pixel diffs.

### The wordmark

The browser's default crossfade shows two differently shaped wordmarks at
once, each scaled to the morphing box, so one smears across the other (item
2 of `docs/superpowers/specs/theme-schools-research/tier3-briefs/cottagecore.md`).
What runs without a rule of yours: `transition:name="wordmark"` makes Astro
write an inline style block into every page. Besides the name, it gives the
two images its own fade inside `@layer astro`: `astroFadeOut` and
`astroFadeIn`, 180 ms, `cubic-bezier(0.76, 0, 0.24, 1)`, fill `both`. Those
rules beat the browser's own, which would have the images inherit the
group's timing. So whatever duration and curve you give
`::view-transition-group(wordmark)`, the two wordmarks crossfade in the
first 180 ms of the morph and sit near half opacity together at about
+90 ms. Only the group's delay still reaches them, because Astro sets none.
(Measured on all six schools and quiet in Tier 3, Stage 2.)

This is the default every school adopts in Tier 3, Stage 2, and may then
tune. It was proved on cottagecore and on quiet as a destination:

```css
html[data-theme='x']::view-transition-old(wordmark),
html[data-theme='x']::view-transition-new(wordmark) {
  height: 100%;
  object-fit: none;
  object-position: left center; /* where your wordmark sits in its box */
  animation-duration: inherit;
  animation-timing-function: inherit;
  animation-delay: inherit;
  animation-fill-mode: both;
}
html[data-theme='x']:not([data-from-theme='x'])::view-transition-old(wordmark) {
  animation-name: x-wordmark-out;
}
html[data-theme='x']:not([data-from-theme='x'])::view-transition-new(wordmark) {
  animation-name: x-wordmark-in;
}
@keyframes x-wordmark-out { 35%, 100% { opacity: 0; } }
@keyframes x-wordmark-in { 0%, 40% { opacity: 0; } 100% { opacity: 1; } }
```

- The three `inherit`s put both images back on the group's clock: its
  duration, its curve and its delay. Your rule is unlayered, so it beats
  Astro's layer whatever the specificity. Without them your keyframes run on
  Astro's 180 ms and finish in the first third of a 560 ms morph. Set the
  timing once, on `::view-transition-group(wordmark)`, as you do now. A group
  with `animation: none` has no duration, so its images swap in one step.
- The old wordmark fades out over the first 35% of the group's duration and
  the new one fades in from 40%, so the two are never legible together. The
  percentages are of time; the group's curve shapes each fade. With an
  ease-out group the box is most of the way there by 40%, so the new
  wordmark lands with the morph, not after it.
- `height: 100%; object-fit: none` draws each wordmark at its own size inside
  the morphing box instead of stretching it; `object-position` anchors it
  where your wordmark sits.
- `animation-fill-mode: both` holds the old one hidden after its fade. Today
  it comes from Astro's layer, not the group; say it yourself so the recipe
  does not lean on Astro. Without it, if your root runs longer than the group
  (cottagecore's page turn runs 640 ms against a 560 ms group), the old
  wordmark comes back for the rest of the transition.
- The fades apply only when arriving from another school. Between two of
  your own pages the two wordmarks are identical, and fading one out and the
  other in would make a still wordmark blink. There the guard leaves Astro's
  matched crossfade in place, now on the group's clock: the two images add
  up to full opacity on every frame, so the wordmark holds still.
- Astro also writes `[data-astro-transition-fallback]` rules. They animate
  the element itself in a browser without view transitions, and the portal's
  router runs with `fallback="none"`, so they never apply.
- Quiet carries the same default in `src/themes/quiet/portal.css`, which only
  the `/t/quiet/` route imports, so the root pages never load it. Quiet's
  group keeps the browser's default morph (250 ms, `ease`).
- `motion.mjs --crop wordmark` films the wordmark and judges it: an arrival
  fails if both images are above 10% opacity at once, an in-school swap if
  the two add up to less than 90%.

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
no JSON-LD, no em dash, contrast in both schemes, view-transition names only
in the three shapes and each used once, no horizontal scroll at 390 px, no
console errors, no network requests outside the site.
