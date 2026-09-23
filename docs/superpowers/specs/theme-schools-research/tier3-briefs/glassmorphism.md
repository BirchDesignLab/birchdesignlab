# Glassmorphism: Tier 3 brief

School id `glassmorphism`, route `/t/glassmorphism/`. Written 09-23-26 by the brief author, drawing on three critic reports (authenticity, craft, motion, all B-), the research dossier (`../dossiers/glassmorphism.md`, cited as [n]), the code in `src/themes/glassmorphism/`, and spot checks of the tier2 stills and motion-tier2 strips. Where the critics disagreed, the captures settled it; those calls are marked "Resolved".

Contract reminders for the reviser: copy, link targets, page set, form fields and behaviour, portal head and switcher are fixed. Everything visual is open. No em dashes in anything a visitor reads. `meta.ts` contrast pairs must be updated whenever a token or layering changes, and must still pass.

---

## 1. Verdict

**Current grade: B-** (all three lenses agree).

The recipe is all there (backdrop blur with saturate, 1px edge, inset highlight, squircle icons, window chrome, solid pill buttons, serious contrast engineering), but the one experience the school exists for, vivid colour seen through frosted layers that rank by thickness, hardly happens. Four concrete causes, all confirmed in the captures:

1. **The orbs sit beside the glass, not behind it.** On Home light desktop the "Ready when you are" pane frosts nothing while the largest cyan orb sits alone in the empty right half. The Lab panel gets colour at one corner. On phones, `mx`/`my` move every orb into the gaps on purpose (`Orbs.astro` says so), so almost every card is white on lilac.
2. **Every surface is the same glass.** Hero, doors, lab, ask, offers, four steps, title, reading, form, direct card, footer card and header all share one fill, one 140deg sheen, one shadow and 24 to 40px radii. With no hierarchy, the page reads as a stack of equal white cards (navy in dark). The dossier names this as the likeliest single cause of "lackluster" [1][3][4][11].
3. **Light glass is milky and the light field is flat.** A 0.56 white fill plus a 0.45 sheen, over `#eef0fb` with a faint pastel wash, comes out close to opaque white. Light is the native scheme, and it is the scheme the founder judges.
4. **Nothing moves under the glass.** The 3s fx strips are near-identical frames. The orbs scroll locked to their panels, and the one signature gesture is a whole-page blur crossfade that smears the text.

The one place it already works proves the diagnosis: About's title card, where the cyan orb sits squarely behind the pane and the reading pane overlaps it, reads as real glass in both schemes.

**A+ looks like this:** a vivid, fixed, Big Sur-style wallpaper in both schemes, with foreground orbs moving at a different scroll rate from the panels, so the frosting visibly changes as you read. Glass comes in three thicknesses plus a solid surface, assigned by role. Each page has exactly one showpiece pane: the thinnest and largest, sitting over the most colour. Navigation chrome (header bar and a slim footer dock) is the thickest glass. Secondary blocks go solid or become hairline groups. Glass never sits on glass. The material itself is modern: no diagonal sheen stripe, a luminosity step, the 1px edge as the light cue, and optionally a fine noise inside the glass. Text on glass is neutral and ranked by weight and opacity, with colour living in the backdrop. The nav, footer pills and form fields light up near the pointer. The school ships a real reduced-transparency and high-contrast off state. A visitor on a phone should see colour through every card.

---

## 2. Protect

Everything below must survive revision.

