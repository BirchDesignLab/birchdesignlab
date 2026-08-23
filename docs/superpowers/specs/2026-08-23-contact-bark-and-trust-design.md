# Contact page — living bark + on-page trust · design · 08-23-26

Closes the `/contact` design note (handoff open thread #11): a form left-aligned
in a wide `.wrap` leaves an empty right column on desktop, and the page carries
no on-page trust signals. This adds the living BDL-001 bark to the page and one
quiet trust line at the point of decision, and — as a shared piece the same work
needs — extracts the home hero's bark credit into a reusable component and lands
it on `/contact/sent`.

Founder brainstorm 08-23-26; decisions recorded inline below.

## Goals

1. Fill the dead right column with craft (the living bark), not filler.
2. Put the two highest-value trust signals on the page: service area + a reply
   promise, at the point of decision (under the form).
3. Name the living bark where it earns it, without leaking conversion focus off
   the form.
4. Make the bark credit reusable instead of a third hand-copied instance.

## Decisions (from the brainstorm)

- **Layout: form left, bark right (desktop); bark band above form (mobile).**
  Not a full-bleed background, not trust signals in the column — the column is
  pure bark, trust lines live under the form.
- **Trust line placement: directly under the form** (option A), not folded into
  the loud band and not the footer. The loud band keeps its existing "one person
  reads it" line; the footer service-area line is a **separate** follow-up.
- **`/contact/sent`: gets the BDL-001 credit as a real link.** `/contact` (the
  form page) gets **no credit** — every link off the form page is a conversion
  leak, and the credit would send visitors to the Lab, away from contacting.
- **Reuse, not mirror:** extract a shared `BarkCredit.astro`, refactor the home
  hero to use it, and use it on `/contact/sent`. The About page adopting it is a
  separate task (already filed).
- **Trust copy (provisional, founder finalises live):**
  `Mississippi Gulf Coast · A reply within one business day.`

## Layout

Single breakpoint at **720px** (the repo's existing mobile cut, used by
ExperimentLayout / WallLabel).

**Desktop (≥720px)** — a two-column grid inside the existing `.wrap`:

- Left column (60%): the form, existing markup unchanged, kept at its
  comfortable measure and left-aligned so it is not stretched to fill the column
  — quiet luxury, err toward more air than less.
- Right column (40%): a `position:relative` bark container anchored to the right
  edge, stretched to the grid row height so the rail runs the full height of the
  form block. A generous gutter sits between the form and the rail.
- The trust line sits under the form's submit button, inside the left column.
- Below the grid: the existing `.loud` email-alternative band, unchanged.

**Mobile (<720px)** — single column, source order:

1. Bark band — the same bark container, now a short full-width strip with an
   explicit height (target ~34vh, tune on device).
2. The form.
3. The trust line.
4. The existing `.loud` email band.

The bark container is the same element in both layouts; the grid/flow reshapes
it. Source order puts the bark first so mobile reads bark → form → trust → loud.

## The bark (reorientation)

One `BarkField` instance, `live`, `lockAspect`. `lockAspect` is the component's
existing opt-in for non-square fields ("short-wide fields keep their lenticel
shape instead of streaking"); it holds the dash *shape* steady while the field
reflows between the tall-narrow desktop rail and the short-wide mobile band. The
canvas is `position:absolute; inset:0`, so it fills whatever the container's
current shape is and `resize()`s via its ResizeObserver when the breakpoint
flips.

- **One instance, not two.** Two instances (one per breakpoint, CSS-toggled)
  would each create a WebGL context; the hidden one still holds GPU state. One
  instance that reflows is correct.
- **Density:** start from a single value between home's 170 and About's ~600
  (target ~300, tune on device). If one value cannot read well in *both*
  orientations, the fallback is a small `matchMedia` listener dispatching the
  existing `bark:retune` event at the breakpoint — no remount. Prefer one value;
  only reach for retune if the device pass shows streaking or muddiness.
- Pause-off-screen, 30fps ambient, pixelRatio cap, reduced-motion still-frame
  are all already in the component; nothing to add.
- **Device-verify (preview cannot composite WebGL):** the grain reads right in
  both the tall rail and the wide band; no streaking; GPU sane on the phone.

## `BarkCredit.astro` (extraction)

A small presentational component owning the credit's *type and hover*, not its
placement.

- **Props:** `href: string`, `label: string`, `class?: string`.
- **Owns:** the hairline smallcaps treatment, `--mark-muted` at ~0.72 opacity,
  hover/focus to `--accent`, `white-space: nowrap`, the transition. (Lifted
  verbatim from `index.astro`'s `.bark-credit`.)
- **Does not own:** absolute positioning. Each consumer positions it for its own
  hero/rail via the passed `class` (home keeps its bottom-centered pin; sent
  positions for its hero). This is the one real seam — the current `.bark-credit`
  bundles position with type, and the extraction splits them.
- **Consumers this PR:** home hero (refactor off the inline copy, same rendered
  result) and `/contact/sent` (new). Home's label/href stay
  `BDL-001 · The Bark Engine, live` → `/lab/bdl-001`; sent uses the same.

## Trust line

A quiet line under the form, `--mark-muted`, `--text-sm`, provisional copy
`Mississippi Gulf Coast · A reply within one business day.` (middot, no emdash
per the house writing rule). Marked provisional in code; founder finalises the
wording and the reply-promise SLA live. It is plain text, not a link.

## Non-goals (explicitly out)

- **About page BDL-001 credit** — separate task (`task_b719d7b0`); it consumes
  the same `BarkCredit.astro` once this lands.
- **Footer Mississippi Gulf Coast line + reserved-room comment cleanup** —
  separate task (`task_9cc4fa3f`), sequenced after the About credit.
- **The client testimonial** — lands on home + BDL-005, not here (handoff #8).
- **Any change to the form's POST / Worker / validation** — the form markup and
  `/api/contact` path are untouched; only the surrounding layout changes.

## Verification

- `npx vitest run`, `npx astro check`, `npm run build` all clean. The existing
  `contact-worker` / `contact-validate` tests must stay green (form path
  unchanged).
- No-JS: the bark is decorative and the form must still submit without it
  (BarkField is a progressive layer; confirm the form is not nested in the bark
  container).
- **Device pass (the real gate, preview cannot composite WebGL):** on a phone
  and a desktop — form still posts; bark reads correctly in rail and band with no
  streaking; the sent credit links to `/lab/bdl-001`; home hero credit unchanged;
  GPU draw sane.

## Files touched

- `src/pages/contact.astro` — two-column grid, bark container, trust line.
- `src/components/BarkCredit.astro` — new shared credit component.
- `src/pages/index.astro` — refactor the inline `.bark-credit` onto `BarkCredit`.
- `src/pages/contact/sent.astro` — add `BarkCredit` link to the existing bark
  hero.
