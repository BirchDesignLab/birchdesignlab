# BDL-003 · Novgorod Letters · Design

*Spec agreed 2026-07-16. Decisions made with the founder in session; the founding record and website spec remain the parent documents. Supersedes the one-line description in the 2026-07-15 plan backlog.*

## 1. What it is

A birch-bark letter reader at `/lab/bdl-003`. Three real medieval letters from the Novgorod excavations, the ones the founding record names: a child's homework, a love note, a household list. The visitor digs them out by hand: scratching uncovers the original strokes as fresh incisions, and continued rubbing dissolves the strokes into a plain-English translation blooming in place. The artistic piece of the Lab; it ties directly to the founding myth ("the oldest paper of the north").

This is a deliberate flex. All BDL experiments are. The quality bar is museum-grade on all three letters, not a polished one and two filler pieces.

## 2. Experience

**The dig site.** One full-screen scene, dark field. Three bark fragments lie on the table like finds on an excavation bench, each with a smallcaps plate ("a child's homework · c. 1260"). Click or tap a fragment: it lifts to center stage.

**The dig.** Pointer or finger drag scratches the surface. Original Cyrillic strokes emerge under the cursor as pale incisions, cut bark showing through. At roughly 85% stroke coverage the dig completes: the strokes glow briefly, and further rubbing transitions them, in place, into the English translation set in Spectral italic like a museum caption.

**Stepping back.** A "return to table" action drops the fragment back. Each fragment remembers its dig state for the rest of the visit (in-memory; a fresh visit starts clean).

Two-layer reveal was chosen over scratch-to-translation directly: the visitor should meet the artifact before the meaning.

## 3. Content

| Letter | Source artifact | Why |
|---|---|---|
| A child's homework | Gramota 202 (Onfim, ~age 7, exercises plus his warrior doodle) | The famous one; the doodle is the soul of the piece |
| A love note | Gramota 752 (woman reproaching a man for staying away) | The founding record's "love notes" |
| A household list | A debt or shopping list chosen at trace time from the published corpus | The founding record's "shopping lists" |

**Letterforms are hand-traced.** Each gramota's actual ductus is traced into SVG paths from published artifact drawings: Onfim's wobbly child hand stays wobbly. A font cannot fake a seven-year-old, and the whole piece rests on "an ordinary hand scratched this." Tracing letterform shapes of 800-year-old artifacts is clean rights-wise; we trace shapes, we do not reproduce photographs.

**Translations are ours.** Originals are public domain; modern scholarly translations are not. Plain-English translations get written in-house from public-domain transcriptions. The texts are short and simple. Translations follow the site writing rules (human voice, no emdashes).

**One letter = one data file**: stroke paths, transcription, translation, caption, date. Adding a fourth letter later is one file and one trace.

## 4. Architecture

House pattern, same as BDL-001/002:

```
src/experiments/bdl-003/     component folder (scene, dig canvas, plates)
src/content/lab/bdl-003.md   entry flips forthcoming to live
src/lib/scratch/             pure math, unit-testable, renderer-agnostic:
                             scratch-mask coverage tracking, stroke-progress
                             thresholds, letter data schema
```

**Rendering: canvas2D masking, not WebGL.** The reveal is compositing (a scratch mask applied destination-in over a stroke layer); canvas2D does this exactly and stays debuggable. Stroke SVGs rasterize to an offscreen canvas once per letter and size. The living bark surface underneath reuses the existing bark renderer (`src/lib/bark/`), which already handles WebGL, fallback, themes, and reduced motion.

Layer stack, bottom to top: bark field (existing renderer) · stroke layer masked by the scratch mask · translation layer masked by the post-completion rub mask · plates and UI in DOM.

**Registry line** in the experiments registry, `href` per the lab schema.

## 5. Accessibility and mobile

- Touch scratch works natively: the scene is full-screen, drag means dig, no scroll conflict.
- Reduced motion: no lift or bloom animation; scratching still functions (user-initiated motion is exempt by the policy's spirit). Completion swaps layers without the glow.
- Specimen plate is the full fallback: all three letters as text, transcription plus translation, serving JS-off and screen-reader visitors. Lab pieces are AA-exempt by policy; the plate carries the content honestly.
- Desktop-forward per the entry's device badge, but the dig is finger-friendly by nature.

## 6. Testing and tuning

- **Unit** (vitest, alongside the existing 26): scratch-mask coverage math, stroke-progress thresholds, letter data schema validation.
- **Founder fiddle round** on scratch feel: brush radius, reveal softness, glow and bloom timing exposed as dev-side knobs, styleguide pattern. Autonomous build delivers foundations; feel is locked by hand.

## 7. Out of scope

- Sound.
- More than three letters at launch.
- Photographic artifact imagery.
- Persisting dig state across visits.
- BDL-004 (the view-source CSS feat) stays parked.