- **Solid, opaque gradient pill buttons (`.btn`).** Canon-correct: controls should not be transparent [1]. Keep dark's own violet-to-cyan gradient with dark ink.
- **The contrast discipline in `meta.ts`**: every text token measured over the worst orb, plus the `@supports` opaque fallback [3][11][24]. The method may be refined (decision D2); the discipline stays.
- **The 1px `--edge` border plus the inset top highlight.** This becomes the main light cue once the sheen goes [1][2].
- **Big Sur squircle app icons** (radius 28%) with numerals and their darker icon tokens, and the **macOS window chrome** (traffic lights) on the Home hero [8].
- **The sticky floating glass header** that content scrolls under [4], its segmented-control nav with the raised current-page thumb, and 44px minimum targets on the nav and footer pills.
- **About's overlapping title and reading panes.** This is the one real layered-glass moment. Keep the overlap and give the two panes different thicknesses.
- **Dark scheme character**: `--orb-glow`, the dark edge light, and the lighter dark glass. Dark is designed, not inverted.
- **The wordmark `transition:name` persistence** (the seed of "one floating plane" [4][17]).
- **`fx.ts` off-screen pause discipline** (IntersectionObserver plus `data-live`, mounted via `onMount` with the dataset guard). Every new motion follows it.
- **The type voices**: Inter with `cv11`/`ss01` for body, the Plus Jakarta display setting of "Birch / Design Lab" (subject to D4 on colour), `text-wrap` balance and pretty.
- **Correct mobile stacking order** on every page, no horizontal scroll, and the footer pills as a 2x2 grid on phones.
- **The phone blur downgrade** (`blur(16px)`, no saturate under 720px). Resolved: the motion critic also wanted to protect the phone `mx`/`my` orb placement, but the mobile stills show that placement is what empties the glass. The cost thinking stays; the placement goes (item E2).
- **The Sent page composition**: a centred single pane, check badge, big "Sent.", one pill.
- **The existing reduced-motion block.** Extend it; do not replace it.

---

## 3. Execution work, ordered by leverage

Each item gives where, the change, why, and how to verify. "Stills" means `scripts/themes/.out/tier2-<viewport>/t-glassmorphism[-page]__<scheme>__<viewport>.png` as re-captured after the change. A capture caveat applies to E1 and E2: `main::before` is `position: fixed`, and the full-page stills render a fixed layer only in the top viewport. Verify the wallpaper with viewport-sized captures taken at several scroll offsets, or with the fx strips. The orchestrator owns the capture scripts; ask it for a scrolled-viewport pass.

### E1. Material hierarchy: three thicknesses plus a solid, assigned by role

