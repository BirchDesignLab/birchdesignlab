## Decisions made on the founder's behalf

Each of these was a call the brief left open. All are reversible by editing the
file named.

1. **Both framings rendered for every clip, no pick made.** The brief asks for the
   founder to choose the framing, and clips cannot wait on the choice. Files are
   named `<ID>-PHONE-VT.mp4` and `<ID>-SHORT-VT.mp4`; the unchosen set is deleted
   when the choice is made. (`render/screen-framing.mjs`)
2. **Served from a built `dist` on :4400, not `astro dev` on :4321.** `astro dev`
   deadlocks at startup on this machine (a vite module-runner fetch of astro's own
   logger never returns, with a cleared cache, from the sandboxed shell and from
   a terminal tab outside it). Every theme script already serves a build, so
   the page recorders take `BDL_BASE`. The tree was rebuilt immediately before the
   render, so the clips show the checked-out commit; `BDL_BASE` must be a local
   address. (`lib/devserver.mjs`, README "When astro dev will not start")
3. **Rendered from `origin/main`, not the Stage 5 branch.** The Portal's schools
   on main today are what a visitor sees. Grandmillennial and cottagecore on main
   are earlier than the versions on `feat/theme-schools-tier3-stage5` (43 files
   differ under `src/`). If VP1 should show the Stage 5 versions, merge first and
   re-render; nothing else changes.
4. **A new branch, `feat/social-q4-screens`, off `origin/main`.** The working tree
   was on the Stage 5 branch (idle since Oct 5); it was not touched.
5. **A real window at a real device scale factor** (`--window-size`,
   `--force-device-scale-factor=3`), not Playwright's `deviceScaleFactor`. Under
   emulation the screencast delivers CSS pixels (390x844), a 2.8x upscale at 1080.
   The mouse, not touch, drives every take, so a hover state can show on the
   switcher and school list.
6. **DevTools screencast over `recordVideo`** (measured, below).
7. **The take ends and the recorder keeps filming to the end of the slot**, so
   a shape snapping back or a transition finishing is on camera, and every clip
   is exactly the calendar's `duration_s` (22, 18, 14).
8. **VP1 timing: 2.8 s a school** (list, swap and rest), 22 s in total. The school
   list covers each page for about a second of that. A critic found 2.6 s left
   under a second of clean page per school; 2.8 s gives about 1.5 s. A 3.2 s slot
   would give 2 s clean but push the clip to about 25 s, the top of the brief's
   range, and past the calendar's 22 s.
9. **V001 does not type over the default seed.** The seed field already holds
   "birch" and `BarkEngine.svelte` `rebuild()` (what typing runs) only swaps the
   dashes: it never calls `growTree()`. Only "New tree" regrows. So the take
   presses New tree (the real regrow, on a random seed), clears the field with
   Backspace, types "birch" (ending on the default tree), pulls the density once,
   then sweeps the pointer across the bark (the page's wake effect). The site's
   own how-to line says "Type a seed and watch the bark regrow", which the code
   does not do: copy and behaviour disagree (src untouched).
10. **VP2 (confirmed on `origin/main`):** the Swiss grid key (`GridKey.astro`,
   pointer hold, Space/Enter or G) and Bauhaus shape dragging (`parts/loose.ts`,
   circle, square, triangle on Home and Sent, drop back on release) are both on
   main today. The caption can keep both sentences.
11. **No tap or cursor overlay.** Nothing on screen shows the pointer. A ripple
   would live inside the view-transition snapshot. Say if you want one.

## Findings that will cost time again

- The screencast gives device pixels only from a real device scale factor
  (`probe:screencast`). `recordVideo` is a constant 25 fps but 1x: asked for
  1170x2532 it puts the 390x844 picture in a corner of a grey canvas.
- Generated ffmpeg filter sources default to 25 fps; an overlay takes its rate
  from its first input. An unpinned `color` background compressed the clips by
  25/30 and, in one framing, cut them short. All pinned `r=30`
  (`selftest:screens`).
- A fixed wheel step overshoots in a short window where a row is nearly as tall as
  the list. The take scrolls by the exact distance to the row.
- A step-counted mouse loop ran at ~36 ms a step, not the 16 it asked for. Pointer
  glides are driven by the clock (`glide()`).
- The `RAISED` framing (a 35% bottom inset so the site lifts its own bar) was
  tried and dropped: the site places the school list `inset + 72px` above the
  bottom edge, which pushed it off the top of the window
  (`scripts/probe-raised-dialog.mjs`).
- Opening the school list from a school late in the order leaves the list scrolled
  to that school; reaching quiet means scrolling up.

## Critic findings left in the clips

Opus film critics read every clip. What they flagged that is the site, not the
recorder:

- Quiet to Swiss shows ~0.2 s of near-black: the view-transition wipe.
- Swiss to Bauhaus shows the Swiss hero briefly under the Bauhaus switcher
  mid-transition.
- In SHORT every school is cropped to its top; Swiss's wordmark and the Bauhaus
  triangle sit behind the bar; the V001 controls panel covers most of the bark.
  In PHONE the UI text is small (list body copy ~10 px tall at 1080).
- Their picks, for the founder's input only: VP1 PHONE (whole schools in frame),
  VP2 SHORT (the grid key and shapes read at 2.4x), V001 PHONE (the bark is the
  subject and SHORT hides it).
