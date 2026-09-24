# Tier 3: the founder's Stage 0 decisions (09-23-26)

Binding. Where this file and a brief disagree, this file wins. The founder
answered "tier 3 yes to all" and "stage 0 yes to all", with the overrides
below, and added: "keep in mind that this is going to be the magnum opus for
at least a few months." The founder did not read all of `portal.md`.

**Per-school decisions outside Stage 0.** "Tier 3 yes to all" makes each
brief's recommended option the default. At each pair's stage, list the
per-school decisions being applied and let the founder revisit any of them
before the build starts (decisions are shared).

## Set-wide (portal.md section 7)

**S1. Reduced motion: out of scope for the portal.** Founder: "this is a lab
thing and a portfolio piece. i don't care about reduced motion in this
context." Drop P3 (the reduced-motion hard cut) and every per-school
reduced-motion item from Tier 3, and critics stop flagging it. Existing
reduced-motion code in schools may stay but gets no further work. Amend the
README's "Motion and backgrounds" section to match. The root business pages
(`/`, `/about/` and the rest, rendered by quiet through BaseLayout) are not
part of this: they keep their behaviour exactly. Tooling note:
`capture.mjs` emulates reduced motion for deterministic stills; if a school
stops honouring it, an infinite animation will be caught mid-frame, which is
fine for review but not for pixel diffs.

**S2. The view-transition naming contract: yes.**
- The switcher gets its own name (`bdl-switcher`) with no animation, so it
  holds still above every transition instead of tilting and ghosting with
  each school's arrival.
- `wordmark` stays the only name that pairs across schools.
- A school may name its own persistent chrome `<id>-*` (for example
  `vaporwave-taskbar`), applied only when both sides of the swap are that
  school, so the chrome holds still on in-school page changes and joins the
  school's arrival or departure otherwise. The runtime already sets
  `data-from-theme` on the arriving page (`runtime.ts:97`); Stage 1 adds
  `data-to-theme` on the departing page, and the README gives the selector
  recipe. The built-site guard keeps checking that names are unique per page
  and learns the allowed shapes (`wordmark`, `bdl-switcher`, `<id>-*`).
- Parked for the transitions phase, set-wide: whether each Home billboard
  carries `wordmark`, so the giant name morphs into the header wordmark when
  a visitor leaves Home.

**S3. Glass vs vaporwave: yes, with an override.** Founder: "honestly we
need more interactable details not less. even if they do nothing."
- Glass keeps the hero toggle and the location pill and gains more
  interactable details (switches, sliders, segmented controls, steppers,
  draggable panes). Where it is cheap, a control does something small and
  playful (the toggle flips the glass tint); it may also do nothing.
- This is a principle for every school, not only glass: more interactable
  details, not fewer.
- Accessibility and parity: a control that does something is a real control
  with an `aria-label`; one that does nothing is `aria-hidden` and not
  focusable. Check the word-parity guard for any visible label text.
- Glass wallpaper leads with warm or blue hues (the Big Sur warm set, or
  Bloom blue); magenta and cyan are accents only, to stay off vaporwave's
  palette. Glass adds no window title bar (vaporwave owns window chrome) and
  keeps its traffic lights.

**S4. Swiss vs bauhaus: yes.** No red type in bauhaus (its F2 declined);
swiss adds no lowercase (its D3 = none); a swiss rotated giant keeps the
copy's capital.

**S5. Needlework: yes.** Grandmillennial owns counted cross-stitch
lettering; cottagecore's hoop goes freehand with no alphabet row;
cottagecore gets twine, grandmillennial keeps bows.

**S6. Room placards: yes.** Each school's era, signature and lesson render
as a placard in the switcher dialog, plus a one-time prompt on the first
portal load. No dialog opens by itself.

**S7. Switcher order: yes, chronological by era after quiet.** Shuffle stays
random (it already is: `switcher.ts:178`).

**S8. Break the shared wireframe: yes.** Each school re-expresses the
process row and at least one other shared skeleton in its own idiom, and
schools may reorder sections.

