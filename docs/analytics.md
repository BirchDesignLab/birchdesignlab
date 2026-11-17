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
- **Consent:** Zaraz Consent Management enabled 09-01-26. Two purposes since
  10-22-26: **Analytics** gates the GA4 tag, **Marketing** gates the Meta
  Pixel. See "Consent management" below.
- **Tag:** Facebook Pixel (Meta), live 10-22-26. See "Meta Pixel" below.

## Also live: Cloudflare Web Analytics (not in Zaraz, not gated)

Found 10-22-26 while checking the live site; it predates this doc and was
never recorded. Kept on purpose (founder call 10-22-26), now disclosed on
`/privacy`.

- **What:** Cloudflare Web Analytics (RUM beacon). Cloudflare injects
  `static.cloudflareinsights.com/beacon.min.js` into every page at the edge and
  it reports to `/cdn-cgi/rum`. Site token `d83d74ba079e46e984502a275a2fae5a`
  (public, in page source), `spa` mode on. Nothing in the repo adds it.
- **Consent:** none. It loads and reports before the Zaraz banner is answered,
  and on Reject. Zaraz consent cannot gate it: it is a separate Cloudflare
  product. Verified live 10-22-26: beacon loaded, `/cdn-cgi/rum` sent, no
  cookies set (`document.cookie` empty before consent).
- **What we see:** totals only, in the Cloudflare dashboard (Web Analytics):
  page views, visits, referrers, countries, browsers and devices, page load
  timings.
- **Where it is configured:** Cloudflare dashboard, Web Analytics, site for
  birchdesignlab.com. Not checked from here (no dashboard API access with
  Web Analytics scope); confirm whether it is the automatic setup.
- **Privacy page rule:** the page must not say that declining stops all
  measurement. It says declining stops Google and Meta, and names this
  separately. If it is ever turned off, update `/privacy` in the same change.

## Meta Pixel (live 10-22-26)

