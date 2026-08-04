# Deploying birchdesignlab.com

Host: Cloudflare **Workers** (Workers Builds + Static Assets). Migrated from
Cloudflare Pages 2026-07-29; the contact form was the trigger, as predicted in
`docs/lab-backlog.md`.
Repo: `BirchDesignLab/birchdesignlab`.

## How it works

- `astro build` emits the static site into `dist/` (unchanged; Astro stays
  `output: 'static'`, no adapter).
- `wrangler.jsonc` serves `dist/` as Workers Static Assets and runs
  `worker/index.ts` only for requests that match no file. In practice that is
  `POST /api/contact`: honeypot, then per-IP rate limit (5/min), then
  validation (`src/lib/contact/validate.ts`), then an email to
  `hello@birchdesignlab.com` via the Email Sending binding (from
  `forms@birchdesignlab.com`), then a 303 to `/contact/sent/`.
- 404s serve Astro's `dist/404.html` via `not_found_handling`.

## One-time setup (founder, in dashboard / CLI)

**Completed 2026-07-29** except steps 2 and 6. Email Sending onboarding is deferred
until the founder opts into the paid plan. Until then the contact form markup
stays out of prod (held locally) and /contact remains mailto-only; the
Worker's email path degrades to a 502 page pointing at hello@.
The Pages project is deleted; Workers Builds is the only deploy pipeline.
Step 6, the `www` redirect, is still outstanding as of 2026-08-03.

1. **Log wrangler into the account that owns `birchdesignlab.com`**
   (`npx wrangler login`). Verified 2026-08-03: the local token authenticates as
   `birchdesignlab@gmail.com` and exposes exactly one account, so there is no
   wrong-account risk when deploying locally. The 2026-07-29 note about the
   Cheer and Chatter account is stale.
2. **Enable Email Sending for the domain** (adds SPF/DKIM DNS records):
   `npx wrangler email sending enable birchdesignlab.com`
   (or dashboard: Compute & AI → Email Service → Email Sending → Onboard
   Domain). Email Routing on `hello@` is already active and untouched;
   sending is a separate onboarding.
3. **Create the Worker from git**: dashboard → Workers & Pages → Create →
   Workers → Import a repository → select the repo.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   (`wrangler.jsonc` supplies everything else.)
4. **Move the custom domain**: remove `birchdesignlab.com` (and `www`) from
   the old Pages project, add them to the Worker (Settings → Domains & Routes).
5. **Delete the Pages project** once the Worker serves the domain.
6. **Redirect `www` to the apex.** Verified 2026-08-03: `www.birchdesignlab.com`
   serves the site directly with no redirect, and `http://www` upgrades to
   `https://www` rather than to the apex, so the duplicate host survives the
   HTTPS upgrade. Canonical tags already point at the apex, so Google will
   consolidate, but the clean fix is a Redirect Rule: `www` to apex, 301,
   preserving path and query. Dashboard step, not code.

## Security headers and analytics

Shipped 2026-08-03: `public/_headers` sets `X-Content-Type-Options`,
`Referrer-Policy`, and `X-Frame-Options` on every static asset.

**No `Permissions-Policy`, deliberately.** It was written and then removed the
same day. Founder direction 2026-08-03: the Lab is going to use location,
camera, microphone, accelerometer, and whatever else an experiment needs, plus
GSAP. "The lab is the lab and the lab is free."

The conflict was direct, not hypothetical: `geolocation=()`, `camera=()`, and
`microphone=()` block **first-party** use, not just embedded third parties. That
kills Tonight's Sky and anything else the Lab now intends. Note that the header
only ever constrains the features it names, so unnamed ones keep their default
`self` allowlist; the problem was the three it named, not some future `midi`.

It was dropped rather than relaxed to `(self)` because `(self)` protects nothing
this site is exposed to: no third-party scripts, no third-party iframes, and
`X-Frame-Options: DENY` already refuses embedding outright.

### CSP: tested and rejected

**Decision 2026-08-03: not shipping a Content-Security-Policy.** Not deferred,
not a TODO. It was enabled, measured in a real browser, and turned down on
merit. Re-open it only if one of the triggers at the end of this section fires.

**Why it does not pay for itself here.** CSP stops injected script from
executing, which needs an injection path to exist. This site has none: static
pages, no user-submitted content rendered anywhere, no third-party scripts, no
CDN, no embeds, private repo. The contact form does not change that either;
submissions are emailed, never rendered back onto a page.

The one genuine threat it touches is a compromised npm dependency shipping
malicious code in the bundle. `'self'` would not stop that, because the code is
same-origin. It would only limit where stolen data could be sent, via
`connect-src`. Partial mitigation of an unlikely event, bought at the cost of
breaking working pages.

**And it does break working pages.** Astro's `experimental.csp` works everywhere
except `/styleguide` and `/lab/bdl-002`, which
both create a `<style>` element at runtime and rewrite its `textContent` to swap
palettes and typefaces. Under hash-based `style-src` the element keeps its text
but `.sheet` is null, so nothing applies, and **no console error is raised**.
The controls look fine and silently do nothing.

