# BDL-012 + BDL-005 copy pass: draft for founder decision (11-16-26)

**APPLIED 11-16-26.** The founder approved every recommendation: A1–A7,
B1–B4 (B1 as the qualifier, Refund caption kept, STATS at 49), the C
grammar fix, and both D lines. The C drafts stand as written. Sources: the BDL-012 entry in
`docs/lab-backlog.md` (live audit, read-of-repo findings, first-draft list).

Rules held throughout: studio "we", never "you" for the owners; no prices,
venues, addresses, limits or key scopes; only what is deployed; no emdashes.
The figures (701, 815, 245, 33,056) are unchanged: same pull, not refreshed.

## A. Wrong or overstated on the page today (recommend fixing all)

**A1. "701 automated checks run before anything goes live."** No CI gate in
the client repo; the tests exist and are run by hand.
- LOCKS, `data.ts:472`. Title *Checks before every change* → **Tested where
  it's tricky**. Body → **701 automated tests cover the system, from ticket
  math to Central time on daylight-saving nights.**
- STATS, `data.ts:487`: *automated checks run before any change goes live* →
  **automated tests in the codebase**

**A2. "Makes sure it's a real person, not a bot."** Turnstile is inert; what
runs is spam screening and a repeat-try limit.
- Form journey step 2, `data.ts:226` → **The forms desk screens out spam and
  limits repeat tries.**
- Forms map line label *only real people*, `data.ts:309` and the phone
  timeline caption `stage.ts:352` → **spam screened out**

**A3. "It never sees who bought them."** The order webhook carries buyer
details; the Worker discards them unlogged.
- LOCKS *Buyers stay private*, `data.ts:468` → **Who bought a ticket stays
  with the box office. Each order message does name the buyer, and the site
  never stores or logs it: it notes the night, then asks Ticket Tailor for
  the count.**
- Ticket Tailor box, under the hood, `data.ts:129`: *…never buyers.* →
  **The site reads checkout links and ticket counts, and keeps nothing about
  buyers.**

**A4. "Every night … overnight."** The scheduled rebuild lands mid-morning
Central.
- CALLOUTS, `data.ts:361`. Title *Every night* → **Once a day**. Body →
  **The site also rebuilds itself every morning, so last night's event moves
  to Past, stops selling, and leaves the sitemap Google reads.**
- Site builder box, `data.ts:132`: → **Rebuilds every page whenever the
  owners publish, and again each morning.** (also settles A5 there)

**A5. Page counts.** "50 pages" / "42 event pages" are October; the live
sitemap has 33 upcoming nights, and 42 + 7 static pages is 49.
Recommend: the map and journeys stop counting (they read as live); the
dated stats keep October numbers, corrected.
- Publish journey step 3, `data.ts:207` → **Every page is rebuilt and goes
  live.**
- Website box, `data.ts:148`: *42 event pages* → **a page for every night**
- STATS, `data.ts:484`: 50 → **49** (alt: drop the row)
- Pages table, `data.ts:416`: *42 event pages* → **Event pages** (note
  "one per night" stays)

**A6. "A Wednesday"** on the Google card (`data.ts:427`) and the share-card
mock (`Experiment.astro:182`) → **A Tuesday**, matching the live calendar.

**A7. "Six cities along the coast"** (content-library drawer, `data.ts:321`)
→ **Six cities, most of them on the coast.**

## B. True of the code, shaky in production (your call)

**B1. Refund clears Sold Out.** True when Ticket Tailor delivers the refund;
two on 10-12 never arrived and were cleared by hand.
- CALLOUTS *And back again*, `data.ts:360` → **When Ticket Tailor reports a
  refund that frees a seat, Sold Out clears itself and the Buy button
  returns.** (alt: drop the callout)
- The desk's Refund caption (`stage.ts:590`) acts out the code path in a
  miniature; recommend leaving it.

**B2. "Nothing is written to storage"** (forms desk, under the hood,
`data.ts:293`). Signups write Resend contacts. → **The site keeps no
database of its own: signups go straight to Resend's contact lists.**

