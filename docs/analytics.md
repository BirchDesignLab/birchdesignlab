# Analytics — config of record

Analytics moved from a client-side gtag bootstrap (`src/components/Analytics.astro`)
to **Cloudflare Zaraz** on 09-01-26. This file is the in-repo record of what
Zaraz is configured to do, because Zaraz config lives in the Cloudflare
dashboard, not in git. Keep it in sync when you change the Zaraz setup.

## What's live

- **Vendor:** Cloudflare Zaraz (edge tag manager). Loader served from
  `https://birchdesignlab.com/cdn-cgi/zaraz/s.js`.
- **Tag:** Google Analytics 4, measurement ID **G-44Y71C24L7**.
- **Trigger:** Pageview, page scope (fires on every page load).
- **Consent:** _TODO — decide before adding more tags. Zaraz has a built-in
  Consent Management Platform; wiring it once makes every current and future
  tag obey it. Cheapest to do now at one tag._

## Why edge, not client code

- Perf scales: more tags cost ~the same as one; business pages hold Lighthouse.
- No redeploy to add or change a tag.
- Built-in consent + first-party/server-side send (cookieless-resilient).
- Consolidates on Cloudflare, already the whole stack.

## Do NOT double-fire

`Analytics.astro` is dormant and must stay that way while Zaraz injects
G-44Y71C24L7. A client-side gtag.js load for the same G-id double-counts every
pageview. If a tag ever needs to move back into code, remove the GA4 tool from
Zaraz first.

## When Google Ads is set up

Add conversion / remarketing as a Zaraz tool or trigger — not an inline gtag
snippet. Same edge layer, no Lighthouse cost, no code change.

## Loose end

`src/pages/privacy.astro` says analytics loads "only after the page has finished
rendering." Zaraz loads earlier than the old deferred bootstrap did (still
lightweight, edge-served). Revisit that sentence for accuracy — backlog, not
blocking.
