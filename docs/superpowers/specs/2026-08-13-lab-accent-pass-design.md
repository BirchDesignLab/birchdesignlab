# The Lab accent pass, and the chiaroscuro flip — design

*2026-08-13. Resumes work that stalled on 2026-07-30. Founder decisions from
this session are folded in and marked.*

## Provenance, and why this stalled

The Lab was to get four design passes: **accent, density, texture, motion**.
They were reviewed as frames in a Claude Design project, and two of them were
drawn:

- Project `027db389-4762-4e10-9ccd-6ab6a7752652`, design system
  `birch-design-lab-design-system-9084dec9-3437-4b45-9433-4ff780cc0cf9`.
- Files: `Lab Density Pass.dc.html`, `Lab Accent Pass.dc.html`, and
  `CatalogFrame.dc.html` (the component both passes drive).

**Density shipped** as `c9186df` on 07-30: the loose variant, applied to
`SpecimenCard` and `SpecimenCatalog`. That commit deliberately excluded two
properties and named them as accent-pass work: accent-tinted row hairlines, and
a filled active state on the filters.

**Then it stalled**, and the reason is worth recording because it is fixable.
The frames existed only as downloads, they were deleted from the machine, and
nothing in the repo pointed back at the design project. Recovering them cost a
session. The identifiers above are in this document so a third pass does not
repeat that.

The founder's own note from the time was **"loud accents with the relaxed
spacing."** The relaxed spacing is what shipped. The loud accents are this
document.

Texture and motion were never drawn. No frames exist for them.

## Decisions (FOUNDER, 08-13-26)

- **The Lab catalog goes loud (accent frame 1c).**
- **The floor everywhere else is 1a.** Wherever a specimen appears outside the
  Lab catalog, it carries at least the working-specimen dash. In practice that
  is the home page's Lab preview, which renders the two newest live specimens as
  lightweight lines.
- **Stage chrome (1e) and the study page (1f) are pushed to loud.** Both were
  drawn in the confident (1b) grammar. Extending them to loud is extrapolation,
  so the loud rules below are stated explicitly for those two surfaces rather
  than left to inference.
- **The chiaroscuro flip (1d) is folded into this pass**, not deferred.
- Texture and motion remain later passes and nothing here should pre-empt them.
  Stages keep their current treatment; this pass touches chrome only.

## Part one: the accent grammar

Loud, from frame 1c. Every token used already exists in
[`tokens.css`](../../../src/styles/tokens.css) in all three theme blocks, so
this pass introduces no new tokens.

The governing idea, in the frame's own terms: **green means working, leather
means waiting.** Accent is a status colour, not decoration. That is why
"in progress" moves off green.

### Catalog rows (`SpecimenCard`, `SpecimenCatalog`)

| Property | Today | Loud |
|---|---|---|
| Row hairline | `var(--line)` | `color-mix(in srgb, var(--accent) 45%, transparent)` |
| Catalog bottom rule | `var(--line)` | same accent-tinted mix |
| Row hover | none | `background: var(--green-surface)`, transitioned |
| Live specimen | nothing | accent dash, `0.85em` wide, `2px` tall, plus a `working specimen` smallcaps label beside the designation |
| Forthcoming | italic muted "forthcoming" | `in progress` chip, bordered and lettered in `var(--accent-strong)` |
| Type badge | accent text, accent border | filled: `background: var(--accent)`, `color: var(--on-accent)` |
| Device badge | unchanged | unchanged, stays `--mark-muted` on `--line` |
| Tech tags | `·` separated text | chips, accent text, border in the 45% accent mix |
| Filter, inactive | muted on `--line` | unchanged |
| Filter, active | accent text and border | filled: `--on-accent` on `--accent` |
| Title hover | accent | unchanged |

Spacing is not touched. The density pass settled it.

### The count

Frame 1c adds a line under the catalog intro, in accent smallcaps at
`--text-sm`, reading like `6 specimens · 3 working`. Singular when the count is
one.

This is also where the deferred accessibility item from the BDL-005 review gets
resolved: the count carries `aria-live="polite"`, so filtering announces its
result instead of changing silently.

### Stage chrome (extending 1e to loud)

The confident treatment as drawn: numbered `01/02/03` steps in accent smallcaps
in the how-to-operate placard, accent designation in the hatch pill and the
specimen plate, filled active state on the stage controls, and an accent dash
beside the plate's designation.

Pushed to loud, consistent with the catalog: plate tech chips take the 45%
accent-mix border, and the placard and plate hairlines take the same accent mix
that catalog rows do. Everything else in the frame stands.

The stage itself stays untouched. It belongs to the texture pass.

### Study page (extending 1f to loud)

