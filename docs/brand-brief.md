# Birch Design Lab brand brief

*Written 08-13-26 for the design sweep. The audience is whoever designs the
mark: a hired designer, or the founder working in a design tool. It gathers what
is already known, decided, and rejected, so a first round does not spend itself
rediscovering it.*

## The short version

Birch Design Lab needs a real logo. The mark it uses today is a placeholder that
the founder does not like, and the mark drawn in August 2026 to replace it is
also one the founder does not like. Both are described below, honestly, because
knowing what has already failed is most of the value here.

The studio's visual language is settled and good. The typography, palette, and
the material feel of the site are not in question and are not up for redesign.
What is missing is a mark that belongs to them.

## The studio in one paragraph

Birch Design Lab is a one-person studio building custom software and custom
websites for businesses that want to grow. The work is deliberately not
templated: the site's own case for itself is that it builds working systems
rather than demo shells. The public site has two registers that were formally
split on 08-13-26. The business pages, home, services, about, and contact, are
"quiet luxury": restrained, fast, nothing showy. The Lab, which holds the
studio's experiments and client case studies, is the opposite and is meant to
impress a non-technical visitor within about five seconds. The mark has to sit
comfortably in the quiet half, because that is where a prospective client meets
it first.

The name is literal. Birch bark, its horizontal lenticel dashes, and the way a
birch trunk reads at a distance have been the well every visual decision has
drawn from, including the site's generative bark background. That is a strength
and a trap, and the trap is worth naming: every mark attempted so far has been
horizontal dashes, and the founder has disliked all of them.

## Questions the brief cannot answer

These are the founder's to settle, and a designer should push for answers before
drawing.

1. **Does the mark have to be birch at all?** Every attempt so far assumed yes.
   Nothing requires it. The name carries the birch on its own.
2. **What should it say about the studio?** "Careful" and "made by a person" are
   implied by everything else on the site. Whether the mark should also say
   technical, or crafted, or old, or precise, has never been decided in writing.
3. **Does the studio want a symbol at all,** or is a wordmark alone the honest
   answer for a one-person practice? A wordmark would sidestep the favicon
   problem described below, at the cost of having nothing that works at 16px.

## Where the mark has to work

This is the real constraint set, and it is what killed the last attempt. Sizes
are actual, not aspirational.

| Placement | Size | Current state |
|---|---|---|
| Browser tab favicon | renders at 16px, authored at 32px | `public/favicon.svg`, three dashes on a rounded charcoal square |
| Web app manifest icon | 512x512 | `public/og/logo.png`, the 32px favicon geometry scaled up 16x |
| OpenGraph share cards | 1200x630, wordmark set at 84px | Generated per page by `scripts/og/`, five cards |
| Site header | any | **Nothing. The header carries no mark and no wordmark today.** |
| Site footer | small | The name as Marcellus smallcaps text, no mark |
| Client TV slide | a band about 46% of a 1920px frame | The Cheer and Chatter live app's developer credit slide |

Two things follow from that table.

**The range is brutal.** The same mark has to survive a 16px browser tab and a
band roughly 880px wide on a television across a room. The August 2026 attempt
handled this by drawing two marks, a dense nine-dash version and a simplified
four-dash version for anything under about 32px. That is a legitimate solution
and it is also an admission that the dense mark does not scale.

**Almost nothing is adopted.** The site still serves the old placeholder
everywhere. Whatever comes out of the sweep gets wired in once, cleanly, and the
work to do that is already understood. A designer does not need to think about
it.

## The system the mark lives in

Fixed. Not part of this exercise.

**Colour.** Warm charcoal `#1c1a17` is the dark field. Paper `#f4f0e6` is the
mark on dark. Ink `#1f1b15` is the mark on light. Moss `#a3bd8f` is the single
accent and clears 8.46:1 on the dark field. Warm stone `#a89f8f` is muted text on
dark, `#5a5244` on light.

**Type.** Marcellus for display and small caps, an engraved Roman capital face.
Spectral for body. Both serif, both warm, neither fashionable. A geometric sans
mark would fight them.

