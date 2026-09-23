# P4: the delay between the click and the first visible change

Written 09-23-26, Tier 3 stage 1 (the Portal, BDL-010), by the P4 measurement
agent. Measurement only: nothing under `src/` was changed. The remedy is for
the agent that implements it, and the choices marked as founder decisions are
the founder's.

## The short answer

- **The portal's own code is not where the time goes on the local build.**
  From the click to `document.startViewTransition` takes 18 to 39 ms cold
  (fetch about 10 ms, stylesheet preload about 5 ms, font wait 0 ms in every
  one of about 300 runs).
- **The time goes to two things after that:**
  1. The browser's first render of the destination school's page, before
     the new snapshot can be taken: 33 ms (swiss) to 146 ms (vaporwave). It
     is a one-time cost per school per tab. Prefetching does not remove it.
     Rendering the destination once, invisibly, ahead of the click does.
  2. Each school's own choreography, which changes almost nothing on screen
     for its first frames: 60 ms (vaporwave) to 217 ms (bauhaus) from
     `ready` to the first visible frame, about 45 ms of which is the
     browser's frame pipeline and happens for every school.
- **Two more costs:**
  - On the very first arrival in a fresh browser profile, the GPU process
    compiles the effects each school uses, which adds 150 to 450 ms.
  - On a real network, every switch pays at least one round trip for the
    HTML, even when the page was prefetched, because the site's HTML is
    `max-age=0, must-revalidate`.
- **The remedies as portal.md words them would not move the number.**
  Prefetching the HTML and the font preloads saves 0 to 9 ms for five
  schools, locally and at +40 and +100 ms per request, and about 25 ms for
  cottagecore (whose 337 KB HTML is the one large download) locally.
  Lowering `FONT_WAIT_MS` saves nothing, because the wait never binds.
- **What does work (measured):**
  - The portal keeps the destination's HTML in memory, preloads its
    stylesheets, and renders the page once off screen while the switcher
    dialog is open. With that, swiss, vaporwave and cottagecore arrive in
    75 to 107 ms at any simulated latency.
  - The diagnostic prerender alone reaches glassmorphism 119 ms and
    grandmillennial 145 ms.
  - Bauhaus cannot reach 160 ms from the portal side. Even fully warm it
    shows its first change at 239 ms, because its circle wipe is invisible
    for about 170 ms beyond the pipeline floor. That is bauhaus's Stage 2
    item.

## Method

Script: `scripts/themes/trace-arrival.mjs` (new, header comment has usage).
Raw output under `scripts/themes/.out/trace-stage1/` (gitignored): per tag a
`.runs.json` with every run, and a `.summary.json` and `.summary.md` with
medians and spread. Chrome traces are the `trace-*.json` files, summarised in
`<tag>.traces.json`.

- **Build and browser:**
  - The HEAD build served by `wrangler dev` at `http://127.0.0.1:8787`.
  - Playwright Chromium with `BDL_GPU=1` and the same flags as
    `motion.mjs`. The renderer was verified as ANGLE D3D11 on the RTX 3070.
  - Dark scheme, reduced motion off.
  - Desktop is 1440x900. Mobile is `capture.mjs`'s `mobile` (390x844, 2x,
    touch).
- **Trigger:** the same client-side navigation `motion.mjs` uses for an
  arrival. On `/t/quiet/` there is no header link to `/t/<id>/`, so a
  hidden anchor is clicked and the ClientRouter handles it.
  - Arrival: `/t/quiet/` to `/t/<id>/`.
  - Return: `/t/<id>/` to `/t/quiet/`, with quiet loaded first, as every
    real visit is.
- **One clock:** an init script records on `performance.now()`:
  - the trigger and every `astro:*` event;
  - inside Astro's loader, the HTML fetch (start, headers, body),
    `DOMParser`, and the loader finishing. The runtime's font wait is the gap
    from there to `astro:after-preparation`;
  - `document.startViewTransition` (wrapped): called, update callback start
    and end (the DOM swap), `updateCallbackDone`, `ready` and `finished`;
  - resource timings after the trigger, long animation frames with script
    attribution, and every `requestAnimationFrame`.
