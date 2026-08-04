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

### CSP: tested, deliberately not shipped

Astro's `experimental.csp` was enabled and verified in a real browser on
2026-08-03. It works everywhere except `/styleguide` and `/lab/bdl-002`, which
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

Revisit when the contact form ships. That is when the site starts accepting user
input, which is when CSP starts earning its keep.

One thing to carry into that revisit: Cloudflare injects the Web Analytics
beacon at the edge, after Astro has generated the page and its policy, so the
beacon's hash can never be in it. Any future CSP must allow
`https://static.cloudflareinsights.com` in `script-src` and
`https://cloudflareinsights.com` in `connect-src`, or the site blocks its own
analytics. Recorded here because it is invisible until it bites.

### Founder dashboard steps, not code

1. **HSTS.** SSL/TLS then Edge Certificates. Verified not set on 2026-08-03.
   Always Use HTTPS is already on and is complementary, not a substitute: it
   corrects the request after the browser has sent it in the clear, whereas
   HSTS stops that first insecure request happening at all.
2. **Cloudflare Web Analytics.** Free, cookieless, no consent banner. No code
   change needed now that there is no CSP to widen.
3. **Google Search Console.** Verify the property before 2026-09-01.

### Headers the Worker must set when the contact form ships

`_headers` does not apply to responses generated by Worker code. Static assets
are served by the assets layer before the Worker runs, so every response is
covered today, but `/api/contact` responses come from `worker/index.ts` and
would carry no security headers at all.

Note this is already partly live: `/api/contact` exists in production today and
its 405 and error responses ship unheadered. Only the form markup is stashed.
Exposure is negligible (the 405 body is a fixed string and `errorPage` escapes
its one interpolation), but the gap is real now, not hypothetical.

Apply the same three headers to every path the Worker answers: the 303 redirect
to `/contact/sent/`, the 400 malformed submission page, the 429 rate limit page,
the 405 method-not-allowed response, and the 502 degraded email path. Use one
helper that every response passes through rather than repeating three literals
at five call sites.

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
