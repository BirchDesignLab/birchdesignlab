# BDL brand lockup and Cheer & Chatter sponsor card — design

*2026-08-08. Brainstormed with the visual companion (session
`.superpowers/brainstorm/139-1786211973`, screens preserved there). This spec
covers static brand assets only; it deliberately does not build the Cheer &
Chatter slideshow (their backlog 14), which gets its own spec in that repo.*

## Goal

Two deliverables, chosen over a single-asset or code-first approach during
brainstorming:

1. **A reusable BDL mark + lockup set** — the first real replacement candidate
   for the scaled-up favicon (handoff 2026-08-04, open item 5, "logo sucks but
   it's fine for now").
2. **A reference card design** for the Birch Design Lab developer-credit slide
   in the Cheer & Chatter Break/Sponsor showcase slideshow. The slideshow build
   later translates the reference into their component; nothing lands in the
   C&C repo now.

## Decisions made during exploration

Each of these was picked from alternatives on screen, not defaulted:

- **Mark direction: "dense bark" scatter.** Lenticel dashes set free of the
  favicon's box — nine dashes, varied weight and length, deliberately off-grid,
  like real birch bark. Chosen over: refined three-dash favicon (too close to
  the disliked original), pale trunk silhouette, Marcellus-B branch scar,
  hallmark seal, sparse-heavy trio, and an all-paper monochrome variant.
- **Accent stays in the mark.** Exactly one dash is moss green; the rest are
  paper. The monochrome variant was considered and declined.
- **Two lockups survive, final pick deferred.** The founder wants both around
  until the design sweep planned for the next month; they are cheap to keep.
  - **L1b "side by side":** mark at left, hairline rule, then
    BIRCH / DESIGN / LAB stacked on three lines — three dashes, three words,
    the wordmark echoes the mark's rhythm. Compact contexts.
  - **L3 "canopy":** the bark texture stretched into a wide band sitting over a
    single-line wordmark — the mark as weather rather than badge. Wide and hero
    contexts, and the one the chosen card uses.
- **Card ownership: takeover, not guest.** On the C&C olive slideshow the BDL
  slide flips to BDL's own charcoal surface for its few seconds — the developer
  credit looks like the developer's site. The house-style guest card (olive
  field, coral kicker pill) was mocked and declined.
- **Kicker: "Built By".** Over "Site & Live App" and over no kicker at all.
- **QR: yes, real, self-rendered.** Generated locally with the `qrcode`
  package (same library the C&C live app already uses for sponsor QRs — their
  CrowdScreen renders QR client-side from `sponsor.url`, no external service).

## The mark

