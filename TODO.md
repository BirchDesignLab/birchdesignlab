# TODO

The project's working queue is **[docs/lab-backlog.md](https://github.com/BirchDesignLab/birchdesignlab/blob/main/docs/lab-backlog.md)**, and it is the only backlog by design: open gates, founder calls, parked items, future specimens and the dependency queue all live there. Portal stage status lives in the latest stage report and handoff under [docs/superpowers/specs/theme-schools-research/](https://github.com/BirchDesignLab/birchdesignlab/tree/main/docs/superpowers/specs/theme-schools-research). This file does not copy either, so it cannot drift from them.

The owner sets priority.

## Candidate contributions from a fork

Work a second person could pick up without the owner's accounts or devices. Open each as a PR against `main` after `npm run verify`. Sensitive code (Worker, contact route, `_headers`, analytics consent, the verify gate) stays out of a first PR unless invited.

- [x] README with architecture and workflow charts, and SPEC.md (PR #96).
- [ ] Safari and iOS testing on a real device, reported as film-style notes per school and page.
- [ ] Accessibility audit across the seven schools with a screen reader: parity and `aria-hidden` rules are enforced by guards, but no human pass is recorded.
- [ ] A WebKit capture lane in `scripts/themes/` (Playwright WebKit), knowing it is not iOS Safari.
- [ ] Second controller for Stage 5 or the transitions phase, under the existing `bdl-task` and `bdl-wave` procedure.
- [ ] A Mermaid check in the verify gate (there is no separate CI), so the README charts stay valid as they change.