Set up in the dashboard 10-22-26, after the privacy page (PR #98) shipped.

- **Tag:** Facebook Pixel (Zaraz's built-in **Facebook Pixel** tool), Pixel ID
  **1114230438203567**. The ID is public by design; it appears in page source.
- **Conversions API token:** the tool will not save without one. Generated in
  Meta Events Manager (Pixel → Settings → Conversions API → Generate access
  token) and pasted into the Zaraz tool. It exists **only in the Zaraz
  dashboard**: it is a secret, never record it here, in a PR, or in chat. If it
  is lost or revoked, generate a new one the same way and replace it in the
  tool's settings.
- **Sends server-side.** The tool needs the "Server network requests" and
  "Access client key-value store" permissions (both mandatory). Events go from
  Cloudflare to `graph.facebook.com/v21.0/1114230438203567/events`, so there is
  no `fbevents.js` in the browser, even after consent. Verify in Zaraz →
  Monitoring (status 200 on those calls) or Meta Events Manager, not the
  browser's Network tab.
- **Trigger:** Pageview, page scope (same as GA4).
- **Consent:** its own purpose, **Marketing**. GA4 stays under **Analytics**.
  Opt-in everywhere, same as before: nothing fires until the visitor turns
  Marketing on (or chooses Accept All).
- **Never in site code.** No Meta base snippet, no `fbevents.js`, no
  `<noscript>` image pixel in any page or layout. `Analytics.astro` stays
  dormant. Same reasoning as "Do NOT double-fire": a code copy alongside the
  Zaraz tool double-counts, and a code copy also bypasses consent.
- **Scope:** the "Zaraz off - Postiz" Configuration Rule already disables Zaraz
  on `postiz.birchdesignlab.com`, so the Pixel will not load there either. No new
  rule needed.

Dashboard steps, as done 10-22-26 (repeat for a rebuild or a client site):

1. Zaraz → Tools: add Facebook Pixel, grant both permissions, enter the Pixel
   ID and the Conversions API token, Pageview trigger.
   **Trap: the Pixel ID and token fields only keep a value after you press Tab
   out of them.** Typing or pasting and then clicking Save can store them
   empty; Meta then rejects the calls (Monitoring shows requests to
   `.../undefined/events`). After saving, **reopen the tool's settings and
   confirm both fields kept their values.**
2. Zaraz → Consent: add the Marketing purpose (text below) and assign the Pixel
   tool to it.
3. Paste the modal text (Field 1) and the CSS (Field 2).
4. Test: nothing sent to Meta before consent; after Accept, Zaraz Monitoring
   shows 200s to `graph.facebook.com` and Events Manager shows PageViews
   (allow a few minutes); Reject, or Analytics only, sends nothing to Meta.

Verified live 10-22-26: two purposes (Analytics, Marketing), both `false`
before a choice; banner shows the new intro, two toggles with readable light
text, and three buttons (Accept All, Reject All, Confirm My Choices); Meta
accepted Pixel events (6 × 200 in Monitoring). The only cookie page script can
see after Accept is `zaraz-consent`; any cookie Zaraz sets for the Pixel is
not visible from page script and was not checked.

## Scope — marketing site only

Zaraz auto-injects across the whole Cloudflare zone, which included the
self-hosted admin tool at **postiz.birchdesignlab.com** (consent nag on the
tool + our own Postiz sessions polluting GA4). Excluded 09-01-26 via a
**Configuration Rule** ("Zaraz off - Postiz"): `http.host eq
"postiz.birchdesignlab.com"` → **Disable Zaraz**. Verified: no `zaraz/s.js`,
no modal, no gtag on that host. Add a similar rule for any future
subdomain/tool that shouldn't be tracked.

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

## Consent management

Enabled 09-01-26 in **Zaraz → Consent**. The two editable fields below are the
config of record — the dashboard is the live copy, this is the backup.

### Posture: opt-in everywhere (built-in)

Zaraz's dashboard exposes no posture/geo/default-status toggle — only enable,
modal text, purposes, tool assignment, language. Enabling it gives Zaraz's
built-in behavior: **GA4 is withheld until the visitor accepts**, modal
auto-shows on first visit. Verified live: `zaraz.consent.getAll()` returns the
Analytics purpose `false` (denied) until Accept.

**Geo differentiation (EU/UK block, US notice) is deferred.** It is not a
switch — it needs custom JS (Zaraz consent Web API + geolocation to auto-grant
outside the EU/UK), which means shipping consent code, the thing the Zaraz move
avoided. The original note said to revisit when ads or real EU traffic land.
**Meta ads meet that revisit condition (10-22-26).** Revisited and still
deferred, on purpose: opt-in everywhere is the strict posture, so EU/UK visitors
are already covered (no Pixel, no GA4 without consent). What geo work would buy
is US visitors being counted by default, which is a data gain, not a compliance
fix. Re-open it if campaigns target the EU/UK, if consent rates make the ad
audience too thin to be useful, or if Google Ads lands too. Build it then as a
Custom Managed Component.

### Purposes

- **Analytics** — "Counts visits and which pages are read, so we know whether
  the work resonates. No advertising, no selling your data, no attempt to
  identify you." GA4 tool assigned to it.
- **Marketing** (live 10-22-26) — "Lets us measure our Facebook and
  Instagram ads and show them to people who have visited. Shares your visit
  with Meta." Facebook Pixel tool assigned to it.

### Field 1 — Consent modal text (HTML)

Injected at the top of the modal (inside its shadow root), above Zaraz's own
"Cookie Settings" heading region. Studio name only, no personal identity.

Live since 10-22-26 (two purposes):

```html
<div class="bdl-consent-intro">
  <p class="bdl-consent-lead">Two tools here ask first. Analytics counts visits and which pages are read. Advertising lets us measure our ads on Facebook and Instagram, and may show them to you after you visit. You choose below. Nothing here is sold.</p>
  <p class="bdl-consent-legal">Birch Design Lab &middot; <a href="/privacy">Privacy Policy</a></p>
</div>
```

Retired 10-22-26 (single purpose; never restore it while Marketing exists, it
says "nothing is shared"):

```html
<div class="bdl-consent-intro">
  <p class="bdl-consent-lead">We use one analytics tool to see how many people visit and which work they read. It tells us whether what we make is landing, not who you are. Nothing here is sold or shared.</p>
  <p class="bdl-consent-legal">Birch Design Lab &middot; <a href="/privacy">Privacy Policy</a></p>
</div>
```

### Field 2 — Custom CSS

Brand dark face, **simple two-button banner**. The modal renders in a **shadow
root** inside `.cf_modal_container`, so: font families work by name (document
`@font-face` reaches shadow DOM) but CSS custom properties do NOT cross — hence
hardcoded hex. Selectors verified against the live DOM 09-01-26. Zaraz fixes the
title text ("Cookie Settings") and the button labels — not editable.
`transition:none` on `.cf_button` defeats Zaraz's blue background transition.

**Single-purpose simplification, retired with Marketing (10-22-26).** With only
the Analytics purpose, the granular toggle and "Confirm My Choices" were
redundant, so the live CSS hides `.cf_consent-container` (the toggle), its `hr`,
and `#cf_consent-buttons__save` with three `display:none` rules. **The block
below is the live two-purpose version (10-22-26) and drops those three rules.** Kept,
they would leave only Accept All / Reject All, so Marketing would be bundled
under Accept with no separate choice. With them gone the modal shows a toggle
per purpose and three buttons (Accept All, Reject All, Confirm My Choices).

Replacing them: the `hr` gets a hairline in the modal's border color, and
"Confirm My Choices" is styled as a secondary button like Reject. Checked live
10-22-26: the toggle rows inherit `#f4f0e6` from `.cf_modal` (readable on the
dark face), and all three buttons render.

```css
.cf_modal {
  background-color: #1c1a17; color: #f4f0e6;
  border: 1px solid rgba(244,240,230,.14); border-radius: 4px;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
  font-family: 'Spectral', Georgia, serif; max-width: 30rem;
}
.cf_modal::backdrop { background-color: rgba(28,26,23,.62); }

#cf_modal_title {
  font-family: 'Marcellus', Georgia, serif; font-weight: 400;
  font-size: 1.5rem; letter-spacing: .01em; color: #f4f0e6;
}
.cf_consent-intro { margin: 0; }

.bdl-consent-lead {
  font-family: 'Spectral', Georgia, serif; font-size: 1rem;
  line-height: 1.55; color: #f4f0e6; margin: 0 0 .9rem;
}
.bdl-consent-legal {
  font-family: 'Marcellus', Georgia, serif; font-size: .78rem;
  letter-spacing: .06em; text-transform: uppercase;
  color: #a89f8f; margin: 0;
}
.bdl-consent-legal a {
  color: #a3bd8f; text-decoration: none;
  border-bottom: 1px solid rgba(163,189,143,.4);
}
.bdl-consent-legal a:hover { color: #f4f0e6; }

/* Two purposes (Analytics, Marketing): the toggles, their divider and
   "Confirm My Choices" stay visible so each purpose is a separate choice.
   Do not hide them again while more than one purpose exists. */
.cf_modal hr { border: 0; border-top: 1px solid rgba(244,240,230,.14); margin: 1.2rem 0; }

/* Button row (Accept All, Reject All, Confirm My Choices) */
.cf_consent-buttons {
  background-color: transparent !important; display: flex !important;
  flex-direction: row !important; flex-wrap: wrap !important;
  align-items: stretch !important; justify-content: stretch !important;
  gap: .6rem !important; margin: 1.4rem 0 0 !important; padding: 0 !important;
  height: auto !important; min-height: 0 !important; max-width: none !important;
}
.cf_button {
  display: block !important; flex: 1 1 0 !important; width: auto !important;
  box-sizing: border-box !important; text-align: center !important;
  font-family: 'Marcellus', Georgia, serif !important; letter-spacing: .08em !important;
  text-transform: uppercase !important; font-size: .8rem !important;
  padding: .75rem 1rem !important; line-height: 1.2 !important; height: auto !important;
  border-radius: 3px !important; cursor: pointer !important; margin: 0 !important;
  transition: none !important;
}
.cf_button--accept { background-color: #a3bd8f !important; color: #1c1a17 !important; border: 0 !important; }
.cf_button--accept:hover { filter: brightness(1.08); }
.cf_button--reject { background-color: transparent !important; color: #f4f0e6 !important; border: 1px solid rgba(244,240,230,.28) !important; }
.cf_button--reject:hover { border-color: #a3bd8f !important; }
#cf_consent-buttons__save { background-color: transparent !important; color: #f4f0e6 !important; border: 1px solid rgba(244,240,230,.28) !important; }
#cf_consent-buttons__save:hover { border-color: #a3bd8f !important; }
```

## Ads: Meta and Google

Both go in the same way: as a Zaraz tool behind the **Marketing** purpose,
never as an inline snippet (`fbevents.js`, gtag) in site code. Same edge layer,
no Lighthouse cost, no code change, and consent is enforced in one place.

- **Meta ads** (live 10-22-26): Facebook Pixel tool, Pageview trigger,
  Marketing purpose. See "Meta Pixel" above. Conversion events
  beyond PageView (for example a Lead on contact-form success) would be extra
  Zaraz triggers, still under Marketing; none are set up, and the privacy page
  would need to say so before they are.
- **Google Ads** (not set up): add conversion / remarketing as a Zaraz tool or
  trigger under Marketing, not under Analytics. The Analytics purpose text
  promises "no advertising", so an ads tag must never be assigned to it.

Each new ad tool also needs: the Marketing purpose text and modal intro checked
(they name Facebook and Instagram today), a privacy page clause, and a look at
the geo deferral above.

## Privacy policy

`src/pages/privacy.astro` updated to match (PR #79): discloses the opt-in
consent banner, leads the opt-out with it, drops the stale "loads only after
the page has finished rendering" line, and moves the public contact address to
`hello@birchdesignlab.com`. The worker notify destination stays the verified
Email Routing target (`birchdesignlab@gmail.com`); `hello@` forwards there.

10-22-26 (Meta Pixel PR): adds an Advertising clause (Meta Pixel, Marketing
consent), names Meta under "Who we share it with", rewrites the subline and the
banner description for two separate choices, and adds Meta to retention. Also
discloses Cloudflare Web Analytics (runs without consent, no cookies) and drops
the claim that declining means "nothing about your visit is measured". Not
legally reviewed.