- **Screen:** the DevTools screencast runs through every arrival.
  - **First visible:** the first frame after the trigger in which more than
    0.4% of pixels (and more than 1.5 times the page's own idle motion)
    moved by more than 32 levels from the last frame before the trigger.
  - **First any:** the same with a 0.05% floor. It catches a wordmark
    starting to move. It equals first visible for every school except
    grandmillennial (about 20 ms earlier) and the quiet return.
  - Frame timestamps are mapped onto the page clock with `Date.now()` taken
    at the trigger.
- **Conditions:** each cold condition runs in a fresh browser context, so
  the cache is empty.
  - `cold`: nothing of the destination fetched before.
  - `pf-brief`: portal.md's remedy as written. The destination HTML is added
    as `<link rel=prefetch>` and its font preloads are added before the
    click.
  - `pf-full`: `pf-brief` plus its stylesheets preloaded and its new module
    scripts modulepreloaded.
  - `pf-decode`: `pf-full` plus each preloaded font loaded through the
    FontFace API and used off screen.
  - `pf-render`: the destination rendered once in an invisible,
    script-less, same-origin srcdoc iframe, then removed. The site sends
    `X-Frame-Options: DENY`, so `src` cannot be used.
  - `pf-memory`: `pf-full` plus the router's HTML fetch answered from a copy
    held in memory.
  - `pf-best`: `pf-render` plus `pf-memory`.
  - `warm`: a second arrival in the cold run's context.
- **Latency:** `--latency 40` and `--latency 100` add that many ms to every
  request that reaches the network, using DevTools emulation.
- **Zaraz:** blocked through CDP `Network.setBlockedURLs`, not
  `context.route()`, because Playwright turns the HTTP cache off in any
  context with a route. That would have made every condition cold.
- **Runs:**
  - Desktop, all six schools: 7 runs per condition.
  - Swiss and vaporwave returns: 7 runs.
  - Mobile, swiss and vaporwave both ways: 5 runs.
  - Diagnostics and latency runs: 5 runs each.
  - Chrome performance traces (`browser.startTracing`): one cold arrival
    per school on desktop, both directions for swiss and vaporwave on
    desktop and mobile, and two first-in-a-fresh-browser arrivals (glass,
    vaporwave).
  - About 600 measured navigations in total.
  - The traces are summed per thread (renderer main, compositor, raster
    workers, GPU process) as self time by activity, between each pair of
    phases.

## What happens between the click and the first frame (Astro 7.3.4)

Read from `node_modules/astro/dist/transitions/router.js`, `events.js` and
`swap-functions.js`, and confirmed by the marks:

1. **The click.** The ClientRouter's click handler calls `navigate()`.
   `astro:before-preparation` fires synchronously within about 1 ms. The
   portal runtime wraps `e.loader` there to also await the destination's
   font preloads, capped at `FONT_WAIT_MS`.
2. **The loader** (`defaultLoader`):
   - `fetch()` the HTML (no cache mode, so the HTTP cache rules apply);
   - `DOMParser`, then drop `<noscript>`;
   - add `<link rel=preload as=style>` for every stylesheet the current page
     lacks, and await all of them;
   - after that, `astro:after-preparation`.
3. **`document.startViewTransition(updateDOM)`**, called straight after,
   with no work in between (0.3 ms). The old page stays live and on screen
   until here.
4. **Old-state capture.** The browser renders one more frame and captures
   the old snapshot. This takes 5 to 15 ms, mostly waiting for the next
   frame. From here, rendering is paused until `ready`.
5. **The update callback (the swap).** `astro:before-swap` fires (the
   runtime's attribute carry-over), then `swap()` swaps the head and the
   body, then `astro:after-swap`. This takes about 5 ms.
6. **`updateCallbackDone`.** Astro then runs the new page's scripts
   (`runScripts`) and fires `astro:page-load`. It does not wait for them.
   The browser meanwhile does the new page's first style, layout and paint,
   captures the new snapshot, builds the pseudo-element tree, and resolves
   `ready`.
7. **The first animated frame** reaches the screen 2 to 3 frames after
   `ready` (the pipeline floor, about 45 ms here). From there on it is the
   school's keyframes.

Everything the portal code controls sits in steps 1 to 3. Steps 4, 5 and 7
belong to the browser. Step 6 is the destination school's page, and step 7's
content is the school's choreography.

## Results: desktop, dark, local build (median ms after the trigger)

Cold arrivals, 7 runs each. Spread is the interquartile range of the first
visible frame.

| school | first visible (IQR) | to startViewTransition | old capture | swap | new-state render | ready to first visible |
|---|---|---|---|---|---|---|
| swiss | 137 (134 to 137) | 18 | 12 | 5 | 33 | 68 |
| glassmorphism | 180 (171 to 201) | 19 | 13 | 5 | 68 | 80 |
| grandmillennial | 226 (214 to 241) | 22 | 7 | 5 | 91 | 101 |
| vaporwave | 248 (243 to 275) | 18 | 15 | 5 | 146 | 66 |
| cottagecore | 259 (252 to 261) | 39 | 6 | 6 | 137 | 69 |
| bauhaus | 304 (301 to 305) | 19 | 9 | 5 | 50 | 217 |

Inside "to startViewTransition", cold, every school:

| part | time |
|---|---|
| HTML fetch | 9 to 11 ms (cottagecore 26 ms: its HTML is 337 KB against 15 to 73 KB for the others) |
| stylesheet preload wait | 5 to 7 ms |
| font wait | 0 ms |

The runtime's font preloads start at `astro:before-preparation`, in parallel
with the HTML fetch, and finish before the HTML and the stylesheet do.

The same arrivals under each condition (first visible, median):

| school | cold | pf-brief | pf-full | pf-render | warm |
|---|---|---|---|---|---|
| swiss | 137 | 133 | 131 | 95 | 91 |
| glassmorphism | 180 | 177 | 162 | 119 | 80 |
| grandmillennial | 226 | 233 | 201 | 145 | 137 |
| vaporwave | 248 | 243 | 245 | 84 | 80 |
| cottagecore | 259 | 234 | 233 | 96 | 88 |
| bauhaus | 304 | 297 | 290 | not run | 239 |

`pf-render` comes from the diagnostic batch (5 runs; that batch's cold
medians are within 15 ms of the table above). `pf-decode` sat on `pf-full`
for every school (vaporwave 241, cottagecore 236, grandmillennial 212,
glassmorphism 158, swiss 124).

Returns to quiet are already fast and do not depend on the cache, because
quiet's assets are always cached:

| return | cold | warm |
|---|---|---|
| swiss to quiet | 77 | 76 |
| vaporwave to quiet | 49 | 48 |

The return is quiet's default 250 ms crossfade. On the vaporwave return,
quiet's BarkField script runs inside the new-state window, so the `ready`
promise settles a few ms after the first frame is already on screen. That is
why its "ready to first visible" is about 0.

### Mobile (390x844, 2x, touch), dark, 5 runs

| school | cold | pf-brief | pf-full | warm | new-state render (cold) | ready to first visible |
|---|---|---|---|---|---|---|
| swiss | 97 | 94 | 93 | 61 | 27 | 41 |
| vaporwave | 203 | 202 | 193 | 60 | 114 | 49 |

Returns to quiet on mobile: 72 ms (swiss), 46 ms (vaporwave). The shape is
the same as desktop. The emulation runs on the desktop CPU and GPU, so these
are not phone numbers. A mid-range phone's CPU is several times slower, and
the new-state render (pure main-thread work) would scale with it. That is an
inference, not measured.

### The Chrome traces (main-thread self time in the new-state render window, cold)

| school | window | layout | text shaping | style recalc | other |
|---|---|---|---|---|---|
| vaporwave | 146 ms | 70 | 50 | 23 | 3 |
| cottagecore | 132 ms | 91 | 26 | 8 | 7 |
| grandmillennial | 91 ms | 46 | 32 | 7 | 6 |
| glassmorphism | 70 ms | 41 | 18 | 8 | 3 |
| bauhaus | 55 ms | 30 | 11 | 10 | 4 |
| swiss | 32 ms | 16 | 11 | 3 | 2 |

- **It is one lifecycle task** (`ViewTransition::ProcessCurrentState`,
  `AnimateTagDiscovery`, then `UpdateStyleAndLayout`). There is no script in
  it (0.2 to 1.3 ms), no network wait and almost no GPU work.
- **Vaporwave's style recalc** styles 222 elements in 22 ms. Its layout of
  304 objects takes 121 ms including shaping.
- **Warm, the same window is 5 to 17 ms for every school.**

Other windows:

- **Before `startViewTransition`:** main-thread work is 7 to 14 ms. It is
  mostly the router's own script and request bookkeeping; cottagecore adds
  3.7 ms of HTML parsing.
- **Old-state capture:** 3 to 4 ms of work. The rest of the window is
  waiting for the frame.
- **Swap:** 5 to 7 ms, of which script is 3 to 4 ms.
- **Ready to first visible:** the GPU process rasterises and draws the
  pseudo-element layers:
  - raster 5 ms (swiss) to 56 ms (glassmorphism);
  - the main thread does 10 to 41 ms of paint and commit;
  - on vaporwave it also starts the sunset script (Astro's `runScripts`
    runs here) and waits on the GPU for about 6 ms.

## Where the time goes

**(a) Portal-side: time the portal code can remove.**

1. **Load, 18 to 39 ms cold locally (fetch, stylesheet preload,
   parse).**
   - On a network this becomes one round trip for the HTML and a second,
     sequential one for the stylesheets, because their URLs are only known
     once the HTML has arrived.
   - At +40 ms per request, swiss's time to `startViewTransition` is
     109 ms; at +100 ms it is 232 ms.
   - The HTML round trip stays even when warm or prefetched, because the
     HTML is `max-age=0, must-revalidate`. At +100 ms, a warm swiss arrival
     still spends 107 ms on the fetch.
2. **The destination's first render, 33 to 146 ms.** It happens inside the
   school's page, but the portal can move it out of the click path. One
   invisible render of the destination ahead of time brings it to 6 to
   16 ms (`pf-render`, `pf-best`). Prefetching does not touch it (`pf-full`,
   `pf-decode`), so it is a renderer-side first-use cost, not a download.
   Prewarming vaporwave's Japanese line in the system CJK fonts changed
   nothing (`--prewarm-kana`, 143 ms against 143 ms), so that is ruled out
   as the cause.
3. **Font wait: 0 ms in every run**, including +100 ms per request.

**(b) School-side: belongs to each school's Stage 2.**

1. **The choreography's invisible start.** Ready to first visible, cold
   and warm alike: bauhaus 214 to 217, grandmillennial 92 to 104,
   glassmorphism 52 to 80, swiss 66 to 68, cottagecore 49 to 69, vaporwave
   40 to 66.
   - Every school shows 40 to 60 ms of unchanged frames after `ready`. That
     is the pipeline floor, common to all.
   - Beyond it, the start of each animation is near invisible:
     - **Bauhaus:** `bh-wipe-circle` grows from `circle(0%)` at the top
       right under `cubic-bezier(0.7, 0, 0.2, 1)`. That ease has zero slope
       at the start, and the corner it opens is dark on both pages. The
       changed share creeps from 0.01% to 0.45% between +87 and +227 ms. The
       wordmark group is also delayed 120 ms.
     - **Grandmillennial:** the drapes open from a centre line under
       `cubic-bezier(0.62, 0, 0.22, 1)`, another slow start.
     - **Glassmorphism:** `glass-leave` is `cubic-bezier(0.4, 0, 1, 1)`
       (ease-in), and the new page starts at opacity 0.
     - **Swiss:** the wipe is `step-end`, so the first column appears only
       at 40 ms.
     - **Vaporwave:** `vw-crt-off` is ease-in, and `vw-crt-on` starts as a
       dot.
2. **The new-state render cost itself**, if a school wants it smaller
   without relying on the portal's prerender:
   - layout and shaping dominate (cottagecore 91 ms of layout, vaporwave
     70 ms plus 50 ms shaping);
   - cottagecore's HTML is 337 KB;
   - vaporwave's stylesheet is 57 KB and it uses Exo 2 Variable and VT323,
     which are not in its preload list. They are fetched by the CSS after
     the swap (resource timing shows them requested at +42 and +62 ms).
3. **First use of each effect in a fresh browser: +150 to 450 ms, once.**
   - In a fresh browser, the first glassmorphism arrival took 454 ms from
     `ready` to the first visible frame instead of about 80. The GPU process
     spent 283 ms in raster flushes and 133 ms finishing render passes,
     which is shader and pipeline compilation for the blurred, scaled
     snapshot.
   - The first vaporwave arrival took 261 ms instead of about 66. The GPU
     process was busy 246 ms, and the main thread waited on it for 73 ms
     while the sunset's WebGL started.
   - In every 7-run batch, run 1 of vaporwave, cottagecore, grandmillennial
     and glassmorphism is the outlier (400, 439, 365, 468 ms) for this
     reason; bauhaus and swiss show none. The extra time sits between
     `ready` and the first visible frame, and the long animation frames
     there carry no script attribution, except vaporwave's, which also
     includes 75 ms of its Home script's first run.
   - A real Chrome profile keeps a shader cache on disk, so this should
     mostly hit a visitor's first-ever visit. That is not verified here.
   - School-side, because the cost follows the effect on the full-viewport
     snapshot: glass's `blur(22px)` and `scale`, vaporwave's `brightness`
     and `saturate`.

**Why the Tier 2 strips read higher (160 to 560 ms):**

- `motion.mjs` samples every 80 ms, so a change lands on the next tick.
- Each strip was the first arrival at that school in a fresh browser, so it
  included the first-use GPU cost.
- `motion.mjs`'s `context.route()` disables the HTTP cache. That is minor
  locally.
- If a strip was made without `BDL_GPU=1`, software raster adds much more.
  With SwiftShader, vaporwave arrives at 454 ms cold and 301 ms warm, with
  about 255 ms from `ready` to visible, against 66 ms on the GPU. Swiss goes
  to 215 ms.

The Tier 2 figures are consistent with these three effects, but the strips
do not record which renderer made them.

## Remedies, ranked by what they would do on the local build

Target from portal.md: the first visible change at or under 160 ms for every
school on the local build.

### 1. Render the destination once, off screen, before the click (portal-side). Moves the number most.

**Evidence** (first visible, desktop, local):

| school | cold | pf-render | pf-best |
|---|---|---|---|
| vaporwave | 248 | 84 | 82 |
| cottagecore | 259 | 96 | 89 |
| grandmillennial | 226 | 145 | not run |
| glassmorphism | 180 | 119 | not run |
| swiss | 137 | 95 | 107 |

Bauhaus should land near its warm figure, about 239.

Expected gain: 40 ms (swiss) to 165 ms (vaporwave, cottagecore). This alone
brings five schools under 160 locally. Bauhaus stays over.

What was measured:

- The destination page is fetched (for `pf-best`, kept in memory) and
  written into a hidden iframe:
  - `srcdoc` with a `<base href>` added;
  - `sandbox="allow-same-origin"`, so no scripts run;
  - full viewport size, opacity 0, behind the page.
- Then two frames pass and the iframe is removed. The warm-up survives the
  removal.

When to do it:

- **On switcher dialog open:** the current page in each other school. That
  is six renders, so do them one at a time in idle callbacks, starting with
  the next school in the S7 order or the visitor's likely pick. The dialog
  will hold placards (S6), which should give time.
- **On Shuffle:** the random pick must be made on pointerenter or focus,
  rendered then, and reused on click.

Costs and risks:

- 30 to 150 ms of main-thread work per school on this desktop, off the
  click path. It must not land while the dialog animates.
- Memory for each render.
- On a phone, several times the time.
- Scripts are off, so no WebGL is warmed.
- A hover that turns into a click in under about 200 ms gets a partial
  benefit.
- A lighter warm-up (only the stylesheet plus a text sample) was not tested.
  Font decoding alone (`pf-decode`) did nothing.

### 2. Serve the destination HTML from memory and preload its stylesheets (portal-side). Small locally, the biggest item on a real network.

**Evidence, locally:** swiss 134 to 128, vaporwave 246 to 235, cottagecore
232 to 218 (`pf-full` to `pf-memory`). About 5 to 15 ms, the fetch and
little else.

**Evidence, with network latency:**

| condition | swiss +40 | swiss +100 | vaporwave +40 | vaporwave +100 | cottagecore +40 | cottagecore +100 |
|---|---|---|---|---|---|---|
| cold | 232 | 353 | 330 | 453 | 343 | 483 |
| pf-brief | 224 | 347 | 324 | 444 | 319 | 482 |
| pf-full | 169 | 232 | 265 | 325 | 251 | 345 |
| pf-memory | 126 | 127 | 221 | 221 | 212 | 207 |
| pf-best | 90 | 92 | 75 | 79 | 91 | 87 |
| warm | 131 | 189 | 116 | 181 | 136 | 201 |

`pf-memory` and `pf-best` do not change with latency: every round trip is
done before the click.

The HTML-in-memory piece:

- It has to be the portal's own cache (a `fetch` of the same page, text
  kept), used by the runtime's `astro:before-preparation` handler.
- `<link rel=prefetch>` is not enough. The site's HTML revalidates on every
  use, so even a warm arrival waits one round trip.
- Replacing `e.loader` is Astro's extension point. A replacement has to do
  what `defaultLoader` does, which Astro does not export (`router.js:257`):
  - parse into `e.newDocument`;
  - drop `<noscript>`;
  - check the `astro-view-transitions-enabled` meta, else `preventDefault()`;
  - preload and await any new `link[rel=stylesheet]`;
  - fall back to the original loader on a miss.
- Tie the cache's life to the dialog, or cap its age, so a stale copy never
  outlives a deploy by much.
- An alternative outside the portal is to let `/t/` HTML be cached briefly
  (a short `max-age` or `stale-while-revalidate`), so a plain prefetch
  works. That is a site-headers change with deploy-freshness trade-offs, and
  a decision for the founder.

The stylesheet preload is the part portal.md's list leaves out:

- The HTML plus font preloads alone (`pf-brief`) saved 6 to 9 ms for swiss
  and vaporwave at +40 and +100 ms, and 1 to 24 ms for cottagecore, within
  its run-to-run spread. The HTML is revalidated anyway, and the fonts
  were never the wait.
- Adding the stylesheets (`pf-full`) saved one full round trip.
- The CSS URLs are hashed and are not in `PortalData`. The portal can read
  them from the prefetched HTML, or carry them in `PortalData` next to
  `preload`.

### 3. A busy state on the switcher control (portal-side). Does not move the number; covers the wait.

- It can only be painted between the click and `startViewTransition`. After
  that, rendering is paused until `ready`.
- Locally that window is 10 to 40 ms, so it would barely show. On a network
  it is 110 to 250 ms cold. With remedy 2 it is under 10 ms everywhere.
- It gives the visitor an answer within one frame of the click. It does not
  shorten the time to the first change of the page.
- With P1 the switcher is its own non-animated group, so the pressed state
  would hold through the transition. It needs clearing on
  `astro:page-load`.
- Worth doing as the acknowledgement. It is not a fix for P4.

### 4. Lower `FONT_WAIT_MS` (portal-side). Would not help.

- The measured font wait is 0 ms in every run, locally and at +40 and
  +100 ms per request.
- The runtime starts the destination's font preloads at
  `astro:before-preparation`, in parallel with the HTML. They finish before
  the HTML and the stylesheet round trips do.
- The cap could only bind on slow bandwidth, where a school's fonts take
  longer than two round trips. The largest is cottagecore's 121 KB Fraunces.
  Bandwidth throttling was not tested.
- Keep 600 ms as a safety cap. Lowering it buys nothing measurable.

### 5. School-side items for Stage 2 (not the portal's)

- **Bauhaus** (the only school that misses 160 ms even fully warm, at 239):
  - make the circle wipe visible sooner: a non-zero start radius, an ease
    without a flat start, or a start position over content that contrasts;
  - reconsider the wordmark group's 120 ms delay;
  - the target is ready-to-visible near the 45 ms floor plus 50 or so.
- **Grandmillennial** (137 warm): the drapes' `cubic-bezier(0.62, 0, 0.22, 1)`
  hides the first 50 to 60 ms beyond the floor.
- **Glassmorphism, swiss, cottagecore, vaporwave:** within 15 to 35 ms of
  the floor already. Swiss's `step-end` first step (40 ms) is a style choice
  worth a look.
- **Vaporwave and cottagecore:** the heaviest first renders (146 and 137 ms
  locally, about 114 on mobile emulation for vaporwave). Remedy 1 hides
  this, but lighter pages would help phones:
  - cottagecore's 337 KB HTML;
  - vaporwave's Exo 2 and VT323, which are missing from its preload list.
- **Glassmorphism and vaporwave:** the first-use GPU cost of their snapshot
  filters (+150 to 450 ms once). This is a founder-level trade-off against
  the look, noted here with evidence.

## What the local build hides

On the live site the fetch and the stylesheet are real round trips to
Cloudflare's edge. The emulation at +40 ms (a good fixed line) and +100 ms (a
typical phone connection) shows:

