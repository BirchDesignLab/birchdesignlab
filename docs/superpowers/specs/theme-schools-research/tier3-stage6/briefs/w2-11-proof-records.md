# W2 task 11: the two proofs, records put right

Shared rules: `w2-common.md`. Founder answers at stop 2: **R2 becomes its
own stage after Stage 6** (arrival rest off the text); **P3 is parked with
its proof kept**. Both proof docs must therefore be accurate records: R2's
is the starting brief of a future stage, P3's is what a later look reads.
No site code changes in this task.

**R2 (`proofs/glass-r2.md`, `scripts/themes/proofs/stage6-glass-r2/`),
wave 1 task 7 deferred minors:**

- C3: the "p95 of 33 ms is headless wheel delivery, not the page" claim has
  no support (rAF intervals over 20 ms were 68 and 93 of about 235; the trace
  shows 49 and 57 dropped frames in the R2 and as-built scroll runs at
  1440). State it as real frame loss in both, or re-measure on GPU and
  report what you find.
- C4: the build plan (`glass-r2.md` around 179-180) carries session hold,
  idle-after-arrival and one lens per visit, but not the E10 off state
  (`prefers-contrast: more`) for the lens or the clear bar. Add it to the
  plan; make `proof.js` `mount()` honour it and drop `proof.css:92`'s bar
  fill override under E10.
- C5: "above any dialog" is wrong (later top-layer content sits above the
  lens, a modal makes it inert, pressing the rim re-raises it, `proof.js:215`);
  the 16px ring is 18px on phones (`proof.js:307`), under the 24px target
  minimum; touch grab and Android touch adjustment over links are not
  mentioned. Correct the doc and list the 24px ring as a build requirement.
- C6: `serve.mjs:37` compares a normalized path with a raw `dist`, so a
  forward-slash Windows path through the module API 403s every request.
  Normalize both.
- rc1-N1: the doc cites a `busyMsPerSec` field results.json does not have.
  Re-run the trace so it exists, or drop the citation.
- rc1-N2: the task 7 report summary contradicts the fixed doc. The report
  lives in gitignored `.out/`; instead add a dated "Corrections" note at the
  end of `glass-r2.md` listing what changed after the proof's review.
- Add the stop 2 answer to the doc's head: own stage after Stage 6, the lens
  rests off the text on arrival.

**P3 (`proofs/swiss-p3.md`, `scripts/themes/proofs/stage6-swiss-p3/`),
wave 1 task 8 deferred minors:**

- C2: from 1024 to 1279 the division key crowds the "Services" link (face
  8px from the text at 1024, pad overlapping the link box; at rest it reads
  as a checkbox). Record it as a known issue for any future build; fix in
  the proof only if under about 20 lines.
- C3: at 390 the strip between the two keys hits the wordmark link; the doc
  says it lands on the header bar. Correct the doc (true only at 1440).
- C4: the rapid-press evidence is stale (films end on 3, the fixed handler
  ends on 4). Re-run the rapid films on GPU Chromium with a free port, and
  make `scripts/themes/stage6/w1-t8-rapid.mjs` take the port as an argument
  and launch with the GPU flags.
- C5: strip timestamps include Playwright's click latency. Note it in the
  doc and quote the rAF timing (sheet bare 300 to 333 ms, swap at 317 ms) as
  the real clock.
- C7: the doc says the grid key's `collect()` and `span()` follow the
  division with no change; they do not for the footer. Correct it.
- Add the stop 2 answer to the doc's head: parked, proof kept; the reasons
  (first screen identical across programmes, the two-column stall).

**Owns:** `docs/superpowers/specs/theme-schools-research/tier3-stage6/proofs/**`,
`scripts/themes/proofs/stage6-glass-r2/**`,
`scripts/themes/proofs/stage6-swiss-p3/**`,
`scripts/themes/stage6/w1-t7-*.mjs`, `scripts/themes/stage6/w1-t8-*.mjs`,
`scripts/themes/stage6/w2-t11-*.mjs`.

**Films:** the P3 rapid-press re-run at 1440 and 390 (light), on GPU; the
R2 proof under `prefers-contrast: more` at 1440 (no lens, no clear-bar
fill). No site pages change: the verifier confirms `dist/` is identical to
the base build apart from asset hashes.
