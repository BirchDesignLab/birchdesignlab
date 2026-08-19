# Handoff · 08-19-26

Long session, 2026-08-18 into 08-19: a pre-launch SEO + site-quality audit,
then a full round of founder-driven business-page polish, and the **contact
form shipped and went live**. `main` is clean. The only PR still to merge is
**#46** (sent-page bark hero); merge it and the session's work is fully landed.

## What shipped (PRs merged this session)

- **#34 — SEO safe-batch.** BreadcrumbList JSON-LD on `/lab/<slug>`, Service
  JSON-LD on `/services`, `main` focusable + skip links on the Lab layouts,
  theme-toggle `aria-pressed`/dynamic label, `og:image:alt` + `twitter:image:alt`,
  `Cache-Control: immutable` on `/_astro/*`, 404 `noindex`, description de-dup via
  new `src/lib/seo/site.ts`, latin-only fonts on the business pages, and
  `serializeJsonLd` (escapes `<`). The full 6-dimension audit was written into
  `docs/lab-backlog.md`.
- **#37 — studio "we" voice** across the business + Lab-catalog pages. (Replaces
  the CLOSED #35, which went first-person "I"; the founder reversed — see Copy
  decisions.)
- **#38 — Lab filter links.** The `/lab` catalog filter chips are now real
  `<a href>` links (progressive enhancement: JS upgrades them into the in-place
  filter), fixing the orphaned `/lab/experiments` and `/lab/studies`.
- **#39 — services Build/Launch copy** tweaks.
- **#40 — home closing CTA.** A quiet closer band ("Let's start your project" ->
  /contact), so home ends on the ask like about/services.
- **#41 — positioning copy.** "from New Orleans to Mobile" on the home subline;
  an enterprise-credibility line on Services.
- **#42 — home services link.** A single "How we build ->" link under the two
  doors (recovered from `af5d7af`, made one left-aligned link, not two).
- **#36 — contact form shipped.** Unstashed the markup, grafted onto the current
  copy, wired to the Worker that was already in prod.
- **#43 — the 405 fix (important, see Contact form below).**
- **#44 — contact closer copy** "the work" -> "the tools".
- **#45 — contact notify email** -> `birchdesignlab@gmail.com`.
- **#46 (STILL OPEN — merge this)** — `/contact/sent` gets the About
  shining-tree bark hero.

(#33, BDL-007 docs, merged at the very start of the session.)

## Contact form — now LIVE and working

The whole path works in production: form -> `POST /api/contact` -> Worker
(honeypot -> rate-limit -> validate -> email -> 303 -> `/contact/sent`).

- **Notify inbox: `birchdesignlab@gmail.com`** (the business Google account, a
  **verified Email Routing destination**). Sending to a verified destination is
  **free on all plans** (Cloudflare Email Service). `hello@` is a routing
  *address*, not a destination — sending there is **rejected** (502, and a
  rejection is **not billed**), which is why real submits 502'd until #45.
- **The 405 root cause, documented so it never bites again:** Cloudflare Static
  Assets intercepts **navigation** requests (`Sec-Fetch-Mode: navigate`, which
  every form submit sends) **before the Worker runs**. The assets layer only
  serves GET/HEAD, so it 405s the POST at the edge (empty body, no `cfWorker`
  timing, no `Allow` header). A `curl` POST worked (303) only because it didn't
  send `Sec-Fetch-Mode: navigate`, which masked it for a while. **Fix:**
  `assets.run_worker_first: ["/api/*"]` in `wrangler.jsonc` (#43). A
  belt-and-suspenders trailing-slash match (`/api/contact` and `/api/contact/`)
  is also in `worker/index.ts`.
- **The public 502 fallback still shows `hello@`** (`CONTACT_PUBLIC` in
  `worker/index.ts`); the private inbox never appears on a visitor-facing page.
- **The old contact-form git stash (`stash@{0}`) is now OBSOLETE** — the shipped
  form superseded it. Safe to `git stash drop`. Left in place so nobody is
  surprised; drop it when convenient. (This retires the "form held in a stash /
  mailto-only" state from prior handoffs and memory.)

## Copy decisions this session (founder-driven)

- **Voice: studio "we" everywhere, NOT first-person "I".** The founder first
  said "I", saw it, and reversed ("we definitely sounds better, basically
  anything but first person"). Kept "We meet, you talk, we take notes"-style
  inclusive "we". This also suits the identity-obfuscation goal.
- **Identity obfuscation still stands.** No personal name on the public site; the
  enterprise-credibility line is deliberately generic (no employer/client names)
  because of an unresolved day-job noncompete.
- **Geography / positioning.** "New Orleans to Mobile" on home; Gulf Coast + the
  decade already on About; the enterprise-credibility line on Services ("A decade
  of skills honed at the enterprise level, now served to the businesses that keep
  the Gulf Coast running.").
- Founder tweaked the process copy (Discovery / Build / Launch) and the contact
  closer this session. A few `<!-- first-draft copy -->` markers remain on
  Lab/system pages on purpose (that copy is still pending).

## SEO audit — where it stands

Full verified 6-dimension audit is in `docs/lab-backlog.md`
("SEO + site-quality pass — 08-18-26"). Verdict was: the SEO **foundation was
already strong**; the gaps were conversion, proof, and voice. This session
shipped the safe technical batch (#34) plus the founder-territory copy/positioning
and the conversion pieces (home CTA #40, services link #42, contact form #36/#43/#45).

Still open (in the backlog): **client testimonial** (needs Cheer & Chatter fully
wrapped + permission — goes in the BDL-005 specimen), **per-experiment OG art**,
**`sameAs`** (needs the social accounts to exist), font **preload + metric
fallback** (FOUT/CLS), **bdl-007 keyboard** control, optional **WebSite schema**,
`og:locale`, `llms.txt`, `CreativeWork` on the study.

## Open threads for the next session

1. **Merge #46** (sent-page bark hero).
2. **Contact page right-hand space** (design note): still open. Options were
   **A** two-column (form + email aside), **B** bark panel on the right, **C**
   center the column. The *sent* page got the bark hero (an A/B-analog); the
   *contact* page itself still has the empty right.
3. **Rebuild graphify** — the graph is STALE after this session's many merges.
   `graphify update C:\git\birchdesignlab`, then copy the outputs into the vault
   (see `CLAUDE.md`).
4. **Drop the obsolete contact stash** (`git stash drop`) once you're sure.
5. Remaining audit items above (testimonial, per-experiment OG, `sameAs`, etc.).

## Housekeeping / do-not-repeat

- **Do NOT touch the founder's git identity or config.** Their setup is
  intentional and predates Claude Code: personal account (**THobbs23 /
  theskyguy23@gmail.com**) authors commits, the **BirchDesignLab** business
  account approves the merges. One #45 commit was mis-authored as the business
  before this was clarified; it is left as-is (rewriting `main` history to fix one
  author is not worth it and is itself more identity-meddling).
- Workflow unchanged: branch + PR for everything, never straight to `main`
  (merge = prod deploy via Workers Builds).