Hashes cannot fix it: the injected CSS changes on every click. `'unsafe-inline'`
cannot either: per the CSP spec, once a hash is present in a directive,
`unsafe-inline` is ignored.

The fix is to stop injecting stylesheets and set the tokens directly via
`document.documentElement.style.setProperty()`, which CSP does not govern. That
is a refactor of a shipped Lab experiment, so it was not done during a security
pass.

**What actually survives, measured 2026-08-03 against the real policy** (which
emits only `script-src` and `style-src`, with no `style-src-attr`, no
`unsafe-hashes`, no `unsafe-inline`):

| How a style is set | Under CSP |
|---|---|
| `el.style.setProperty()` (CSSOM) | applies |
| `setAttribute('style', ...)` | blocked |
| `<style>` element with unhashed text | blocked, `.sheet` is null |

This is why BDL-006 passed the gate and the styleguide did not, and it is mostly
luck: Svelte 5 writes reactive `style={...}` bindings through CSSOM, so the
Regulator's crown rotation and ramp demo keep working. Hand-authored inline
style attributes are the real casualty. Three exist today and will need moving
to CSSOM or to a class before CSP can ship:

- `src/experiments/bdl-006/Crown.svelte` (crown indicator rotation)
- `src/experiments/bdl-006/Regulator.svelte` (ramp applied to the demo element)
- `src/pages/styleguide.astro` (swatch chip backgrounds)

The two Svelte ones are re-set through CSSOM on hydration, so they self-heal
after the island mounts; the cost there is a wrong first paint, not a dead
control. The styleguide chip is server-rendered only and would simply be blank.

**Triggers that would re-open this.** Two, and neither is on the roadmap:

1. **A third-party script is added.** An analytics beacon, an embed, a chat
   widget, anything served from a host you do not control.
2. **User-generated content gets rendered on a page.** Anything a stranger can
   put into the HTML a visitor receives.

If either fires, the work is: move the three inline style attributes listed
above to CSSOM or classes, refactor the styleguide and BDL-002 off runtime
stylesheet injection, then re-run the gate.

One trap to carry into that work if it ever happens: Cloudflare injects the Web
Analytics beacon at the edge, after Astro has generated the page and its policy,
so the beacon's hash can never be in it. A policy would have to allow
`https://static.cloudflareinsights.com` in `script-src` and
`https://cloudflareinsights.com` in `connect-src`, or the site blocks its own
analytics. Note this is also trigger 1: enabling Web Analytics is itself adding
a third-party script, though on its own it is not worth a CSP.

### Founder dashboard steps, done 2026-08-04

All verified live unless noted.

1. **`www` to apex redirect.** DONE. Redirect Rule, 301, wildcard
   `https://www.*` to `https://${1}` with preserve-query-string on. Verified:
   `https://www.../lab/bdl-006/?tune` returns 301 to the apex with path and
   query intact. Cloudflare warns the rule may not apply because `www` is a
   Worker custom domain rather than a hand-made DNS record; that warning is a
   false positive and "ignore and deploy" is correct. Do **not** create a second
   proxied record for `www`.
2. **HSTS.** DONE. `max-age=15552000; includeSubDomains`, preload **off**.
   Six months deliberately: browsers cache HSTS, so it cannot be undone by
   flipping the switch back, and preload removal takes months. Revisit preload
   once it has been lived with. Always Use HTTPS was already on and is
   complementary, not a substitute: it corrects the request after the browser
   has already sent it in the clear, whereas HSTS stops that first insecure
   request happening at all.
3. **No-Sniff header toggle.** DONE, at the zone. Redundant with `_headers` for
   static assets, but it reaches Worker-generated responses that `_headers`
   cannot. Verified: the `/api/contact` 405 now carries `X-Content-Type-Options`
   and `Strict-Transport-Security`. No duplicate header on static pages.
4. **DMARC.** `p=reject`, reporting to Cloudflare's ingestion address so the
   DMARC Management dashboard populates.

   `p=reject` was chosen over the usual `p=none` warm-up precisely because
   nothing legitimately sends as this domain yet, so there was no mail flow to
   break. When Email Sending or Workspace send-as goes live, send a test and
   confirm it lands before trusting it.

   **The trap that bit here on 2026-08-04: two DMARC records at once.** Both a
   hand-written record and Cloudflare's generated one were added, and the second
   silently disabled DMARC entirely. Per RFC 7489 a receiver that finds more
   than one record at `_dmarc` must discard the domain's policy and treat it as
   having none, so two records are strictly worse than either alone. Verify with
   `nslookup -type=TXT _dmarc.birchdesignlab.com` and confirm exactly one
   `v=DMARC1` line comes back. If both destinations are ever wanted, `rua`
   accepts a comma-separated list inside a single record; never a second record.
5. **Google Search Console.** DONE. Domain property, verified automatically
   through the Cloudflare integration (do not delete that TXT record).
   `sitemap-index.xml` submitted.