## Per-school decisions taken in Stage 0

**Vaporwave F1 = (b).** The Home hero stays exactly as it is, as the one
sunset. The other pages get mall, lobby and screensaver framing (a lobby or
atrium, a `screensaver.scr` window, a Win95 desktop, a marble head). Rewrite
`meta.ts` era, signature and lesson to match (F2 wording in the brief, for
the founder's approval).
- Founder reference, 09-23-26: "i used to play a game called marbloid made
  by supyrb... one of my favorite types of vaporwave. greek marble,
  overstylized 3d graphics." Study these before designing vaporwave's pair
  stage: https://www.supyrb.com/project/marbloid/ and
  https://www.supyrb.com/project/vapordays/
- Implication: F3 (the head) and the plaza lean toward rendered, glossy,
  over-stylised 3D marble (busts, columns, spheres) rather than flat drawn
  vectors. three.js is already a dependency; the one-WebGL-canvas-per-page
  rule still holds, and Home's canvas is the sunset. Bring a concrete
  proposal to the founder at the pair stage.

**Glassmorphism D1: Liquid Glass forward.** Founder: "look to the new apple
liquid glass for inspiration." Lensing and refraction, specular edge light,
tint that adapts to what is behind the glass, controls that materialize
rather than fade (dossier sources [3] [4] [5]). **D3 = no:** the school
forbids paper grain, so no noise layer unless it proves necessary, and then
back to the founder. **D5:** superseded by S3 (keep and add controls).

**Bauhaus F2: declined** (S4).

**Swiss D1 = yes:** a red duotone of the Shining Tree still as a full-bleed
About field; drop the Home red rectangle. **D2 = yes:** one full-height
condensed "Birch" running vertically, About only. **D3 = none** (S4).

**Grandmillennial D = yes:** a decorative cross-stitch alphabet band on the
sampler, `aria-hidden` SVG.

**Cottagecore D1 = yes, dated 09-23-26.** Founder: "how about the 23rd since
that's today" (the day the schools were built). The specimen label,
postmark, stamp value, sampler signature and envelope carry studio-voiced
words with that one fixed date; how the date is lettered on each object is
a design choice. The words are copy: draft them and get the founder's
approval before they ship. **D3 = yes:** garden twine replaces the satin
bow.

## Stage 1 decisions (09-23-26, start of the Tier 3 session)

**The name is the Portal, not Period Rooms.** Founder: "The idea was 'the
portal' not period rooms. i'd like it to ship as the portal. similar concept
as the lab, experiments, studies, it's a thematic thing more so than just the
word. with the whole animated transition between themes it's like going
through a portal between them. was the original idea."
- BDL-010's visible title becomes "The Portal", and BDL-011's hero alt text
  follows. "Period Rooms" in older docs is history; new writing says the
  Portal.
- The theme matters more than the word: the animated transition between
  schools is the passage through the portal. Visitor-facing copy should carry
  that idea the way the Lab carries experiments and studies.
- The first-load prompt (S6) is copy: build with a placeholder, and bring
  drafted alternatives to the Stage 1 stop for the founder to pick from.
- Internal names that visitors never see ("room placards" in these briefs)
  can stay as they are.

**Quiet's current-page highlight: yes, root and portal together.** The
recommended fix below ships in Stage 1.

**S2 demo school: vaporwave's taskbar**, named `vaporwave-taskbar`, kept and
committed. Only the naming ships in Stage 1; the rest of vaporwave E9 waits
for the pair stage.

**Billboard carries `wordmark`: parked** until the transitions phase. No
prototype in Stage 1.

**Loading and the transitions phase (founder, after the P4 trace).** The
trace (`tier3-stage1/p4-trace.md`) found the wait is mostly the browser's
first draw of the destination page, which only an invisible draw ahead of
time removes. Asked whether a slower, game-style passage could mask the
loading, the founder said: "i don't want to literally go through a portal or
passage. i'd like individual transitions from one theme to any other given
theme. the slowed transition to cover the loading was just a thought. we need
the transitions to not get hung up on loading. if the only sensible way to do
that is preload everything, then maybe that's what we need to do and just eat
it up front. but we can do it in the transitions phase."
- No literal portal or passage gesture.
- The transitions phase builds individual transitions for each pair of
  schools (from any school to any other). The choreography is keyed on the
  arriving page, `html[data-theme='<dest>'][data-from-theme='<src>']`, in the
  destination's theme.css. `data-to-theme` only exists for the old capture
  (the swap removes it before any `::view-transition-*` pseudo exists), so it
  can name the departing page's chrome but cannot style the animation (the
  review panel proved this live; src/themes/README.md has the rule).