All geometry is fixed, hand-tuned rects — nothing generated at runtime. Rounded
ends via `rx` = height/2. Colors: paper `#f4f0e6`, moss `#a3bd8f`, on charcoal
`#1c1a17` (the site's `--bark-warm`, `--green-moss`, `--charcoal` primitives).

**Dense mark** (`mark-dense.svg`, viewBox `0 0 120 120`), rects as
`x, y, width, height`:

| | | |
|---|---|---|
| 14, 16, 48, 3 | 70, 18, 24, 2.5 | 34, 34, 62, 3.5 |
| 10, 52, 26, 3 | **48, 54, 40, 4 — moss** | 20, 72, 52, 2.5 |
| 82, 74, 20, 3 | 30, 92, 38, 3.5 | 76, 94, 14, 2.5 |

**Small-size companion** (`mark-small.svg`, viewBox `0 0 120 120`) — the dense
mark muddies below roughly 32px, so small placements (favicon-scale, list
chrome) use a simplified four-dash cut with the same off-grid character:

| | |
|---|---|
| 14, 20, 52, 7 | 36, 44, 62, 7 |
| **10, 68, 30, 7 — moss** | 26, 92, 48, 7 |

**Canopy band** (inside `lockup-canopy.svg`, viewBox `0 0 240 54`): eleven
dashes in three loose rows:

| | | | |
|---|---|---|---|
| 18, 6, 58, 3 | 94, 8, 30, 2.5 | 140, 6, 52, 3.5 | 206, 8, 20, 2.5 |
| 42, 24, 34, 3 | **92, 22, 48, 4 — moss** | 156, 24, 40, 2.5 | |
| 26, 42, 24, 2.5 | 66, 40, 56, 3 | 138, 42, 30, 3.5 | 184, 40, 38, 2.5 |

## The lockups

Type is Marcellus (the site's `--font-display`), uppercase. Standalone SVGs
must not depend on Marcellus being installed: **wordmark text ships as outlined
paths**, with the live-text source kept in the SVG as a comment for later
editing.

- **`lockup-sideby.svg` (L1b):** dense mark, 1px hairline rule at 20% paper
  opacity, then BIRCH / DESIGN / LAB on three lines, letter-spacing 0.16em,
  line-height 1.4. Mark height ≈ wordmark block height.
- **`lockup-canopy.svg` (L3):** canopy band above BIRCH DESIGN LAB on one line,
  letter-spacing 0.24em. Band width ≈ 1.15× wordmark width.

Both are authored on transparent backgrounds in paper+moss (dark-face use). A
light-face variant is out of scope until the design sweep decides whether the
mark inverts (ink `#1f1b15` dashes) or always sits on a charcoal tile.

## The card

Reference for the C&C slideshow's BDL credit slide. 16:9, composed center-stack:

1. Kicker: BUILT BY — Marcellus uppercase, moss, letter-spacing 0.3em, small
   (≈13px at the mock's scale; the slideshow build converts to `vmin` units per
   their `.live-*` conventions).
2. Canopy band, ≈46% of frame width.
3. BIRCH DESIGN LAB — Marcellus uppercase, paper, letter-spacing 0.24em.
4. `birchdesignlab.com` — Spectral, stone `#a89f8f`.
5. QR bottom-right: the 27-module SVG on a paper `#F6EFE8` tile (C&C's paper,
   since the tile is the only non-BDL surface on the slide), rounded corners,
   inset ≈28px at 1080p.

Field: charcoal `#1c1a17`, full bleed. No coral, no olive anywhere on the
slide — the takeover is total or it reads as a mistake.

**QR:** encode `https://birchdesignlab.com`, generated with
`qrcode.toString(url, { type: 'svg', margin: 1, color: { dark: '#1c1a17', light: '#F6EFE8' } })`.
Verified scannable off-screen during the session. Committed as a static SVG;
regenerate only if the URL ever changes.

## Files

All in the BDL repo, branch + PR per repo rules:

```
assets/brand/
  mark-dense.svg
  mark-small.svg
  lockup-sideby.svg
  lockup-canopy.svg
  sponsor-card/
    card.html        (self-contained mock: fonts via Google Fonts link)
    card-1920.png    (1920x1080 export of card.html, the handoff artifact)
    qr-birchdesignlab.svg
  README.md          (one paragraph: what these are, geometry source of truth,
                      the deferred L1b-vs-L3 decision, sweep pointer)
```

`assets/` is a new top-level directory; nothing under it enters the site build.
The existing generated logo pipeline (`scripts/og/logo.ts`, favicon, manifest)
is untouched — replacing those is the design sweep's call, and these files are
its raw material.

## Out of scope

- The C&C slideshow itself (their backlog 14 spec; this card is an input to it)
- Favicon/OG/logo replacement in the BDL build
- Light-face lockup variants
- Site header/footer adoption of the new mark
- The L1b vs L3 final decision — deliberately open until the design sweep

## Acceptance

- Four lockup/mark SVGs render identically with Marcellus absent (text
  outlined), on both a charcoal and a transparent-checker background
- `card.html` opens standalone in a browser and matches the approved
  brainstorm mock (`tv-card-final.html` with kicker BUILT BY)
- QR on the PNG export scans to `https://birchdesignlab.com` from a phone at
  couch distance from a TV-sized render
- `npx vitest run`, `npx astro check`, `npm run build` all clean (assets are
  inert, so this is a no-regression check, not new coverage)