6. **Cloudflare Web Analytics.** Enabled, **but the beacon is not appearing in
   the HTML** as of 2026-08-04. Checked cache-busted. `Cache-Control` is
   `public, max-age=0, must-revalidate` with no `no-transform`, so that known
   blocker is not the cause. Most likely the edge is serving HTML cached from
   before it was switched on, or automatic injection does not reach
   Worker-served assets. Next step: purge cache and recheck. If it is still
   absent, embed the snippet manually in `src/components/HeadCommon.astro`.

Not on this list because it is not a Cloudflare step: **BIMI** shows a logo
beside your name in inboxes and needs a Verified Mark Certificate (roughly a
thousand dollars a year) plus a registered trademark. Ignore it.

### Analytics pathway (decided 2026-08-03)

Two tools, different jobs. Plausible was considered and passed over: founder's
read is that it is lacking, which is fair, since minimalism is the product.

**Cloudflare Web Analytics: always on.** Free, cookieless, needs no consent
banner, a few KB. Enable it before 2026-09-01 so there is traffic history from
launch day rather than starting the clock later. It answers pageviews,
referrers, and Core Web Vitals, and nothing else.

**TWIPLA: a deliberate temporary instrument, not a permanent tag.** Base script
is around 30KB compressed, plus roughly 35KB more if session recording is
enabled. That matters here because the website spec treats Lighthouse 100s as a
brand feature, and third-party JavaScript of that size is the most likely thing
to cost it. So do not leave it running.

The reason to reach for it at all: it answers a question Cloudflare cannot.
Founder does not know whether the Lab experiments land with a non-technical
visitor (see the 2026-08-03 direction set in `docs/lab-backlog.md`). Heatmaps
and session replay show whether someone drags the Regulator's crown or reads two
lines and leaves. Turn it on for a study window, gather the behavioral answer,
turn it off.

Two cautions when that window happens:

- **Mask the contact form inputs before recording anything.** Session replay
  will otherwise capture people typing their name, email, and message.
- The free tier is 25 session recordings, 1 heatmap, 1 funnel. That is a sample
  to reason from, not a dataset to conclude from.

Both are third-party scripts, so either one fires trigger 1 in the CSP section
above. That does not change the decision; the answer stays that a CSP is still
not worth it here.

### Headers the Worker must set when the contact form ships

`_headers` does not apply to responses generated by Worker code. Static assets
are served by the assets layer before the Worker runs, so those are covered, but
`/api/contact` responses come from `worker/index.ts`.

This is already partly live: `/api/contact` exists in production today, and only
the form markup is stashed. Exposure is negligible (the 405 body is a fixed
string and `errorPage` escapes its one interpolation), but the gap is real now,
not hypothetical.

**Two headers short, not three.** The zone-level No-Sniff toggle (dashboard step
3 above) covers `X-Content-Type-Options`, and HSTS is a zone setting, so both
already appear on Worker responses. Verified 2026-08-04 against the
`/api/contact` 405. What is missing there is `Referrer-Policy` and
`X-Frame-Options`.

Apply those two to every path the Worker answers: the 303 redirect to
`/contact/sent/`, the 400 malformed submission page, the 429 rate limit page,
the 405 method-not-allowed response, and the 502 degraded email path. Use one
helper that every response passes through rather than repeating the literals at
five call sites.

The contact form markup is parked in a named git stash, so pick this up at the
same time as `git stash pop`.

## Every deploy after that

Branch, open a PR, review, merge to `main`. Workers Builds then builds the
merge commit and runs `wrangler deploy`. Merging is what deploys; there is no
separate deploy step, and nothing should be pushed directly to `main`.

Manual escape hatch: `npm run deploy` builds and deploys with local wrangler
auth, bypassing Workers Builds entirely. Use it when the Builds pipeline is
down, as on 2026-08-03, when a Cloudflare incident ("Workers Build Failures")
left a build stuck in Initialize for 39 minutes. It deploys the **working
tree**, not the committed tree, so stash anything held back first. The contact
form markup sits in a named stash for exactly this reason; check
`git stash list` before running it.

## Local dev

- `npm run dev` — Astro dev server, no Worker (form POSTs will 404).
- `npm run dev:worker` — full stack: builds, then `wrangler dev` serves
  assets + Worker. Local email sends are simulated by miniflare and logged to
  `.wrangler/tmp/email/` (add `"remote": true` to the `send_email` binding to
  send real mail in dev; remove it before committing).
- After changing `wrangler.jsonc` bindings, run `npm run types` to regenerate
  `worker-configuration.d.ts` (committed).

## Node version

Pinned by `.nvmrc` at the repo root to **22.16.0**.

This matters: `package.json` requires `>=20.11`, and `prebuild` runs
`npm run og`, which needs `tsx` plus the native `@napi-rs/canvas` binary.
Workers Builds respects `.nvmrc` the same way Pages did; the pin keeps the
build deterministic regardless of image defaults.

Local dev currently runs Node 24. That one-major gap is deliberate and
harmless for this stack; if it ever stops being harmless, bump `.nvmrc`
rather than unpinning it.