- Transitions must never stall on loading. Preloading and drawing
  destinations ahead of time, even everything up front, is acceptable. The
  off-screen draw is built in the transitions phase, not Stage 1.
- B4's warm-up stays as built: on dialog open, every other school's same
  page is fetched into memory with its files (Save-Data and 2G skipped); on
  Shuffle hover or focus, the pick is warmed.

**Answers at the Stage 1 stop (09-23-26).** To `tier3-stage1/stage1-report.md`,
"Decisions for the founder":
1. Prompt copy: draft B, reworded by the founder: "Welcome to the Portal.
   Choose a design school and watch the page transform. Shuffle for a random
   one, and swap between light and dark while you're there." It names no
   count; when all the schools are built, revisit it.
2. and 3. No repeats, and the list must not take over the phone. The placard
   is removed from the dialog, and lessons are kept for the BDL-011 case
   study. The school picker gets portal wording: its heading is "The Portal".
4. The prompt lives until a tap or click (on the prompt, its dismiss control
   or the switcher), across page changes and reloads in the session.
5. The bar's fixed width: fine as is.
6. The prompt arrives after 1000 ms, with a slower pulse.
7. The busy cue: bolder.
8. Vaporwave's pressed task button (instant or a fade): address later
   (backlog).
9. The dismiss label is "Dismiss the Portal prompt".
10. "The whole bdl-010 thing should be the portal now": the BDL-010 summary
    and how-to lines are rewritten around the Portal.
11. The root pages' inlined router CSS: explained (inert, about 1 to 2 KB,
    only the letter of "root untouched" is broken), and backlogged.
The founder then asked for a PR so they can merge and test on mobile live.
Stage 2 continues in a new session.

**Cottagecore, founder note during Stage 1 (for pair stage 5).** Founder:
"i do like the fireflies in dark mode. maybe we can do dandelion floaters for
the day mode?" The dark-mode fireflies are liked: protect them (the brief's
items 12 and 14 and D7 only refine them). Light mode gains a daytime
counterpart: dandelion seeds (pappus floaters) drifting across the page, in
the same spirit (independent clocks, never over body text, per D7's
placement rule). Design and bring it to the founder at the pair stage.

## Stage 2 start (09-23-26)

**The founder's mobile test of #88** (iPhone 17 Pro Max, Safari, private
mode): the switcher and prompt are good, entering and leaving the Portal
works, nothing individually looked broken. "Everything looked pretty good on
the phone. I am still impressed." Some transitions are "a little stuttery or
buggy, but i know that is coming down the road": transitions phase, not Stage
2. The plan is `tier3-stage2/stage2-plan.md`.

**Stage 2 decisions (09-23-26).** Founder: "do you trust your judgement on all
that stuff? if so let's go with exactly what you think we should do." All
nine recommendations in `stage2-plan.md` ("Decisions for the founder before
launch") are taken as written:
1. The P5 proof is filmed on cottagecore.
2. Stop after the proof, before the sweep adopts the recipe.
3. Quiet as a destination is fixed in Stage 2, by a stylesheet imported only
   by the `/t/quiet/` route (the root pages stay untouched).
4. The font-preload cap rises to four, for faces that paint above the fold;
   vaporwave adds Exo 2 and VT323. The first-load cost is shown at the stop.
5. The sweep runs in two waves of three (A: vaporwave, glassmorphism, swiss;
   B: cottagecore, grandmillennial, bauhaus).
6. Safari/WebKit filming is parked for the transitions phase (backlog).
7. Swiss's wordmark swaps in one step (the brief's station clock), never a
   crossfade.