**Faces.** The site runs a dark face and a light face. Anything delivered has to
work on both, which is one of the open decisions below.

## What has already been tried, and rejected

**The current placeholder**, live since July 2026. Three paper dashes, evenly
placed, on a rounded charcoal square, authored at a 32px viewBox and scaled to
512 for the manifest. Founder's own summary: the logo sucks. It reads as a
generic app icon and the even spacing makes the dashes look like a list, not
bark.

**Seven directions mocked on 08-08-26**, one chosen, six declined on sight:

- A refined version of the three-dash favicon. Declined for being too close to
  the placeholder people already disliked.
- A pale birch trunk silhouette.
- A branch scar rendered as a Marcellus "B".
- A hallmark-style seal.
- A sparse arrangement of three heavy dashes.
- An all-paper monochrome variant of the chosen mark, with no moss accent.

**The direction that was chosen, and is also not liked.** A "dense bark" scatter:
nine lenticel dashes of varied length and weight, deliberately off-grid, one of
them moss, the rest paper. Two lockups were built from it and both survive
because the founder would not choose between them: a side-by-side arrangement
with the mark, a hairline rule, and the three words stacked, and a "canopy"
arrangement with the bark stretched into a wide band sitting over a single-line
wordmark. A simplified four-dash cut exists for small sizes because the nine-dash
version muddies below about 32px.

On 08-13-26 the founder restated that none of this is settled and that the whole
set is a bridge to the September 2026 launch rather than a decision. It is
shipping. It is not chosen.

**The pattern worth noticing.** Every rejected candidate and the accepted one are
the same idea: horizontal dashes on a dark field. Seven variations on one theme
were mocked, and the theme itself was never the thing being tested. That is the
most useful thing in this document.

## Open decisions

- **Does the mark invert?** Ink dashes on paper for the light face, or does the
  mark always sit on its own charcoal tile regardless of the surrounding face?
  Never decided. No light-face artwork exists.
- **Which lockup is primary?** Both were kept alive deliberately. The choice
  affects the header, which currently has neither.
- **Does the moss accent stay?** Exactly one dash is moss in the current mark. A
  monochrome variant was drawn and declined, but not on strong grounds.

## What a finished delivery looks like

- Vector source, editable, not a traced raster.
- The primary mark.
- A small-size variant if the primary does not hold at 16px, which is likely.
- One lockup at minimum, mark plus wordmark, with the wordmark as outlines so it
  does not depend on Marcellus being installed.
- Both faces, or an explicit decision that the mark always carries its own field.
- One-colour artwork for anything printed or stamped.

## How to judge a candidate

Not by looking at it large. Every mark looks fine large.

1. Render it at 16px in a browser tab, next to a dozen other tabs. Is it
   identifiable, or is it a smudge?
2. Render it one-colour, no accent. Does it still work?
3. Put it in the site header, at text size, beside Marcellus small caps. Does it
   belong to the same family or is it a guest?
4. Put it on a television across a room. Does it hold?
5. Show it to somebody who is not technical and does not know the studio. Ask
   what kind of business it is. Their answer is the only real test the site's own
   quality bar recognises.

A candidate that fails 1 or 3 is not a candidate, however good it looks at 512px.

## Where the current files are

Everything below is in the `birchdesignlab` repository.

- `public/favicon.svg`, the live placeholder, 32px viewBox.
- `public/og/logo.png`, the 512px scale-up. Generated by `scripts/og/logo.ts`.
- `public/site.webmanifest`, references both.
- `assets/brand/`, the August 2026 mark, its small-size cut, and both lockups.
  Nothing here is wired into the site build. The two lockups are generated by
  `scripts/brand/build-lockups.mjs` and must not be hand-edited.
- `assets/brand/sponsor-card/`, the client TV slide that uses the canopy lockup.
- `docs/superpowers/specs/2026-08-08-bdl-brand-lockup-sponsor-card-design.md`,
  the full record of the August session, including the geometry of every dash.

Replacing the mark needs no code change beyond swapping files and wiring the
adoption, which is not the designer's problem.