- **Cold arrivals grow by about two round trips.** At +100 ms per request:
  swiss 137 to 353, vaporwave 248 to 453, cottagecore 259 to 483.
- **A revisited school still pays one round trip for the HTML.** Warm swiss
  at +100 ms is 189, over the target, and the reason is the HTML alone.
- **The brief's prefetch saves next to nothing at any latency.** Adding the
  stylesheets saves one round trip. Holding the HTML in memory saves the
  other.
- **With both done ahead of the click, plus the off-screen render, the
  arrival does not depend on the network:** 75 to 92 ms at +40 and +100.
  This relies on the dialog staying open for the two or three round trips
  plus the render. That is about 300 to 500 ms at +100 ms per request,
  plausible when a visitor reads the placards, less so for a quick Shuffle.
- **Not tested:** emulation adds latency per request but not bandwidth
  limits, TLS setup or the edge's own time to first byte. A cold live visit
  can only be slower than these figures.

## Caveats

- **The machine:** one desktop, an RTX 3070 laptop GPU, and a fast CPU. The
  medians are stable (IQR within about 10 ms for most rows). Run 1 of a
  batch carries the first-use GPU cost, and other agents were working on the
  same machine during the runs. A no-screencast check (`desktop-nofilm`) ran
  slower and noisier, not faster, so the screencast does not inflate the
  phases, but that batch shows how much machine load can move a median.