8. Grandmillennial's awning is named `grandmillennial-header` if it blinks
   mid-swap.
9. Bauhaus's 12ch process heading is not widened (it tunes to today's copy).
The per-school defaults in `stage2-plan.md` apply as listed.

**At the P5 checkpoint (09-23-26).** The proof passed
(`tier3-stage2/p5-proof.md`). Asked about the empty header between the old
wordmark leaving and the new one arriving, the founder chose (b): each school
tunes its wordmark fade offsets in the sweep so the blank (both images under
10% opacity) stays at or under 80 ms, while the overlap judge still passes.
The judge gains a blank measurement first. Then: "let's kick off wave a".

**At the wave A stop (09-23-26).** To `tier3-stage2/wave-a.md`, "Open for the
founder": "your recommendation for all 3 calls sounds good. your two small
fixes sound fine in theory."
1. Swiss and glassmorphism name their headers `swiss-header` and
   `glassmorphism-header`, in-school only (the S2 recipe), so the nav holds
   still on in-school swaps.
2. Vaporwave's light scheme gets a gentler `vw-crt-on` (lower brightness
   through the opening, same beam line and timing); dark is untouched.
3. Swiss's six-panel desktop sheets keep four uneven beats (1, 2, 1, 2)
   under the ~700 ms cap; phones stay one panel per beat.
Also approved: vaporwave's view-transition background follows the scheme
(no dark band in light), and `preserveDrawingBuffer` goes if the strips hold
without it. Then a wave A follow-up, and a stop to assess before wave B.

**At the assessment before wave B (09-23-26).** Swiss's header band on a
scrolled in-school swap carries the bare field, so the column guides vanish
from it for the swap: accepted ("your small call on swiss is fine"). The
guides go at pair stage 4. Wave B runs as planned once the transitions-phase
list is settled (`tier3-stage2/assessment-before-wave-b.md`).

**What "the transitions phase" means (founder, 09-23-26).** "we'll
realistically never eliminate the stalling transitions. the 'post A+
transition phase' i meant was making the transitions into transformations
essentially. we have some nice, simple low motion ones now. i want to crank
that up a notch." The post-A+ push is about richer motion, transitions
becoming transformations, not about removing every stall. Stalls get reduced
where it is possible, never promised away.

**The four held items (founder, 09-23-26).** From the assessment's list, all
four are held until after wave B, then reviewed together: "we may see a
pattern emerge from these issues that may become more evident later."
1. Safari: cannot be tested with the founder's current equipment.
2. The dark-desktop first-draw freeze: "if that is possible we should
   consider it."
3. The wordmark dropping in from above on a swap clicked low on a page:
   still a concern.
4. Glassmorphism's plain-fade page change: still a concern.
Wave B builders record what they see of items 2 and 3 in their schools, as
evidence for that review. They fix none of the four.

## Still open from before (carry forward)

- Quiet's header marks Contact as current on `/contact/sent/`, on the root
  site and in `/t/quiet/` alike (one component, `src/themes/quiet/Header.astro`,
  also rendered by `SiteHeader` on every non-portal page). Founder, 09-23-26:
  if it is fixed in the portal it must be fixed on the root too.
  Recommended fix, awaiting the founder's yes, for Stage 1: page links light
  only on their own page (Contact dark on the sent page), while the Lab link
  keeps lighting across the whole Lab section (`/lab/`, `/lab/experiments/`,
  `/lab/studies/`), which the current prefix match does on purpose. The only
  visible change on the live site is Contact no longer highlighted on the
  sent page; root copy parity is unaffected.
