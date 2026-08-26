# AR Card · BACKLOG

Work items for the WebAR business card system. Read with `HANDOFF.md`; update
both at the end of every session. History stays inline (strikethrough + DONE
markers), never deleted.

## Decision gates

- [ ] **Choose + wire the tier 1 channel path.** Decision gate: **before any
  wood card is etched.** The QR is permanently laser-etched into ~$10/ea wood
  cards; the path chosen at tier 1 production time is forever. Wiring is one
  line in `public/_redirects` (plus its trailing-slash twin), zero code
  changes. Acceptance: path resolves to the landing, channel shows up in
  `ar_card_scans` under its own label.
- [ ] **Durable beacon storage.** Analytics Engine retention is ~3 months;
  decide (during the analytics task below) whether per-tier totals need to
  outlive that — aggregate on a schedule, or move to D1/KV. Until then, run
  totals via the AE SQL API before data ages out.

## Tasks

- [x] **Landing page — DONE-WITH-CAVEAT 08-25-26.** Shipped at
  `src/pages/ar-card.astro` behind `/hello`. Caveats: AR stubbed
  (`AR_ENABLED: false`, no AR UI at all), vCard contact fields are
  placeholder-marked and need real founder details before any card is
  printed. Acceptance met: vCard downloads client-side, beacon fires and
  fails silent, critical path ~14KB, interactive < 2s on 4G.
- [ ] **AR scene (multi-target).** Any known card design locks and triggers
  the same logo experience; rise animation + interactions; clean teardown;
  lazy-loaded only behind a user tap from the landing's `#ar-root` mount.
- [ ] **Asset pipeline + tracking harness.** GLB crunched under the 1.5MB
  budget; multiple source images compile into one `.mind`; a dev harness
  reports fps and time-to-first-lock per target.
- [ ] **NFC batch writer — CONDITIONAL.** Only if wooden NFC cards actually
  get sourced; verified byte-for-byte writes, permanent lock gated behind
  explicit confirmation. Close without ceremony if NFC cards never happen.
- [ ] **Analytics endpoint + stats view.** The interim AE beacon shipped
  08-25-26 (`POST /api/beacon`, no PII, fail-silent). Open: stats view
  (totals by tier, counts by day), rate limiting without storing raw IPs,
  and the durable-storage decision above.
- [ ] **QA + hardening pass.** Device matrix (iOS Safari, mid-tier Android
  Chrome), vCard import verified on both platforms, reduced-motion honored
  end-to-end, camera permission deny/re-grant flows once AR exists.

## Nice-to-have

- [ ] Dedicated OG card for the landing (`scripts/og/` manifest entry);
  currently reuses `/og/home.png`, which unfurls fine.
