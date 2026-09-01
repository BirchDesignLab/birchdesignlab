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
- **Consent:** Zaraz Consent Management enabled 09-01-26. One purpose
  (**Analytics**) gates the GA4 tag. See "Consent management" below.

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
avoided. Not worth it at one analytics tag in a US market. Revisit when Google
Ads or real EU traffic lands — build it then as a Custom Managed Component.

### Purpose

- **Analytics** — "Counts visits and which pages are read, so we know whether
  the work resonates. No advertising, no selling your data, no attempt to
  identify you." GA4 tool assigned to it.

### Field 1 — Consent modal text (HTML)

Injected at the top of the modal (inside its shadow root), above Zaraz's own
"Cookie Settings" heading region. Studio name only, no personal identity.

```html
<div class="bdl-consent-intro">
  <p class="bdl-consent-lead">We use one analytics tool to see how many people visit and which work they read. It tells us whether what we make is landing, not who you are. Nothing here is sold or shared.</p>
  <p class="bdl-consent-legal">Birch Design Lab &middot; <a href="/privacy">Privacy Policy</a></p>
</div>
```

### Field 2 — Custom CSS

Brand dark face. The modal renders in a **shadow root** inside
`.cf_modal_container`, so: font families work by name (document `@font-face`
reaches shadow DOM) but CSS custom properties do NOT cross — hence hardcoded
hex. Selectors verified against the live DOM 09-01-26. Zaraz fixes the title
text ("Cookie Settings") and the three button labels ("Accept All" / "Reject
All" / "Confirm My Choices") — not editable. `transition:none` on `.cf_button`
defeats Zaraz's blue background transition.

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

.cf_modal hr { border: 0; border-top: 1px solid rgba(244,240,230,.14); margin: 1.25rem 0; }

.cf_consent-container { list-style: none; margin: 0; padding: 0; }
.cf_consent-element label h3 {
  font-family: 'Marcellus', Georgia, serif; font-weight: 400;
  font-size: 1rem; color: #f4f0e6; margin: 0 0 .25rem;
}
.cf_consent-element label p { font-size: .9rem; line-height: 1.5; color: #a89f8f; margin: 0; }
.cf-checkbox { accent-color: #a3bd8f; }

.cf_consent-buttons { background-color: transparent !important; display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.25rem !important; }
.cf_button {
  font-family: 'Marcellus', Georgia, serif; letter-spacing: .08em;
  text-transform: uppercase; font-size: .8rem; padding: .65rem 1.1rem;
  border-radius: 3px; cursor: pointer; flex: 1 1 auto;
  transition: none !important;
}
.cf_button--accept { background-color: #a3bd8f !important; color: #1c1a17 !important; border: 0 !important; }
.cf_button--accept:hover { filter: brightness(1.08); }
.cf_button--reject { background-color: transparent !important; color: #f4f0e6 !important; border: 1px solid rgba(244,240,230,.28) !important; }
.cf_button--reject:hover { border-color: #a3bd8f !important; }
.cf_button--save { background-color: transparent !important; color: #a3bd8f !important; border: 1px solid rgba(163,189,143,.5) !important; }
.cf_button--save:hover { background-color: rgba(163,189,143,.1) !important; }
```

## When Google Ads is set up

Add conversion / remarketing as a Zaraz tool or trigger — not an inline gtag
snippet. Same edge layer, no Lighthouse cost, no code change.

## Loose end

`src/pages/privacy.astro` says analytics loads "only after the page has finished
rendering." Zaraz loads earlier than the old deferred bootstrap did (still
lightweight, edge-served). Revisit that sentence for accuracy — backlog, not
blocking.
