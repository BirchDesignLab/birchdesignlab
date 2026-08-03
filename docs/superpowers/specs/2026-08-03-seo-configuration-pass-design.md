# SEO and Configuration Pass · Design

*Spec agreed 2026-08-03. Parent documents: the website spec (§7 named the SEO
baseline), `docs/lab-backlog.md`, and `docs/handoff-2026-07-16.md` item 6, which
parked deploy hygiene "awaiting go". This is that go, widened.*

Business launch is 2026-09-01. The site is already deployed and crawlable, so
this pass runs during the runway rather than after it.

## 1. What this pass is for

Three goals, chosen by the founder:

1. **Hygiene and correctness.** Nothing misconfigured, nothing embarrassing.
2. **Survive the name search.** Someone hears "Birch Design Lab" from a
   referral, searches it, and lands on something that looks established.
3. **Look right when shared.** Already largely handled by the bark OG cards.

Explicitly **out of scope**, parked in the backlog: local search and a Google
Business Profile (deferred until after launch), and the contact form work that
waits on the Cloudflare paid plan.

### Constraint: the founder stays abstracted from the brand

The founder has ambiguous non-compete language at a day job and needs Birch
Design Lab kept at arm's length from his name. Nothing in this pass may publish
his identity.

Audited 2026-08-03 and already compliant: the About page is written in the third
person ("one man", "him", "the same pair of hands you shake"), no page names
him, and the repository is private so commit identity is not public. Two leaks
exist outside this pass and belong in the backlog: replies to `hello@` expose
the personal Gmail it forwards to, and domain WHOIS privacy is unverified.

## 2. Decisions taken

| Question | Decision |
|---|---|
| Index before launch? | Yes. Allow everything, hold nothing back. |
| Structured data scope | `Organization` only. No `founder`, no `Person`. |
| `sameAs` | Omitted while empty. Added when BDL brand accounts exist. |
| Security headers | All five. |
| CSP strategy | Astro's built in hash generation, not hand maintained hashes. |
| Analytics | Cloudflare Web Analytics. |
| Logo | Generated 512x512 PNG at build time. Placeholder. |
| Delivery | Two pull requests, split by risk. |

### Why index now rather than wait

Robots `Disallow` prevents crawling, not indexing. A disallowed URL can still
appear in results as a bare URL with no title, and blocking the crawl means
Google can never see a `noindex` tag, so pages become harder to remove later,
not easier. Anything genuinely unwanted uses `noindex` on a crawlable page.

The copy is first draft in several places and the founder judges the business
page copy weak, but suppressing pages would hide the Lab, which is the
strongest differentiator, while leaving the weaker pages visible. Indexing now
also means brand query authority exists on 2026-09-01 rather than starting then.
Cached snippets refresh on re crawl after the copy rewrite.

### Why `Organization` and nothing more

Per Google's documentation, this markup disambiguates an organization in search
results and feeds the knowledge panel logo. It is not a ranking factor and no
rich result is guaranteed. It has no required properties, so a small honest
block carries no penalty. It is a modest tool matched to goal 2, and is not
being sold here as anything more.

`sameAs`, the property that corroborates identity through independent profiles,
is empty because no BDL accounts exist yet. That is the largest weakness in the
identity signal and markup cannot fix it. Registering the accounts can.

## 3. PR 1: markup and content

No change to how the server responds. Safe to merge on inspection.

### 3.1 `public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://birchdesignlab.com/sitemap-index.xml
```

No `Disallow` lines, deliberately. `/styleguide` and `/lab/bdl-006` carry
`noindex` and must stay crawlable for that tag to be honoured.

### 3.2 Organization structured data

New `src/components/StructuredData.astro`, rendered on the home page only, since
that is the entity's canonical page. Emits JSON-LD:

- `name`: Birch Design Lab
- `url`: https://birchdesignlab.com
- `logo`: absolute URL to the generated PNG
- `description`: reuses the home page description

No `founder`, no `address`, no `telephone`. `sameAs` is omitted entirely while
empty rather than emitted as an empty array. Adding it later is one line.

### 3.3 Generated logo

Google's `logo` property does not accept SVG, and `public/favicon.svg` is the
only mark that exists. `scripts/og/` already renders PNGs at build time with
`@napi-rs/canvas`, so it gains a 512x512 logo render built from the same three
lenticel geometry as the favicon, keeping the two from drifting.

This is a **placeholder**. The founder has no real logo yet. When one exists it
replaces the generated file and the `logo` property needs no change.

### 3.4 Headings on experiment pages

`dist/lab/bdl-001/index.html` currently contains **zero heading elements** and
BDL-006 starts at `<h3>`. The cause is structural: `SpecimenPlate.astro` renders
the designation and title inside a `<summary>` as `<span>`s, so an experiment
page's only `<h1>` is whatever its experiment component happens to provide.
BDL-003 will inherit the same gap when it goes live.

Fix in one place: `ExperimentLayout` emits a visually hidden `<h1>` built from
the `designation` and `title` it already receives. The `.visually-hidden` helper
already exists in `base.css`. Hidden rather than visible because the experiment
stages are deliberately immersive and a visible heading would intrude on the
design.

BDL-002 already renders its own visible `<h1>`, which would then be a second
one, so it demotes to `<h2>`. Study pages already have a correct `<h1>` from
`[slug].astro` and are untouched.

### 3.5 `www` to apex redirect

`https://www.birchdesignlab.com/` serves the site directly with no redirect.
Both hosts return 200 on the current build. The canonical tags correctly point
at the apex, so Google will consolidate, but two hosts serving identical content
is a duplicate host condition worth removing.

