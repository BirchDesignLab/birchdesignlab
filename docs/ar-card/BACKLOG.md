# AR Card · BACKLOG

Work items for the WebAR business card system. Read with `HANDOFF.md`; update
both at the end of every session. History stays inline (strikethrough + DONE
markers), never deleted.

## Decision gates

- [ ] **Choose + wire the tier 1 channel path.** Decision gate: **before any
  wood card is etched.** The QR is permanently laser-etched into ~$10/ea wood
  cards; the path chosen at tier 1 production time is forever. Wiring is one
  page file (three lines, passing a new channel label to `CardLanding`) plus a
  line in the sitemap filter in `astro.config.mjs`. Acceptance: path resolves
  to the landing, channel shows up in `ar_card_scans` under its own label.
- [ ] **Durable beacon storage.** Analytics Engine retention is ~3 months;
  decide (during the analytics task below) whether per-tier totals need to
  outlive that — aggregate on a schedule, or move to D1/KV. Until then, run
  totals via the AE SQL API before data ages out.

## Tasks

- [x] **Landing page — DONE-WITH-CAVEAT 08-25-26, simplified 08-26-26.** The
  landing is `src/components/CardLanding.astro`, rendered by one page per
  channel: `/hello` (kraft) and `/showcase` (the Cheer and Chatter break-screen
  QR). Caveats: AR stubbed (`AR_ENABLED: false`, no AR UI at all), vCard
  contact fields are placeholder-marked and need real founder details before
  any card is printed. Acceptance met: vCard downloads client-side, beacon
  fires and fails silent, critical path ~14KB (built page is 6.5KB),
  interactive < 2s on 4G.
- [ ] **AR scene (multi-target).** Any known card design locks and triggers
  the same logo experience; rise animation + interactions; clean teardown;
  lazy-loaded only behind a user tap from the landing's `#ar-root` mount.
- [ ] **Asset pipeline + tracking harness.** GLB crunched under the 1.5MB
  budget; multiple source images compile into one `.mind`; a dev harness
  reports fps and time-to-first-lock per target.
- [x] ~~**NFC batch writer — CONDITIONAL.**~~ **DROPPED 08-26-26.** The wood
  cards cannot be sourced with chips in them, so there is nothing to write.
  Dropped rather than deferred: nothing else in the project depended on it, and
  the `?s=` medium parameter that existed to tell NFC scans from QR scans went
  with it. Every card is QR.
- [ ] **Analytics endpoint + stats view.** The interim AE beacon shipped
  08-25-26 (`POST /api/beacon`, no PII, fail-silent) and was cut back
  08-26-26 to `{ts, channel}`. Open: stats view (totals by channel, counts by
  day), rate limiting without storing raw IPs, and the durable-storage
  decision above.
- [ ] **QA + hardening pass.** Device matrix (iOS Safari, mid-tier Android
  Chrome), vCard import verified on both platforms, reduced-motion honored
  end-to-end, camera permission deny/re-grant flows once AR exists.

- [ ] **Point the Cheer and Chatter showcase QR at `/showcase`.** The page is
  live and its channel is wired, but nothing links to it yet: the QR on the
  BDL card in C&C's break screen still points wherever it pointed before. The
  change is in the C&C repo (`assets/brand/sponsor-card/qr-birchdesignlab.svg`
  here is the BDL-side artwork; C&C bakes its own). Until it is repointed,
  `showcase` will read zero scans, which is correct rather than broken.

## Nice-to-have

- [ ] Dedicated OG card for the landing (`scripts/og/` manifest entry);
  currently reuses `/og/home.png`, which unfurls fine.