- **Where:** `theme.css` (`.glass`, `.glass-strong`, the new tokens) and every component that uses `.glass`: `Header.astro`, `Footer.astro`, `pages/*.astro`. Both schemes, all viewports.
- **Change:** Replace the single `--glass` with role tokens modelled on Apple's thicknesses and Fluent's materials [3][13]:
  - `--mat-thin`: the one showpiece pane per page, carrying display type. It is the thinnest fill, the most saturated blur, and sits over the most colour. Target light fill 0.2 to 0.3 if D2 allows; otherwise see D2's fallback.
  - `--mat-regular`: panes whose main job is body copy.
  - `--mat-thick`: navigation chrome only (the header `.bar` and the footer dock from E6).
  - `--surface-solid`: a Mica-like opaque surface [12] (field-raised, tinted slightly toward the section's dominant hue, hairline edge, **no backdrop-filter**) for secondary and inner blocks.
  - In dark, the showpiece uses a Clear-plus-dim variant (low-alpha navy over a dimming layer) [3].
  Assign by role:
  - **Showpieces**: Home `.window`; Services `.head-card`; About `.title-card`, with `.reading` as regular, so the overlap reads as two thicknesses; Contact `.form`; Sent's single pane.
  - **Regular**: Home `.door` x2 and `.lab-panel`; About `.founder-card`; Contact `.intro`.
  - **Solid or hairline group**: Services `.step` x4, which become one regular pane holding four hairline-divided columns, not four glass cards. Also the Services `.offer` cards (regular, or solid if they would compete with the head card), Home `.cells`, Contact `.direct`, and the closing asks.
  - **Thick**: the header and the footer dock.
  Whatever stays glass must differ visibly (fill, blur and shadow depth), not by 0.14 alpha.
- **Why:** Authenticity 2, Craft 1, dossier gap 1 and priority 1, tells 4 and 5, trap "glass on everything" [1][3][4][11][12][14]. This is the biggest single lever against "lackluster".
- **Verify:** In `t-glassmorphism-services__light__desktop.png` the head card must read as a different material from the offers, and the steps must read as one grouped pane. On every page, in both schemes, a viewer should be able to name the showpiece at a glance. In About light and dark, the title and reading panes must be visibly different thicknesses where they overlap.

### E2. Put colour under the glass: orb placement rule, desktop and mobile

- **Where:** the `Orbs` props in every `pages/*.astro`, the footer orb props passed from `src/pages/t/glassmorphism/[...page].astro`, `Orbs.astro` (its comment and the `mx`/`my` semantics), and `theme.css .orb @media (max-width: 720px)`. Both schemes, desktop, tablet and mobile.
- **Change:** New placement rule, replacing "half under, half out" at the gutters: **every text-bearing glass pane has saturated colour under 40 to 60% of its area**, and the showpiece has 60 to 80%. Put one or two large orbs directly behind each pane's body, offset toward a corner, so that an orb edge crosses the pane (the crisp edge is what makes the frosting legible). Cut the gutter orbs that frost nothing:
  - Home: the cyan and violet pair beside "Ready when you are", which should go behind the ask or behind a widened ask (E5).
  - Services: the pink and cyan balls between rows.
  - About: the lone orange ball at left, which collides with the CTA button.
  - Footer: the orbs hanging off the corners, which go entirely with E6.
  On phones, `mx`/`my` put orbs **behind** the cards: large (60 to 90vw), low and centred under each card's body, not clipped at the right edge. Solid surfaces (E1) need no orb.
- **Why:** Authenticity 1 and 12, Craft 3, dossier tell 2, trap "dull backdrops", gap 5 [1][11][12][19]. Malewicz says the style shows best over a busy colourful background [1]. Resolved: the motion critic's "protect the phone orb placement" is overruled by `tier2-mobile/t-glassmorphism__light__mobile.png`, where every card is white on lilac.
- **Verify:** In `t-glassmorphism__light__desktop.png`, the ask, the Lab panel and both door cards each show orb colour through a large share of their area. In `t-glassmorphism__light__mobile.png` (and the dark and tablet stills), no text-bearing card is plain white or navy over the field.

### E3. A real wallpaper in light and dark, and stop the idle drift

- **Where:** `theme.css` `--field*`, `main::before`, `body` background, `--ambient-opacity`, and the `meta.ts` field pairs. Both schemes, all viewports.
- **Change:** Replace the pale lilac field and the 0.62 `-hi` wash with a fixed, saturated wallpaper. Use large mid-value mesh forms in the four **body** hues (not the `-hi` pastels), darkening toward the edges, in the Big Sur manner [1][8]. Dark gets the deep variant, carried through the whole scroll, so that lower sections no longer fall to `#0a0e24`. Drop the 80s `ambient-drift` (always on screen, never paused by `fx.ts`, imperceptible in 3s) and spend the motion budget on E4. Keep text off the field entirely: section kickers such as "WHAT WE BUILD" and the Home "How we build" link move into or onto a pane (E7), so the field pairs in `meta.ts` can be retired or re-pointed. Keep the wallpaper's darkest stop within the orb set, so `--blob-worst` still bounds every pane's contrast.
- **Why:** Authenticity 5, Craft 2 and 11, dossier gap 5, priority 2 [1][11][12].
- **Verify:** Scrolled-viewport captures (see the caveat above) at the top, middle and bottom of Home and Services in both schemes show saturated colour between panes. `fx__light__desktop` shows no ambient drift. The contrast check passes.

### E4. Make the backdrop move relative to the glass on scroll

- **Where:** `theme.css` (`.orbs`, `.orb`, `main::before`) and `fx.ts` if a JS fallback is needed. All viewports.
- **Change:** Give the backdrop its own scroll rate, which is the dossier's studio proposal [4]:
  - Keep the wallpaper fixed.
  - Drive the orbs with `animation-timeline: view()` (or `scroll(root)`) translating at a different rate from their panels, roughly 0.3x to 0.6x of travel, so that panels visibly slide over colour and the frosting changes as you read.
  - Guard it with `@supports (animation-timeline: view())`, turn it off under `prefers-reduced-motion`, and keep the `data-live` pause.
  - Consider retiring the time-based `glass-drift` in favour of the scroll drift, or keep it only on the showpiece's orbs.
  - Check the GPU cost with a trace at 390px, because a fixed or parallax backdrop makes every visible `backdrop-filter` re-blur on scroll [11][19].
  - Per the memory note on GPU rendering, run any headless check with the GPU flags.
- **Why:** Authenticity 6, Motion 4 and 10, dossier tell 3, gap 6 [1][4][19]. This is background fx within the page, not a page transition, so it belongs in Tier 3.
- **Verify:** A scrolled capture pair (the same pane at two scroll offsets) shows different colour under the pane. The orchestrator may need a scroll-motion strip, since the fx strips are static-scroll. The existing fx strips should show no regression.

### E5. Resolve the layout moments that read as mistakes

- **Where:** `pages/Home.astro`, `pages/Services.astro`, `pages/About.astro` and `pages/Contact.astro` at desktop and tablet.
- **Change:** Several tier-1 attempts to "avoid sameness" (stagger, ride-up, offset) read as errors. Once E1 gives real hierarchy, jitter is not needed.
  - **Services**: remove `.step:nth-child(even) { margin-top }` and the matching offer stagger (01 and 03 high, 02 and 04 low has no visible reason). The `.ask-row` negative margin meant to "ride over the last step's corner" lands flush against the step row with about 8px of seam (dossier trap "edge-to-edge panes" [11]). Either make it a real, deliberate overlap with contrasting thickness (at most one per page; About already owns that move), or give it the full section gap.
  - **Home**: the ask is a half-width card beside an empty half. Either centre it over a showpiece-grade orb, or widen it into a full-width strip. The door cards' gap is a thin seam; give it at least 2 to 3rem or merge the two doors into one pane with a hairline divider.
  - **About**: `.title-card` carries `clamp(5rem, 9vw, 7.5rem)` of bottom padding for the overlap, which leaves a large empty lower half. Cut it, and let `.reading` overlap by 2 to 3rem. Move the closing `.btn` inside the quote pane or seat it on the pane's bottom edge; it currently floats below the pane and collides with an orange orb.
  - **Contact**: `.form`'s `margin-top` was meant to line up with the h1 but lands about 52px below the intro's top edge with no shared line. Align it to the intro top, or offset it by exactly the chip height, so the form top meets the h1 cap line.
- **Why:** Craft 4 and 5, Authenticity 8 [11].
- **Verify:** `t-glassmorphism-services__light__desktop.png`: steps on one baseline and the ask clearly separated or clearly overlapping. `t-glassmorphism__light__desktop.png`: no empty half beside the ask. `t-glassmorphism-about__light__desktop.png`: no dead half in the title card, and the button inside or on its pane. `t-glassmorphism-contact__light__desktop.png`: the column tops share a line.

### E6. Footer becomes a slim thick-glass dock; header and footer bookend

- **Where:** `Footer.astro`, and the footer orb props in the route file. All pages, all viewports.
- **Change:** Replace the tall footer card (as tall as the CTA above it, with an empty band before the fine print) with a slim `--mat-thick` dock matching the header bar: one row on desktop (name and location, pills, fine print), two or three tight rows on phones with the pills kept as a 2x2 grid. Remove the footer's own orbs; the fixed wallpaper (E3) gives the dock something to frost.
- **Why:** Craft 13, Authenticity 2, dossier priority 1 (navigation on the thickest glass) [3][11].
- **Verify:** The footer in every still reads as navigation chrome paired with the header, not as a fifth content card, and no orb hangs off its corners.

### E7. No glass on glass; concentric radii

- **Where:**
  - `Header.astro .seg`
  - `Home.astro .cells`, `.switch` and `.locale`
  - `theme.css .chip` and `.btn-glass`
  - `Contact.astro` fields and trust chips
  - `Footer.astro` pills
- **Change:**
  - Inner elements go solid or hairline, and each stack keeps exactly one glass level [4][11][21]:
    - `.seg` becomes a hairline-outlined track, and the thumb stays solid.
    - `.cells` becomes a hairline-divided list with no well fill.
    - Form fields become opaque `--surface-solid` wells with a hairline edge.
    - Chips become plain labels, or solid tinted pills inside their pane.
  - `.btn-glass` becomes a solid surface with a hairline edge; it is a control [1].
  - The `.locale` pill that straddles the window edge moves into the window bar (see D5).
  - Derive every nested radius as outer minus padding (for example `calc(var(--r-xl) - var(--pad))`): `.cells` inside `.lab-panel`, fields inside `.form`, `.seg` inside `.bar` [4].
- **Why:** Authenticity 8 and 13, Craft 6 and 7, dossier gap 2 and gap 8, tells 5 and 10.
- **Verify:** Home lab and Contact form stills (both schemes, desktop and mobile) show no milky double frost and concentric corners. The header bar shows one translucent layer.

### E8. Modern material recipe: drop the sheen stripe, add a luminosity step

- **Where:** `theme.css .glass`, `.glass-strong` and `--blur` (light and dark), and `meta.ts overOrb()` (which includes `--sheen`).
- **Change:** Remove the `linear-gradient(140deg, var(--sheen), transparent 48%)`, or cut it to at most 0.08. Add `brightness(1.05 to 1.1)` to the light `--blur`, and a small `contrast()` or brightness step in dark, standing in for Acrylic's exclusion layer and Apple's luminosity adjustment [3][11]. The 1px edge plus the inset highlight carries the light [1][2]. Update `overOrb()` to drop `--sheen` once it is gone. Noise is D3.
- **Why:** Authenticity 7, Craft 12, dossier tell 7, gap 3, trap "the 2000s recipe" [11][14][19].
- **Verify:** Light desktop stills: no brighter top-left wedge on every card, and the edges read as the light source. The contrast check passes.

### E9. Neutral text on glass

- **Where:** `theme.css .chip` (`--accent`), `Home.astro .designation`, About's etymology terms (purple bold), `--link` usage on panes. Both schemes.
- **Change:** Text on glass goes neutral in a three-level label hierarchy (primary `--mark`, secondary, tertiary), ranked by weight and opacity [3][11]. Kickers and BDL designations use neutral secondary. About's "Birch", "beorc" and "bright" keep their emphasis through weight or italic, not hue. Links on panes use `--mark` with underline and weight. Colour moves to the orbs, and optionally to a slight per-section glass tint toward the dominant orb [5][12]. The `.b2` gradient headline is decision D4.
- **Why:** Authenticity 9, Craft 9, dossier tell 9, gap 10 [3][11]. Moving the brand colour into the backdrop makes the backdrop the star, which is the whole point.
- **Verify:** About light desktop reading pane and Home lab panel: no purple text other than the D4 exception. Links remain distinguishable (underline). Contrast passes.

### E10. Off state: reduced transparency and increased contrast

- **Where:** `theme.css` (new media block) and `fx.ts` if orbs are JS-gated.
- **Change:** Under `@media (prefers-reduced-transparency: reduce), (prefers-contrast: more)`:
  - Set every material token to `--glass-fallback` or `--surface-solid`.
  - Set `backdrop-filter: none`.
  - Hide `main::before` or flatten it to a plain field gradient.
  - Stop orb and scroll-driven motion.
  - Under `prefers-contrast: more`, also raise `--edge` to a solid 1px `--line`-strength border.
  - Add `forced-colors: active` sanity: borders visible, no reliance on backgrounds.
- **Why:** All three critics, dossier tell 12, gap 7, priority 6 [3][11][12][22][24]. It is cheap and clearly canon.
- **Verify:** Emulate the media features in the Browser pane or Playwright (`emulateMedia({ reducedMotion, contrast })`, with reduced transparency via a forced-media flag if available) and confirm solid panes, no blur and no motion.

### E11. Touch-safe interaction states

- **Where:** `theme.css .btn:hover`, `.btn-glass:hover`, `.btn:hover .arw`; `Header.astro .seg a:hover`; `Footer.astro .pills a:hover`; `Sent.astro` (line 59, `.back`).
- **Change:** Wrap every hover rule in `@media (hover: hover) and (pointer: fine)`. Add `:active` to `.seg a`, `.pills a` and the ghost pill: a brief brightness or `--thumb` fill at 83ms linear, `scale(0.97)` [17]. Add `-webkit-tap-highlight-color: transparent`. Add `.back` to the reduced-motion `transition: none` list.
- **Why:** Motion 6 and 8. The mobile and tablet captures are touch devices, and unguarded hover sticks after a tap.
- **Verify:** On a touch viewport in the Browser pane, tap a pill or segment: there is press feedback, and no lifted or highlighted state remains after navigation.

### E12. Pointer light on the command groups (Reveal)

- **Where:** `Header.astro .seg`, `Footer.astro .pills`, the Contact field group, plus a small module mounted via `onMount` (pattern of `fx.ts`).
- **Change:** One `pointermove` listener per group sets `--px`/`--py`. A `radial-gradient(closest-side at var(--px) var(--py), var(--edge-hi), transparent)` is painted into a masked 1px border ring on the group, with a soft halo on the hovered item [15][4]. Scope it to groups only (not the door cards, which are not interactive). Enable it only under `(hover: hover) and (pointer: fine)`, and tear it down on swap. Under reduced motion keep the lit state and drop the travel. Give `:focus-visible` on `.seg a`, `.pills a` and `.btn` the same visual language (an `--edge-hi` ring plus a soft accent halo), keeping a transparent 2px outline for forced colours.
- **Why:** Authenticity 11, Craft 14, Motion 5 and 9, dossier tell 11, gap 9, priority 5.
- **Verify:** In the Browser pane at desktop, hover across the nav: the border light tracks the pointer. Keyboard focus shows the lit ring. Reduced motion shows a static lit state.

### E13. Mobile header shows the name

- **Where:** `Header.astro @media (max-width: 720px)`.
- **Change:** Stop visually hiding `.wm-a`. Show "Birch" beside the orb (keep `.wm-b` visually hidden if width demands; the accessible name is unchanged), and tighten the `.seg` padding or type to fit at 390px with 44px targets. This also gives the wordmark morph letters to land on, instead of squashing the previous school's wordmark into a 24px orb.
- **Why:** Craft 10, Motion 3 (`arrive__dark__mobile.png` +240ms shows the squash).
- **Verify:** All mobile stills: "Birch" is visible at the top of every page with no horizontal scroll. In the `arrive__*__mobile` strips, the wordmark morphs into text rather than into the orb.

### E14. Type scale and body ink on panes

- **Where:** `Home.astro .sub` and `.door p`; `Services.astro .step p`; the `theme.css` body colour on panes.
- **Change:** Body copy on panes uses `--mark`, with `--mark-muted` reserved for meta (location, fine print). Resolved: Craft 8's "no intermediate step between display and body" is wrong; `.lead` already sits at 1.35 to 1.9rem. The real problem is that `.sub` and the door copy sit muted at 17px on milky glass. Raise `.sub` to about 1.125 to 1.2rem in `--mark` and keep the existing lead. Optionally load `@fontsource-variable/inter/opsz.css` in the route file so that Inter gets its text and display optical sizes [27].
- **Why:** Craft 8, dossier section 5.
- **Verify:** The Home light desktop hero and door cards read crisp, not faded.

### E15. Stop the arrival smearing text (defect fix only; full choreography waits)

- **Where:** `theme.css` view-transition rules (lines 382 to 406).
- **Change:** The minimum needed so the room does not open on a blur:
  - Split the in-school swap from the cross-school arrival with `html[data-from-theme='glassmorphism']`, as bauhaus, vaporwave and grandmillennial already do.
  - The in-school swap becomes a short opacity handoff with no `filter` on the root: old out 167ms, new in 250ms, `cubic-bezier(0,0,0,1)` [17]. This removes the "Design Lab" ghost over "The shining tree".
  - The cross-school arrival drops the 22px text blur and stays under about 333 to 400ms.
  - Set the wordmark group to 333ms `cubic-bezier(0.55,0.55,0,1)` so it lands with the page, not after it [17].
  - Under reduced motion, use an 83ms linear fade instead of `none` [17].
  Leave the material-based choreography to the transitions phase (section 5).
- **Why:** Motion 1, 8 and 11, Authenticity 14, dossier gap 12. The founder deferred transitions, so this item is scoped as a defect fix. If the founder prefers the arrival untouched until the transitions phase, skip it.
- **Verify:** `page__light__desktop` and `page__dark__mobile` strips: no double-exposed headlines at +240 and +320ms, and text never blurred. `arrive__*` strips settle by about 400ms, with the wordmark not trailing.

### E16. Adaptive header shadow (small)

- **Where:** `Header.astro .bar`.
- **Change:** A scroll-driven animation (`animation-timeline: scroll(root)`, range 0 to about 80px) deepens the bar's shadow once content is beneath it: a cheap version of Liquid Glass's adaptive shadow [4]. Guard it with `@supports` and reduced motion.
- **Why:** Dossier section 6, "Adaptive shadow". Low cost, and it signals "floating plane".
- **Verify:** Scrolled-viewport captures: the header shadow is visibly stronger at scroll offset 400 than at 0.

---

## 4. Founder decisions

Bring these to the founder before building the items they gate. Each has options and a recommendation.

**D1. Which lineage does the room commit to?** (It gates the orb look, E9's headline exception and D4, and the heading font.)
- A. **Dribbble 2021**: glossy spheres, gradient headline, accent chips. This is today's look.
- B. **Platform material**: Big Sur, Acrylic and Mica discipline, with neutral text, soft wallpaper and material hierarchy.
- C. **Hybrid**: platform discipline (hierarchy, material, off state, neutral text) with 2021 colour energy (vivid orbs, one gradient headline).
- Recommendation: **C.** The canon's defining traits are all in B [1][3][11], but `meta.ts` names the signature "a 2021 app store screenshot", and a little Dribbble exuberance is what makes it a period room rather than a settings panel.

**D2. How contrast is measured, which decides how thin the glass can go.**
- A. Keep the current method: the unblurred worst orb plus sheen, 4.5:1 everywhere. The glass stays around 0.5 or more and milky.
- B. Measure against the blurred average of the orb under the pane.
- C. Keep the worst case, but let display-only panes and regions (text of at least 24px, or 18.5px bold) use the WCAG 3:1 large-text floor [23].
- Recommendation: **C.** It stays conservative and standard-backed. The showpiece's display region can then use a 0.2 to 0.3 fill. If a showpiece also carries body copy (Home `.window`'s subline, Contact's form labels), grade the pane from thin at the top to regular under the text with a vertical fill gradient, or seat the body copy on a regular inner plate. That is a studio proposal and should be labelled as one. If A is kept, E1 still works, but its thicknesses must separate by blur, saturation and edge more than by fill.

**D3. Noise inside the glass.** `meta.ts` `forbids` includes "paper grain".
- A. Keep the forbid, with no noise.
- B. Reword it to "paper grain on the field" and allow a 2 to 4% fine noise tile inside `.glass` only, per the Acrylic recipe [11][14].
- Recommendation: **B.** It is the canon's material texture, and it helps the thin glass read as a substance rather than as tinted air.

**D4. The gradient "Design Lab" headline (`.b2`).**
- A. Remove it: the headline is neutral.
- B. Keep it as the single sanctioned coloured text in the room.
- C. Keep it but derive it from the orb behind it, so it reads as colour coming through the glass.
- Recommendation: **B**, under D1-C: one exception, everything else neutral (E9).

**D5. The hero's fake toggle (`.switch`) and the locale pill.**
- A. Keep both as they are.
- B. Replace the switch with an inert window title-bar label, and move the location there as a status label, which removes the sticker pill straddling the window edge.
- C. Make the switch a real control, such as the scheme toggle. This is portal-level and touches the contract.
- Recommendation: **B.** Canon treats toggles specially [1][3], a dead control on the first screen invites a tap that does nothing, and B also fixes Craft 7.

**D6. Persisting the header bar across in-school swaps.** README says no element other than the wordmark may use `transition:name`. The built-site guard (`tests/built/portal.test.ts`) only checks that each `view-transition-name` is unique per page. Naming `.bar` through CSS `view-transition-name` scoped to `html[data-theme='glassmorphism']` would pass the guard, but it bends the README's wording.
- A. Keep only the wordmark named.
- B. Allow one CSS-named `glass-bar` group (and later a named thumb), and update the README to say "one `transition:name`; CSS-named groups allowed if unique".
- Recommendation: **B**, but as a transitions-phase item, since it is about page swaps. Decide the contract question now so the transitions phase is not blocked.

**D7. Orb rendering.**
- A. Keep the glossy shaded spheres (specular at 32% 28%).
- B. Flat two-stop discs with crisp edges and no hotspot, with the fixed wallpaper (E3) supplying the soft Big Sur forms.
- C. Soft, heavily blurred blobs throughout.
- Recommendation: **B.** Resolved against C: the captures show that where a crisp orb edge crosses a pane (About title card, Contact form top), the frosting is legible, and blurring the orbs themselves would remove the contrast the glass needs to show. Dropping the specular hotspot is what stops them reading as plastic billiard balls or clip art, as all three critics said.

**D8. Heading face.**
- A. Keep Plus Jakarta Sans: a 2020 face, period-correct for the Dribbble lineage [28].
- B. Move headings to Inter Display via the `opsz` axis, pulling the room toward the Apple and Microsoft canon [10][27].
- Recommendation: **A** under D1-C. Load Inter's `opsz` for body regardless (E14).

**D9. Scope check on E15.** The founder said transitions come later. E15 fixes the defect (blurred text, ghosting) without designing the choreography.
- A. Include E15 in Tier 3.
- B. Leave the arrival untouched until the transitions phase.
- Recommendation: **A.** The smear is the first thing every visitor sees and reads as a bug.

---

## 5. For the transitions phase (not Tier 3)

Motion ideas worth keeping, all grounded in the dossier's section 6. Pick one lineage per transition (Fluent fast or Liquid fluid) and state which [17][4].

- **Frost over, clear through**, arriving from another school: a full-viewport pane frosts over the live outgoing page, with blur rising while it is still visible, then clears into the Glassmorphism room. The previous school literally becomes the wallpaper [19][20].
- **Materialise, do not fade**: each pane ramps its own `backdrop-filter` from 0 to full, with the edge highlight arriving last, staggered 40 to 60ms by hierarchy (showpiece first, chrome last). Text stays crisp throughout [4].
- **One persistent floating plane**: the header bar holds still across swaps (D6), and a named current-page thumb slides between segments at 250ms `cubic-bezier(0.55,0.55,0,1)` [4][17].
- **Wordmark as lead**: the wordmark moves first and the page follows. On phones, design the orb as the wordmark's collapsed state deliberately.
- **Scroll edge effect**: content dissolves as it scrolls under the header bar, keeping the bar clear and visibly above [4].
- **Touch glow**: on touch devices, a glow starts under the finger and spreads briefly to neighbouring glass in the same group [4].
- **Gentle exit**: `cubic-bezier(1,0,1,1)` 167ms for leaving the school [17].
- **Cost discipline**: any animated `backdrop-filter` gets the `fx.ts` off-screen pause and a 390px GPU trace [11][19].
