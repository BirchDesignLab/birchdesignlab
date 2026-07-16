# BDL-004 · The Loom · Design

*Spec agreed 2026-07-16, evening session. Decisions made with the founder in session; the founding record, website spec, and lab backlog are the parent documents. BDL-004 was previously reserved for the view-source CSS feat (the Painting); that piece returns to the backlog unnumbered, and the Loom takes the slot, because the goal right now is quick wins and the Loom is the cheapest concept on the board.*

## 1. What it is

A working handloom at `/lab/bdl-004`. The visitor weaves real cloth: an authentic four-shaft draft system drives the interlacement, stripe sequences in warp and weft unlock plaids and houndstooth, and the finished cloth downloads as a wallpaper. First deliberately non-birch artistic piece in the Lab. Craft rather than nature; tactile like 003's dig, but a different sense.

Museum-grade bar applies, same as 003. The authenticity flex here is the draft system: the loom uses the same notation weavers use, and the patterns emerge from the system instead of being painted on.

## 2. Experience

**The bench.** Full-screen scene, dark field. Cloth hangs center stage with the woven edge live at the fell line. A treadle bar sits at the bottom. A side panel holds the draft and the yarn shelf.

**Weaving by hand.** Press a treadle, throw the shuttle: one pick beats in with a small satisfying snap. Every pick is real; the cloth grows.

**Letting it run.** Release a lever and the loom weaves itself at a steady pace. Hands-on for the curious, hypnotic for the passive. The lever stops it again.

**The draft.** Threading, tie-up, and treadling grids in real weaver's notation, all editable cell by cell. Presets carry visitors who just want cloth: plain weave, 2/2 twill, herringbone, houndstooth, and goose eye (a point-twill diamond). Overshot was considered and deferred: authentic overshot needs a second tabby shuttle, which complicates the engine for one preset; it returns with the eight-shaft instrument idea.

**The yarn shelf.** A curated shelf of roughly 12 to 16 natural-dye colors (madder, indigo, weld, walnut, undyed wools). No free color pickers; every combination should look intentional, like a weaver's stash. Warp and weft each take a repeating stripe sequence (for example 4 dark, 4 light), which is what makes plaid and houndstooth possible.

**The daily warp.** Each day the loom opens already warped with a different draft and colorway, seeded by date. The site grows something new daily; here it is cloth instead of a tree.

**Cutting the cloth.** A "cut the cloth" action downloads the woven fabric as a PNG, rendered offscreen at device resolution, tileable, wallpaper-ready.

## 3. Draft engine

Standard four-shaft, six-treadle draft. Interlacement is pure math:

```
over = tieUp[treadling[pick]][threading[end]]
```

Stripe sequences repeat independently along warp and weft. All of it lives in `src/lib/weave/`, renderer-agnostic, unit-tested. Presets are data files; adding a preset is one file.

## 4. Architecture

House pattern, same as BDL-001/002/003:

```
src/experiments/bdl-004/     component folder (bench scene, cloth canvas,
                             draft panel, yarn shelf, treadle bar)
src/content/lab/bdl-004.md   entry flips forthcoming to live
src/lib/weave/               pure math, unit-testable, renderer-agnostic:
                             draft interlacement, stripe sequencing,
                             preset and yarn schema
```

**Rendering: canvas2D per-thread, not WebGL.** Threads draw as rounded segments with a subtle gradient sheen, shadow at intersections, and seeded per-thread jitter so fiber reads as fiber instead of pixels. Compositing on canvas2D stays debuggable, and the bark renderer already occupies the WebGL slot in the house. WebGL and SVG/DOM approaches were considered and passed over (overkill and node-count death, respectively).

**Registry line** in the experiments registry, `href` per the lab schema.

## 5. Accessibility and mobile

- Treadles are real buttons, keyboard-operable. The lever and shuttle throw are buttons too.
- Reduced motion: no auto-weave; the cloth renders in its woven state instantly. Hand-treadling stays, since user-initiated motion is exempt by the policy's spirit. No beat snap animation.
- Specimen plate is the full fallback: what a draft is, the preset drafts as text grids, and the yarn shelf as a list, serving JS-off and screen-reader visitors. Lab pieces are AA-exempt by policy; the plate carries the content honestly.
- Mobile fully native: tap treadles, tap to throw, panel collapses to a drawer. No location, mic, or any other permission prompt, per house rule.

## 6. Testing and tuning

- **Unit** (vitest, alongside the existing suite): draft interlacement math, stripe repeat math, preset and yarn schema validation, date-seed selection.
- **Founder fiddle round** on feel: thread thickness, sheen strength, jitter amount, beat snap timing, auto-weave pace, all exposed as dev-side knobs, styleguide pattern. Autonomous build delivers foundations; feel is locked by hand.

## 7. Out of scope

- Sound.
- More than four shafts or six treadles (an eight-shaft mode could live in an internal instrument later).
- Overshot and any other two-shuttle structure (needs a tabby shuttle; deferred with the eight-shaft idea).
- Free color pickers (a hidden free mode was considered and dropped from launch scope).
- Persisting cloth or draft state across visits beyond the daily seed.
- The Painting (view-source CSS feat), which returns to the backlog unnumbered.
