# Lab entries and genre demos: critique pass (11-22-26)

Scope: every live Lab entry (catalog row, page, copy, visuals) and the two
deployed genre demos (salon, kitchen). Method: read every entry body, then
full-page shots at 1440 and 390 of `/lab`, each entry page and each demo page
(`scripts/scratch/lab-critique/shots.mjs`, output beside it, gitignored).
BDL-005 and BDL-012 got a lighter read than the rest. Nothing was changed.

## Across the Lab

1. **The catalog shows no work.** `/lab` is eleven rows of title, summary and
   tech chips; not one image. The home "From the lab" lines are the same. A
   visitor has to click to see anything, and the tech chips (the least
   interesting fact to a business owner) are the most prominent thing in each
   row. Fix: an optional `thumb` per entry in the schema, shown in the catalog
   row and available to the home lines.
2. **Study heroes fight their own titles.** The hero is a screenshot under a
   heavy veil. On BDL-008 and BDL-009 the screenshot's headline ghosts through
   and collides with the page title ("Coastal comfort food, done right" runs
   into "Bayou Kitchen"). Both screenshots are also stale: they show an older
   build of the demos (serif headline, salmon button, no photo), not what is
   deployed.
3. **Long pages, no pictures.** BDL-008 is about 1,400 words of claims "you can
   go and check" with no screenshot of the price list, the booking page or the
   Vietnamese page. BDL-011 is about 1,770 words on six visual schools with one
   image, the hero. BDL-005 is the model: a screenshot every few paragraphs.
4. **Plate rows that do not fit a fictional business.** "Delivered September
   2026" on a salon that does not exist; the long workers.dev hostname wraps
   and orphans the tick (known, in the backlog).

## Entry by entry

| Entry | Verdict | Main problems |
|---|---|---|
| BDL-013 Drawing Set | Good | Explains itself, obvious "Next" affordance. No catalog image. |
| BDL-012 Data Map | Good | Light read only. No catalog image. |
| BDL-011 Field Guide | Good copy, under-illustrated | One image for six schools. Each school section needs its own crop. |
| **BDL-010 Portal** | **Weakest listing, strongest piece** | No page, no body, no image. Summary opens "The Portal:" under the title "The Portal". The row drops the visitor into `/t/quiet/` with no framing; nothing says what they are looking at or what to press. |
| BDL-009 Bayou Kitchen | Thin | About 240 visible words in two sections, then the page stops. Stale hero. The ordering half is unwritten, blocked on the Stripe test-mode call. |
| BDL-008 Magnolia & Mane | Overlong and defensive | Reads like a deposition: "We will not oversell", "One caveat", "the one score this site does not post". The caveats narrate the demo's gaps; better to close the gaps and cut the caveats. The consent section is hard to follow. No inline images. |
| BDL-007 Shining Tree | Fine | Plate copy is good but lives in a collapsed bar. |
| BDL-005 Cheer and Chatter | Strongest study | Light read only. |
| BDL-002 Styleguide | Dated | Designer-facing; the wall label overlaps the content on load. Already queued for rebuild / demote / retire. |
| BDL-001 Bark Engine | Dated | In light mode the first view is a near-blank page with a control box. Same queue. |

## The two demos: why they do not read as real sites

Ranked by how much each one gives the game away.

1. **They are the same site, and it is ours.** Same sage and cream, same
   Marcellus and Spectral, same section order, same headings word for word
   ("What We're Known For", "A Little About Us", "Take a Look Inside", "What
   Our Guests Say", "Common Questions", "Visit Us"). Neither business has an
   identity. Cause: both are byte-identical to the spine on styling and the
   spine has one theme.
2. **"Demo" is in the business name everywhere.** "About Demo Magnolia & Mane
   Salon"; a guest review that says "Hired Demo Bayou Kitchen to cater". The
   footer already says "A demonstration by Birch Design Lab" and both are
   noindexed.
3. **The hero.** The photo is washed to near-white, the headline wraps in a
   narrow column ("Coastal / comfort / food, done / right") and the subtitle
   sits on the busiest part of the photo.
4. **Dead ends in the nav.** Salon "Book Now" is an empty page with one button.
   Kitchen "Order Online" always shows "We're not taking pickup orders online
   right now". Kitchen "Book Now" is the same empty page.
5. **The home pages hide the point.** The kitchen home shows catering and
   private dining, not food or the menu. The salon home shows no prices and the
   nav has no Services link, though prices are the study's headline claim.
6. **Thin content.** Salon: four services, three reviews, four photos, a
   two-paragraph About with no photo and no people. A real salon site is mostly
   stylists.
7. **Template tells.** "US" as an address line; hours printed twice at the foot
   of every page in two formats; an empty caption card in the kitchen gallery;
   orphan cards (four services in three columns, five reviews in three);
   "$65 per visit"; buttons reading "VIEW FULL COLOR & GLOSS"; emoji dietary
   icons; an unexplained star on menu items.

The kitchen menu page is the best page on either site.

Where the fixes live: 1, 3, 4 and 7 are spine (`bdlBase`) work and flow to
every future client site. 2, 5 and 6 are content in the demo repos.

## Decisions for the founder

1. **Portal listing.** (a) Give BDL-010 a real `/lab/bdl-010` page: the
   six-school sheet as hero, about 150 words, one large "Enter the Portal"
   button, a link to the Field Guide. (b) Keep the direct link, add a thumbnail
   and a tighter summary. Recommended: (a).
2. **Catalog thumbnails.** Yes or no; if yes, also on the home lines?
3. **Demo identity.** (a) The spine learns per-site brand: palette, type pair,
   hero and section variants declared in the business file. (b) Hand-style each
   demo and accept drift from the spine. Recommended: (a); it is also the claim
   BDL-013 makes.
4. **Drop "Demo" from the business names**, keeping the footer line and
   noindex?
5. **Stripe test mode on the kitchen** (pending since 09-06): decides whether
   BDL-009 gets its second half or the Order page leaves the nav.
6. **What "write something up for the salon and kitchen" means**: rewrite the
   two Lab pages (cut 008, finish 009), or something else.
