# Wall Labels · How-to-Operate Placards · Design

*Spec agreed 2026-07-16, late evening session, right after BDL-004 shipped. Trigger: the founder found the Loom confusing to operate with no instructions anywhere. Applies to every existing experiment and every future one.*

## 1. What it is

Every experiment page carries a small always-visible placard, the wall label, that says how to operate the piece in two to four short imperative lines. Museum wall-label register: the card next to the exhibit that tells you what to do with your hands. Instructions are content, not code; they live in each entry's frontmatter and render through one shared component.

## 2. Content model

New required frontmatter field in the lab collection:

```ts
howto: z.array(z.string().min(1)).min(1).max(4)
```

- Required for every entry that renders a generated `/lab/<id>` experiment page. Entries with `href` are exempt, since they live at their own route and never get the generated page. All four current entries (BDL-001 through 004) have no `href`, so all four need labels. Enforced with a zod refine: `href` present or `howto` present.
- Each line is one short imperative sentence. Two to four lines. The cap keeps labels honest: if a piece needs five lines, the piece is too confusing and that is the bug.
- Writing rules apply: no emdashes, human voice, no jargon a museum visitor would not know.

Launch copy:

- **BDL-001 The Bark Engine:** "Type a seed and watch the bark regrow." / "Pull the sliders to change how the weather fell on it." / "Same seed, same tree, forever."
- **BDL-002 The Styleguide:** "Try the palettes and typefaces; contrast grades itself as you switch." / "Grow a bark panel of your own at the bottom."
- **BDL-003 Novgorod Letters:** "Scratch the bark to uncover what was written there." / "Keep rubbing and the old letters give way to English." / "Three letters wait under the toolbar."
- **BDL-004 The Loom:** "Press a treadle to open the shed, then throw the shuttle to weave." / "Or pull the lever and the loom weaves itself." / "Pattern and yarns live in the side panel." / "Cut the cloth to keep what you wove."

Copy above is provisional in the usual way: the founder retunes wording in review; structure is fixed. Lines for 001/002/003 get a fidelity check against the actual controls during implementation (BDL-001's exact control set, BDL-003's toolbar) before they ship.

## 3. Component

`src/components/WallLabel.astro`, props `{ lines: string[] }`. Rendered by `src/pages/lab/[slug].astro` immediately before the experiment stage (screen readers reach the instructions first; visually it floats regardless), so every generated experiment page gets it with zero per-experiment code.

- `<details open>` with a smallcaps `How to operate` summary. Open on load: the founder's complaint is discoverability, so the default is visible. One click folds it to the summary line for visitors who have it.
- Visual family of the SpecimenPlate: field background at ~88% with blur, 1px `var(--line)` border, `var(--mark-muted)` text, smallcaps summary.
- Position: fixed bottom-left on desktop, resting just above the specimen plate's summary strip (founder's call after seeing top-right: bottom-left stays clear of every current piece's controls, and the label reads as part of the plate family). It still floats over scrolling content on long pages like BDL-002; folding it is the remedy, same as the plate. `z-index` above the stage, below any modal. On narrow screens (≤720px) it docks full-width at the top, in flow.
- Lines render as an ordered list with no visible numbers, one line each.
- No JS, no state, no persistence. It renders open every visit; folding it is per-pageview. This is deliberate: no localStorage per the founder's no-fiddly-state instinct, and a returning visitor who already knows the piece pays one glance.

## 4. Accessibility

- Native `details/summary`: keyboard and screen-reader behavior for free.
- Sits in DOM order before the stage's canvas, after the heading, so screen readers hit the instructions before the experiment.
- Plain static HTML: JS-off visitors get it too, which upgrades the current JS-off story (plate only) to plate plus operating instructions.

## 5. Out of scope

- Per-step interactive tours, spotlight overlays, coach marks.
- Persistence of the folded state across visits.
- Video or animated demonstrations.
- Rewriting SpecimenPlate; it stays as is.

## 6. Testing

- Schema test: entry without `howto` and without `href` fails validation; entry with `href` and no `howto` passes; five lines fail, one line passes.
- All four existing entries updated in the same change; `npm test`, `npm run check`, `npm run build` stay green.
- Manual: label visible on load on all four experiment pages, folds and unfolds, does not block the Loom's treadle bar or the Letters' toolbar on mobile widths.