**B3. "Lets a dead phone resume"** (host console, under the hood,
`data.ts:155`). Offered back by a tap, once online. → **…and the night is
saved on the phone, so a restarted phone can pick it back up once it is
online.**

**B4. "Pages prerender to static HTML"** (site builder, under the hood,
`data.ts:133`). The API routes and one TV route render on request. →
**Pages prerender to static HTML; the API routes and one TV route run on
request.**

## C. First drafts awaiting approval (no change proposed unless marked)

**Line labels** (`data.ts:172–189`, plain / under the hood):

| Line | Plain | Under the hood |
|---|---|---|
| Studio → Sanity | every edit, on Publish | document mutations from the Studio |
| Game decks → Sanity | cards, questions and photos | typed documents, written by import script → **by an import script** |
| Sanity → Site builder | the whole library | GROQ queries at build time |
| Sanity → Game relay | tonight's cards and questions | one GROQ read for the night |
| Site builder → website | the finished pages | prerendered static HTML |
| Site builder → Google | listings, sitemap and share cards | JSON-LD, the sitemap and Open Graph tags |
| Owners' Ticket Tailor → box office | nights, ticket types and capacity | event series set up in Ticket Tailor |
| Buyers → box office | ticket orders | checkout on the club's own subdomain |
| Box office → Site builder | each night's checkout link | a REST API read during the build |
| Box office → watcher | a note for every order | a signed order webhook |
| Watcher → Sanity | Sold Out, on or off | one field patched, only on a real change |
| Relay ↔ Host console | every tap, and who is watching | a WebSocket in the host role |
| Relay → Venue TV | what to show next | a WebSocket in the viewer role |
| Buyers → Forms desk | whatever was typed into a form | one validated POST |
| Forms desk → Resend | only what passed screening | calls to the Resend API |
| Resend → owners' inbox | the full request | an email with reply-to set to the sender |
| Resend → guests' inboxes | a thank-you | a confirmation email |
| Resend → mailing lists | newsletter and waitlist signups | a contact created or updated |

**Drawer section headings** (`stage.ts:252–256`): In plain English · Under
the hood · On its lines · Why it is built this way · When something goes
wrong · The order of things · *A sketch of the idea, not the client's code.*

**The five deep drawers** (watcher, relay, builder, forms desk, host
console): `data.ts:509–548`. Checked line by line against the client repo
11-16-26; read in place.

**Desk chips** (`data.ts:377–385`, `stage.ts:469–474`): watcher *listening /
checking*; Sanity *Sold Out: off / on*; builder *idle / rebuilding*; event
page *On sale / Sold out*; Google *In stock / Sold out*; box office *N of 40
sold*.

**Map hints** (`Experiment.astro:112–113`). Phone: *Pinch or double-tap to
zoom, drag to move around. Tap a box to open it, or a line to see what
travels on it.* Desktop: *Click a box to open it. Hover a line to see what
travels on it.*

**Hero wall note** (`Experiment.astro:65`): *Flying into the library:
watercolor caller cards from the club's Plant deck.*

**Wall label, second line** (`bdl-012.md` howto): *Open any box, or point at
any line, to see what it does and what travels on it.*

**BDL-005, new section** (`src/studies/bdl-005/Extra.astro:44–70`):
- *In one picture* / **Two months of building, then refinements** / *Commits
  to the project, month by month, from the first one in July 2026 to the
  middle of November.*
- *One piece of it, working* / **Call a card** / *This is the host's phone
  and the venue TV in miniature, with real cards from the Plant deck. The
  whole system is drawn, and can be operated, in BDL-012, The Data Map.*

**BDL-005, the sentence before the map picture** (`bdl-005.md:196–198`):
*And we drew the owners a picture of the whole thing, so they could see how
the pieces they use every week fit together. That drawing is BDL-012, The
Data Map, and it can be operated:*

## D. Also noticed (soft, not on the backlog list)

- *Guessing gets locked out* (LOCKS, `data.ts:471`): the form limit is per
  isolate, so "locked out" is strong. Alt title: **Repeat tries are
  slowed**.
- *…scans its own output to prove none leaked* (LOCKS, `data.ts:467`):
  a scan finds known patterns; alt **to catch any that leaked**.