- **What "first visible" measures:** the page changing. A pressed switcher
  button or a moving wordmark alone is below the 0.4% threshold on purpose.
  The first-any column catches those, and it equals first visible for every
  school except grandmillennial (about 20 ms earlier) and the quiet return
  (about 15 ms earlier).
- **The `ready` mark** is a promise callback. When the new page's scripts
  run in the same window (the quiet return), it can settle after the first
  frame is already on screen.
- **The prerender** was measured with a sandboxed srcdoc iframe added by
  the test harness, not with portal code. An implementation should be
  re-measured with this script:
  `--conditions cold,pf-full,pf-render,pf-best,warm`, then compare `cold`
  after the change against today's `pf-best`.

## Rerunning

```
BDL_GPU=1 node scripts/themes/trace-arrival.mjs --returns swiss,vaporwave --trace swiss,vaporwave --tag desktop
BDL_GPU=1 node scripts/themes/trace-arrival.mjs --viewport mobile --schools swiss,vaporwave --returns swiss,vaporwave --runs 5 --trace swiss,vaporwave --tag mobile
BDL_GPU=1 node scripts/themes/trace-arrival.mjs --schools swiss,vaporwave,cottagecore --runs 5 --latency 100 --conditions cold,pf-brief,pf-full,pf-memory,pf-best,warm --tag desktop-rtt100
```