As drawn: `live` chip filled in accent beside the designation, accent smallcaps
for the plate labels (Client, Delivered, Built with, Living specimen), tech
chips in the accent-mix border, and an accent dash after the living-specimen
link.

Pushed to loud: the section hairlines take the accent mix. The hero, the
commentary body, and the loud green band are untouched, per the frame.

## Part two: the chiaroscuro flip

**The Lab always renders the opposite face from the site.** Set the site to
dark, the Lab is light. Entering the Lab reads as the lights changing.

### Today's contract

`data-theme` on `<html>`, written pre-paint by
[`ThemeBootstrap.astro`](../../../src/components/ThemeBootstrap.astro) from
`localStorage.theme` or the system preference. `tokens.css` carries semantics in
three blocks: `:root, :root[data-theme='dark']`, `:root[data-theme='light']`,
and a no-JS `@media (prefers-color-scheme: light)` block.

Every semantic token is `:root`-scoped, which is exactly what makes a
subtree-level inversion impossible today.

### The change

Semantics move from `:root[data-theme=…]` onto a **face attribute that works
anywhere in the tree**: `[data-face='dark']` and `[data-face='light']`. The
bootstrap sets both attributes on `<html>`: `data-theme` stays the site
preference and the storage contract, unchanged, and `data-face` mirrors it.
Lab layouts set the inverted `data-face` on their own root element, and the
subtree re-tokenizes by inheritance.

The `--gf-*` loud-band tokens live in the same blocks, so the green bands invert
along with everything else for free.

### The snag, and it is the real work

[`BarkField.astro`](../../../src/components/BarkField.astro) reads its colour
from `getComputedStyle(document.documentElement)`. On a Lab page with an
inverted subtree, that returns the **site's** `--mark`, so the bark would draw
in the wrong face while everything around it inverted.

The fix is to read from the canvas element instead of the document element.
Custom properties inherit, so the canvas already resolves the face of whatever
subtree it sits in, and the same code then works both inverted and not.

This is a change to a component the handoff marks repo-authoritative. It is a
one-line read-target change, its guards are untouched, and the existing bark
tests plus a real-browser check on both faces cover it. It is called out here so
it is a decision rather than a surprise.

The component's `MutationObserver` needs no change. It watches `data-theme` on
`<html>`, and since the Lab's face is always derived from the site face, that
attribute still changes whenever the Lab's face does.

### Decisions this forces

- **The toggle still controls the site.** On a Lab page, pressing it flips the
  site preference, and the Lab inverts along with it. The toggle's own dot stays
  keyed to `data-theme`, so it reports the site face, not the local one.
- **No-JS visitors get an uninverted Lab.** The inversion needs the bootstrap to
  compute a face, and the no-JS path only has a media query. The Lab renders in
  the visitor's system face, which is the current behaviour and is correct, just
  not inverted. Accepted rather than solved: a CSS-only inversion would mean
  duplicating both semantic blocks a second time under the media query, and two
  more copies of the palette is a worse problem than a rare visitor seeing a
  Lab that matches the site.
- **OG cards do not invert.** They are generated at build in the dark face and
  stay that way. Cosmetic, not worth a build-time face fork.
- **The styleguide (bdl-002) is a Lab page and inverts with the rest.** It
  contains its own face-switching demonstrations; those are scoped to their own
  elements and are unaffected.

## Out of scope

- The texture pass. Stages keep their placeholder treatment.
- The motion pass, which has since grown into the Lab presentation-language
  work in `docs/lab-backlog.md` (entrance beats, transition grammar, motion
  budget, GSAP).
- Density. Settled 07-30 and not reopened.
- The shared chrome-free shell extraction, the `/lab/studies` empty state, and
  the other BDL-005 theme-pass triage items, except the `aria-live` count, which
  this pass gets for free.

## Acceptance

- Catalog, stage chrome, and study page carry the loud grammar on both faces.
- Green appears only on working things. Nothing forthcoming or in progress is
  green anywhere.
- Home's Lab preview carries the working-specimen dash.
- Filtering announces its result through the `aria-live` count.
- Navigating from any site page into the Lab visibly flips the face, in both
  directions, with the toggle still reporting the site's own face.
- Bark renders in the Lab's face, not the site's, on every Lab page that has a
  field.
- Accent-mix hairlines and chips clear contrast on both faces. The 45% mix is
  decorative, not text, so it is not held to 4.5:1; the accent-strong chip
  lettering is text and is (`--leather-caramel` 6.33:1 dark,
  `--leather-brown` ~9.6:1 light).
- `npx vitest run`, `npx astro check`, `npm run build` all clean, plus a real
  browser pass on both faces. Tests do not catch rendering drift.