Fix is a Cloudflare Redirect Rule, `www` to apex, 301, preserving path and
query. This is a founder dashboard step, not code, and it does change server
responses, so it sits outside PR 1's safe to merge guarantee and is tracked in
§6. The only change PR 1 carries for it is the note in `docs/deploy.md`.

### 3.6 Minor items

- `<link rel="sitemap">` added to `ExperimentLayout` and `StudyLayout`, which
  both omit what `BaseLayout` carries.
- The styleguide page renders two `<h1>` elements. Second demotes to `<h2>`.
- `apple-touch-icon.png` and `site.webmanifest` added. Only `favicon.svg` exists
  today.
- `docs/deploy.md` step 1 claims the local wrangler token points at the Cheer
  and Chatter account. Verified stale on 2026-08-03: it authenticates as
  `birchdesignlab@gmail.com` with a single account. Corrected.
- Project `CLAUDE.md` gains the pull request workflow, agreed 2026-08-03. The
  global `CLAUDE.md` says to avoid branch ceremony; this repo now overrides that.

## 4. PR 2: response headers

The only work here that can break the live site. Isolated so it reverts alone.

Baseline confirmed 2026-08-03: the site currently sends **no** security headers.

### 4.1 CSP through Astro, not by hand

The installed Astro is 5.18.2 and `csp` is present in its configuration schema,
so `experimental: { csp: true }` computes hashes for every inline script and
style at build time and emits a per page meta CSP.

Hand maintained hashes were considered and rejected. The built home page carries
three inline scripts, not one: the `is:inline` theme bootstrap emitted verbatim,
plus the theme toggle and the reveal script, which Astro inlines as minified
modules. The set differs per page, and any Astro or Vite upgrade reshuffles
minified output. A pinned hash would break theming silently.

**Known limitation:** a meta CSP ignores `frame-ancestors`, so framing
protection ships as an `X-Frame-Options` header instead.

### 4.2 `public/_headers`

`_headers` is supported by Workers Static Assets and must live in the static
asset directory.

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
```

### 4.3 HSTS

Verified **not set** on 2026-08-03. What is already enabled is Cloudflare's
**Always Use HTTPS**, confirmed working: `http://` returns 301 to `https://` on
both the apex and `www`.

These are complementary, not alternatives. Always Use HTTPS corrects the request
after the browser has already sent it in the clear, which leaves the first hit
interceptable. HSTS instructs the browser never to attempt `http://` for the
domain again, and is a prerequisite for preload enrollment.

Set at the zone level, SSL/TLS then Edge Certificates, rather than in `_headers`,
because Cloudflare manages preload there and zone level applies to every
response including redirects. Founder dashboard step.

Note that `http://www` currently redirects to `https://www`, staying on the
`www` host, so the duplicate host in §3.5 survives the HTTPS upgrade and needs
its own redirect rule.

### 4.4 Analytics and its CSP interaction

Cloudflare Web Analytics: free, cookieless, and needs no consent banner.

It matters to this PR because Cloudflare injects the beacon at the edge, after
Astro has generated the HTML and its CSP meta tag. The hash for that script will
therefore not be in the policy, and the site's own CSP would block its own
analytics. The policy must allow the beacon host explicitly through Astro's CSP
configuration:

- `script-src`: `https://static.cloudflareinsights.com`
- `connect-src`: `https://cloudflareinsights.com`

Decided now precisely so this does not surface as a mystery later.

### 4.5 Headers the Worker must set when the contact form ships

**Recorded here because it is easy to miss.** `_headers` does not apply to
responses generated by Worker code. Static assets are served by the assets layer
before the Worker runs, so today every response is covered, but `/api/contact`
responses come from `worker/index.ts` and would carry no security headers at all.

When the form ships, after Email Sending onboarding on the paid plan, the
Worker's own responses need the same four headers applied to every path it
answers: the 303 redirect to `/contact/sent/`, the 400 malformed submission
page, the 429 rate limit page, the 405 method not allowed response, and the 502
degraded email path.

Cleanest implementation is a single helper in `worker/index.ts` that every
response passes through, rather than four literals repeated at five call sites.
The contact form markup is currently parked in a named git stash, so this must
be picked up at the same time as `git stash pop`.

## 5. Verification

**PR 1** is verified by build output: `robots.txt` served, JSON-LD present on
the home page and parsing in Google's Rich Results Test, the logo PNG generated
and reachable at an absolute URL, exactly one `<h1>` on every built page
including `bdl-001` and `bdl-006`, and the full test suite plus `astro check`
clean.

**PR 2** carries a verification gate as its first implementation step, before
any of it merges: enable `experimental.csp`, build, preview, and click through
BDL-001, BDL-003, and BDL-006 with the console open, confirming the theme
bootstrap, the theme toggle, the reveal script, and every Svelte island still
work. The islands are the risk, since CSP applies to them too.

If `experimental.csp` misbehaves, the fallback is a CSP in `_headers` with a
hash list generated at build from `dist`, never hand written.

Headers are then confirmed live with `curl -sI` against the apex after deploy,
and the `www` redirect confirmed as a 301 to the apex.

## 6. Sequencing

PR 1 merges first and independently. It is safe, and merging it early starts the
crawl runway to 2026-09-01.

PR 2 follows once its verification gate passes.

Founder dashboard steps, tracked separately from the code: HSTS at the zone,
the `www` redirect rule, enabling Cloudflare Web Analytics, and verifying Google
Search Console before launch.
