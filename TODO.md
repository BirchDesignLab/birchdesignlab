# TODO

Open threads as the repository records them at the head of main (Stage 4 merge, PR #95, 2026-10-03), plus candidate contributions from the fork. Upstream carries no open issues or pull requests, so this file is the working queue until the owner says otherwise. Sources: [docs/lab-backlog.md](https://github.com/BirchDesignLab/birchdesignlab/blob/main/docs/lab-backlog.md), [stage4-report.md](https://github.com/BirchDesignLab/birchdesignlab/blob/main/docs/superpowers/specs/theme-schools-research/tier3-stage4/stage4-report.md), [SPEC.md](https://github.com/BirchDesignLab/birchdesignlab/blob/main/SPEC.md).

Owner decides priority. Items marked **founder** need Tyler's call or device and cannot be done from the fork.

## Owed by the founder (small, specific)

- [ ] **founder** Bauhaus assembly pick. Compare `?bh-assembly=a`, `?bh-assembly=b`, `?bh-assembly=c` on any bauhaus page on a phone, then remove the switch in a small follow-up.
- [ ] **founder** Stage 4 taste calls: typophoto in the bauhaus lab band (recommendation: drop until a real photograph exists), the Services diagonal (keep, nitpick list), Sent's paper dot (keep?), two red bands on dark swiss Home (accept or nitpick list).
- [ ] **founder** iPhone pass after the Stage 4 deploy: drag bauhaus shapes by touch, bauhaus press states on iOS Safari, the swiss grid key held by touch, plus the Stage 3 owed checks (glass lens, Control Centre, vaporwave interactables).
- [ ] **founder** Etch the tier 1 wood AR card (the only open one-way door in the backlog).

## Next planned work (Portal, BDL-010)

- [ ] Stage 5: pair C, grandmillennial and cottagecore. Proofs, then one wave of about four tasks per school through `bdl-wave`, dossier-driven, with an Opus critic on every task.
- [ ] Transitions phase, after Stage 5:
  - [ ] Every school gets its own arrival gesture (four schools converged on one safe fade).
  - [ ] Draw ahead on a school's own links and on phones (a tap still gets the full first-draw freeze).
  - [ ] Back to a scrolled page: the wordmark morphs toward an off-screen box (`scripts/themes/harness/wm-close-back.mjs`).
  - [ ] Glass arrival polish: the CSS poster cannot refract, so the orb edge bends about 850 ms after the click when the live lens takes over.
  - [ ] Film in WebKit as well as Chromium; a real iOS device stays the final word.
  - [ ] Vaporwave pressed task button switches instantly on an in-school swap (founder: address later).
  - [ ] Root pages inline about 1 to 2 KB of unused Astro view-transition keyframes. Fix is a bundling change; needs a before and after pixel diff of the root pages.
- [ ] Stretch items parked from Stage 4: the swiss width dial, the bauhaus questionnaire card.
- [ ] BDL-011 Field Guide to the Schools: `forthcoming`, hero exists, copy not written.

## Specimens

- [ ] BDL-003 Novgorod Letters: specced 2026-07-16, status `forthcoming`, component exists under `src/experiments/bdl-003/`. Finish or decide to shelve.
- [ ] BDL-004 The Loom: built and tested, parked in `attic/bdl-004/`. Revive as a specimen or leave.
- [ ] The Painting (view-source CSS piece): unnumbered, in the backlog, the most expensive item on the page.
- [ ] A real client study. Every study so far is a fictional genre study; the Lab is built to hold a real one. Capture the before state at intake, it disappears.
- [ ] `/lab/studies` landing scales fine to about 30 to 50 entries; revisit pagination past that.

## Platform and hygiene

- [ ] Dependency queue per the policy in CLAUDE.md (newest stable, majors in their own PR with a browser pass). The queue is in the backlog.
- [ ] Remove the `restoreReferencedCss` patch in `astro.config.mjs` once Astro restores CSS via `emitFile` on Rolldown. The build log says when the patch is doing work.
- [ ] Remove the `dropUnusedDracoDecoder` patch if a three.js upgrade stops emitting decoder defaults (the plugin warns when it matches nothing in both builds).
- [ ] Analytics Engine retention is about three months; the durable-storage decision for AR card scans is open under "AR card" in the backlog.
- [ ] The `www` to apex redirect is a dashboard rule, done 2026-08-04; re-verify after any Cloudflare change.

## Candidate contributions from the fork

Framed as PRs against upstream `main` after `npm run verify`. Sensitive code (Worker, contact route, `_headers`, analytics consent, the verify gate) stays out of a first PR unless invited.

- [x] README with architecture and workflow charts (this PR).
- [x] TODO.md and SPEC.md (this PR).
- [ ] Safari and iOS testing on a real device, reported as film-style notes per school and page.
- [ ] Accessibility audit across the seven schools with a screen reader: parity and `aria-hidden` rules are enforced by guards, but no human pass is recorded.
- [ ] A WebKit capture lane in `scripts/themes/` (Playwright WebKit), knowing it is not iOS Safari.
- [ ] Second controller for Stage 5 or the transitions phase, under the existing `bdl-task` and `bdl-wave` procedure.
- [ ] Mermaid chart extraction check in CI, so the README charts stay valid as they change.