Batches behind this report, all under `scripts/themes/.out/trace-stage1/`:

| tag | what it covers |
|---|---|
| `desktop` | all six schools and two returns, cold, pf-brief, pf-full and warm |
| `desktop-diag` | pf-decode and pf-render |
| `desktop-kana` | the CJK prewarm |
| `mobile` | swiss and vaporwave on mobile |
| `desktop-rtt40`, `desktop-rtt100` | latency |
| `desktop-memory-rtt0`, `desktop-memory-rtt40`, `desktop-memory-rtt100` | pf-memory and pf-best |
| `desktop-traces-rest` | Chrome traces of the other four schools |
| `desktop-nofilm` | the screencast check |
| `desktop-software` | SwiftShader |
| `first/` | fresh-browser traces |

## Remedy (09-23-26, P4 remedy agent)

Code: `src/themes/portal/runtime.ts` and `src/themes/portal/switcher.ts`.
Nothing was rebuilt or re-measured against the Worker. The numbers below
are expectations from the tables above, plus one logic harness.

### What shipped

1. **Warming, in place of a plain prefetch.** This is portal.md's
   "prefetch" remedy in the form the trace shows moves the number
   (`pf-memory`, not `pf-brief`).
   - **When:** opening the switcher dialog warms every other school's same
     page, starting with the next school along the S7 order and wrapping.
     Pointing at or focusing Shuffle picks its school then and warms that
     one page. The click uses the same pick (kept until the next
     `astro:page-load`), so the warm-up is never wasted. Shuffle still
     excludes the current school and replaces the history entry. When a
     Shuffle lands with the pointer or focus still on the button, the next
     pick is made and warmed at once, so repeated shuffling stays warm.
   - **What:** `warmPages()` in runtime.ts fetches the page's HTML and keeps
     the text in memory. It then fetches every stylesheet, font preload and
     module script the page names (and the current page lacks) into the
     HTTP cache. `/_astro/` files are `immutable`, so the router's own
     requests for them later never touch the network. One page at a time.
   - **Use:** `astro:before-preparation` replaces `e.loader` with
     `loadWarmed()` when the destination is warm, still awaiting the font
     wait alongside it. `loadWarmed()` reproduces Astro 7.3.4's unexported
     `defaultLoader` (router.js:257): parse, drop `<noscript>`, check the
     `astro-view-transitions-enabled` meta, then preload and await new
     stylesheets (the same persist/href check as `preloadStyleLinks`). A warm
     fetch still in flight is awaited rather than duplicated. Anything
     unexpected (a failed or redirected fetch, not HTML, no meta) falls back
     to Astro's own loader. Form posts and dev never use it.
   - **Limits:**
     - Warmed HTML is used for 2 minutes (`WARM_MAX_AGE_MS`), then fetched
       again. An old page stays whole across a deploy, because its own files
       were warmed with it.
     - Every navigation clears the queue and aborts unfinished warm-ups
       other than its destination.
     - Save-Data and 2G connections are never warmed (Astro's own rule).
     - The first dialog open downloads up to six pages plus their CSS, fonts
       and scripts: on the HEAD build the six home pages come to 0.48 MB of
       HTML and 0.80 MB of files, uncompressed (less over the wire for the
       HTML; woff2 does not compress further). Cottagecore's HTML alone is
       337 KB. Later opens reuse the cache.
2. **Busy state.**
   - The control that started a school change gets `aria-busy="true"` at the
     click, before `navigate()`. For a dialog pick that is the bar's school
     button, since the dialog closes; for a shuffle it is Shuffle.
   - It shows the hover background plus a 2 px moss line sweeping along the
     button's foot every 900 ms, with `cursor: progress`. The line is
     absolutely placed inside the button, so no box changes size (harness:
     bar and button boxes identical before the click and mid-load).
   - It clears on `astro:page-load`, on the navigation's abort signal
     (another navigation took over), and on a `pageshow` from the
     back/forward cache.
   - For `hold-still.mjs`: the line sits in the outer 2 CSS px of the
     button, which it masks, and the background shift (#1c1a17 to #272319)
     is under its 24-level pixel threshold.
3. **`FONT_WAIT_MS` unchanged at 600.** The wait never binds (0 ms in every
   run), so lowering it moves nothing.

### Astro's own prefetch: why not

- `astro:prefetch` cannot be imported. This config does not set `prefetch`,
  and Astro's plugin throws on the import unless it is set.
- The ClientRouter already runs `init({ prefetchAll: true })` (hover
  strategy) for light-DOM links. It cannot see links in the switcher's
  shadow root, and it never prefetches `navigate()` targets.
- Even called directly, Astro's `prefetch()` adds `<link rel=prefetch>`
  (client prerender is off). The router's `fetch()` then revalidates
  (`max-age=0, must-revalidate`), which is exactly `pf-brief`: 0 to 9 ms.
- `experimental.clientPrerender` (speculation rules) prerenders a full
  navigation, not a router swap, so the ClientRouter could not use it.

### Checked (logic harness, not timing)

A disposable harness bundled the real Astro 7.3.4 router with the working
tree's runtime.ts and switcher.ts. It served the HEAD `dist/` through
Playwright interception with 150 ms added to every HTML response. The data
is HEAD's, so the list still has the old order and no lesson. Playwright
disables the HTTP cache when it intercepts, so stylesheets were still
fetched at the click there; only the HTML path is proven.
- Dialog open warmed all six other `/about/` pages, in list order after
  quiet, plus 20 CSS, font and script files. The dialog pick then fetched no
  HTML: `startViewTransition` at +21 ms, against +178 ms with nothing warmed.
- Shuffle hover warmed one page. The click landed on it with no HTML fetch,
  and `history.length` did not change.
- Ten more shuffles with the pointer resting on the button: each
  destination was warm before its click, none was the page it left, and the
  history length stayed 2.
- A dialog pick during a slow Shuffle: the busy state moved from Shuffle to
  the school button at once, and cleared at the second page's load.
- No page errors or console warnings in any run.
- `npx tsc --noEmit -p .` is clean apart from the known registry.ts TS2307s.
  `npx vitest run`: 330 of 330.

### Expected numbers after the rebuild

The rebuilt site's cold arrival is unchanged when nothing warms it.
`trace-arrival.mjs` triggers through a hidden anchor, so none of its
existing conditions exercises the portal's warming. To measure it, add a
condition that opens the switcher dialog (or points at Shuffle), waits for
the warm-up (about 300 ms locally, a few round trips on a network), then
clicks the school's link in the dialog.

Expected first visible change, desktop dark:

| school | cold today | warmed by the portal (expected) | basis |
|---|---|---|---|
| swiss | 137 | about 128 | `pf-memory` |
| glassmorphism | 180 | about 160 to 165 | `pf-full` minus the fetch |
| grandmillennial | 226 | about 195 to 200 | `pf-full` minus the fetch |
| vaporwave | 248 | about 235 | `pf-memory` |
| cottagecore | 259 | about 215 | `pf-memory` |
| bauhaus | 304 | about 285 | `pf-full` minus the fetch |

- **Locally the gain is small, 10 to 45 ms,** because the load phase was only
  18 to 39 ms. Only swiss is under 160 locally, as before.
- **On a network it removes the whole load phase.** Warmed arrivals should
  be flat across latency:
  - swiss about 127 at +40 and +100 (today 232 and 353);
  - vaporwave about 221 (today 330 and 453);
  - cottagecore about 210 (today 343 and 483).
- That holds only when the warm-up finished before the click. A quick
  hover-then-click on Shuffle awaits the fetch in flight and saves only
  what had already arrived.
- The busy state moves no number. It answers the click within a frame: live
  for the load phase, then frozen in the old snapshot until `ready`.

### Not done: the off-screen render (a founder decision)

The one measured way to reach the 160 ms target locally is remedy 1 above:
render each warmed page once in a hidden, script-less `srcdoc` iframe. It is
not on portal.md's list, so it was left out of Stage 1.
- With the warming in place it would be a small addition, since the HTML is
  already in memory.
- Expected: vaporwave about 82, cottagecore about 89, swiss about 90 to 107,
  glassmorphism about 119, grandmillennial about 145, bauhaus about 239.
- Costs: 30 to 150 ms of main-thread work per school per warm-up on this
  desktop, several times that on a phone, plus the memory of the render.

### Stage 2 items, per school (evidence above, under "School-side")

- **bauhaus:** the circle wipe is invisible for about 170 ms beyond the
  frame-pipeline floor (`bh-wipe-circle` from `circle(0%)` under
  `cubic-bezier(0.7, 0, 0.2, 1)`, dark on dark, wordmark delayed 120 ms).
  It is the only school over 160 even fully warm (239). Give it a non-zero
  start radius, an ease without a flat start, or an origin over contrasting
  content.
- **grandmillennial:** the drapes' `cubic-bezier(0.62, 0, 0.22, 1)` hides 50
  to 60 ms beyond the floor. First render 91 ms (layout 46, shaping 32).
- **vaporwave:** the heaviest first render (146 ms: style 23, layout 70,
  shaping 50). Exo 2 Variable and VT323 are used but missing from its
  preload list, so they load after the swap. The CRT filters cost 150 to
  250 ms of first-use GPU compile in a fresh browser.
- **cottagecore:** first render 137 ms (layout 91). Its HTML is 337 KB, 5 to
  20 times the others, which also makes it the costliest page to warm. About
  190 ms of first-use GPU work for the page-turn.
- **glassmorphism:** about 370 ms of first-use GPU compile for the blurred,
  scaled snapshot (`blur(22px)`, `scale(1.035)`). `glass-leave` is ease-in,
  and the new page starts at opacity 0.
- **swiss:** already the fastest. The `step-end` wipe shows its first column
  only at 40 ms, a style choice worth a look.
