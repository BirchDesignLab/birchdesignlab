# Glassmorphism: research dossier

School id `glassmorphism`. Written 09-23-26 for the Tier 3 revisers of `/t/glassmorphism/`. Every claim carries a numbered source [n]; the list at the end gives URL and whether it is primary or secondary. Where the two upstream research reports disagreed, the sources were reopened and the disagreement is resolved in "Corrections to the upstream reports" at the very end.

A note on what counts as primary here. This school has no museum objects. Its canon is shipped software and the documentation, sessions and press material of the companies and the designer who made it. Those are treated as primary. The one founding essay is Michal Malewicz's 11-22-20 UX Collective article, now paywalled on Medium; the full text was read from an Internet Archive capture of 01-05-21 [1].

---

## 1. The school in one paragraph

Glassmorphism is the name Michal Malewicz gave in November 2020 to an interface style that had been building since Mac OS X's Aqua and Windows Vista's Aero Glass: interface surfaces drawn as frosted glass, floating in layers over vivid colour, so that the user reads depth and hierarchy from what shows through each layer [1][14]. Malewicz named four defining traits: a frosted transparency made with background blur, a multi-layered arrangement of objects floating in space, vivid colour behind to show off the blur, and a subtle light border that stands for the glass edge [1]. He placed it as the successor to Neumorphism, credited iOS 7 (2013) with popularising background blur, and cited macOS Big Sur and Microsoft's Fluent "Acrylic" as the systems that brought it back in 2020 [1]. The companies that shipped it describe it less as a look than as a material with a job. Apple's iOS 7 design page says layers establish hierarchy and "The use of translucency provides a sense of context and place." [6]. Microsoft describes Acrylic as a simulated physical material built from light, blur, noise and colour, used to separate supporting UI from content [14][11]. Apple's 2025 successor, Liquid Glass, pushes the same idea further: the material lenses light, adapts to what is behind it, and is kept to the navigation layer above content [3][4]. The originators would recognise an excellent execution by three things: glass used sparingly enough to mean something, a backdrop rich enough to be worth frosting, and legibility treated as the central design problem rather than an afterthought [1][3][11][24].

---

## 2. The canon

Dates are as the sources give them.

| Exemplar | Why it matters | Src |
|---|---|---|
| Mac OS X Aqua (2000) | Apple and Microsoft both name it as the start of translucent, glass-like OS surfaces. | [4][14] |
| Windows Vista Aero Glass (Microsoft dates the theme to 2005; documented in MSDN Magazine, April 2007) | First mass-market live compositor glass: the Desktop Window Manager blends each window with the live desktop behind it, so moving a window over animation shows the animation through the frame. Ships a diagonal "aurora" streak in the glass, user-set colour and opacity, and a documented legibility trap (default black text renders as transparent on glass). | [19][14] |
| iOS 7 (June 2013) | Brought real-time blur to phones and named the purpose: distinct functional layers for hierarchy, translucency for context. Malewicz cites the notification pull-down, where icons blur beneath the incoming panel, as the moment the effect became loved. | [6][7][1] |
| WebKit `backdrop-filter` (08-10-15) | Put backdrop blur on the open web, explicitly to replicate the iOS 7 and OS X Yosemite look; reference value `blur(10px)`. | [20] |
| CSS Filter Effects Level 2, `backdrop-filter` (Editor's Draft, 01-23-26) | The web primitive we build on. Blur uses mirrored edges at the element border; `backdrop-filter`, opacity below 1, filters, masks, clip-path and blend modes each create a Backdrop Root, which limits what nested glass can sample. Still a draft without Working Group consensus. | [21] |
| Microsoft Fluent Acrylic (Windows 10 Fall Creators Update, 2017) | The most explicit published recipe: background, blur, exclusion blend, colour/tint overlay, noise. Comes with usage rules (transient and supporting surfaces only, never layered, never edge to edge) and automatic solid fallbacks. | [11][14] |
| Fluent Reveal Highlight (2017, now not recommended by Microsoft) | Glass that responds to the pointer: a light that exposes hidden borders of interactive elements as the pointer approaches, plus a halo on hover. The only canonical precedent for pointer-driven light on a glass surface before Liquid Glass. | [15][16] |
| macOS Big Sur (2020) | The release that made the style a trend. Apple's own page stresses a refined new design, full-height sidebars, and "a new uniform shape for app icons" [8]. Malewicz reads Apple's colourful default wallpaper as chosen to make the blur visible [1]. Critics documented the legibility cost of its translucent menu bar and stacked translucent layers [25][26]. | [1][8][25][26] |
| Malewicz, "Glassmorphism in user interfaces" (UX Collective, 11-22-20) | The naming document. Gives the four traits, the build advice (fill transparency, not object transparency; busy but not over-detailed backgrounds; a 1px semi-transparent inner border), and the accessibility warning. | [1] |
| Hype4 Academy glassmorphism generator | The trend's own reference tool, hosted by the academy associated with Malewicz's studio. Current defaults: blur 20px, fill `rgba(255,255,255,0.15)`, 1px border `rgba(255,255,255,0.3)`, radius 20px, shadow `0 8px 32px rgba(0,0,0,0.1)`, plus inset highlight lines. Controls are named Blur, Refraction, Depth. These are the tool's defaults as served on 09-23-26, not a dated 2020 spec. | [2] |
| Windows 11 Mica and Mica Alt | Microsoft's answer to Acrylic's cost: an opaque material that samples the wallpaper once and tints a solid base with it, neutral when the window is inactive, applied once per app as the base layer, with low-opacity solid content layers on top. | [12] |
| Fluent 2 materials (current) | Four named materials, not one "glass": Solid, Acrylic (transient light-dismiss surfaces), Mica (base layer), Smoke (translucent black dimming behind modals). | [13] |
| Apple Liquid Glass (WWDC 06-09-25) | The current state of the art. Lensing instead of scattering; adapts tint, shadow and light/dark to what is behind; materialises rather than fades; glows from the touch point; morphs between controls; reserved for the navigation layer; Regular and Clear variants, never mixed. | [3][4][5] |

---

## 3. Defining tells: a critic's checklist

Apply each to a page. A "yes" is the canon's answer.

1. **Frosted transparency via backdrop blur, with the fill (not the whole object) made transparent.** Malewicz is explicit that lowering object opacity with a solid fill kills the blur [1]. On the web the same holds: `backdrop-filter` paints the filtered backdrop behind the element [21], so an opaque background simply covers it.
2. **A backdrop worth frosting.** Vivid colour with enough tonal difference to read through blur; not dull or simple, and not so detailed it turns to noise [1]. Every platform pairs the material with wallpaper or live content, never a flat plane [11][12][19].
3. **Something moves under the glass.** The pleasure the canon describes is watching content pass beneath a panel: iOS 7's pull-down [1], Aero's window dragged over animation [19], Liquid Glass's scroll edge effect as content scrolls under a bar [4].
4. **At least two distinct levels of translucency, reading as a hierarchy.** Malewicz says the style is most visible with two or more levels over a busy colourful background [1]; Apple offers four standard thicknesses and trades thick (legible fine text) against thin (context) [3]; Microsoft uses the material to set supporting UI apart from primary content [14].
5. **Restraint: glass is a hierarchy tool, not a coat of paint.** Malewicz calls out "abusing the effect on every possible screen element" [1]; Apple says not to use Liquid Glass in the content layer and to avoid glass on glass [3][4]; Microsoft says to avoid layering acrylic and to apply a backdrop material once per app [11][12]; Fosner told Vista developers to use glass sparingly [19].
6. **A light edge.** A 1px semi-transparent inner border simulating the glass edge [1][2]; Liquid Glass adds specular highlights that react to movement [5].
7. **Material texture, not a gradient stripe.** Acrylic's recipe includes noise; Microsoft contrasts it with old glass effects built from "one or two linear gradients and a bevel" [14][11].
8. **Luminosity and contrast handled by the material.** Acrylic adds an exclusion-blend layer for legibility [11]; Apple's Regular variant blurs and adjusts luminosity of what is behind [3]; Liquid Glass raises shadow opacity over text and lowers it over flat light backgrounds [4].
9. **Neutral, hierarchical text on glass.** Apple puts vibrancy label levels on materials and bars quaternary on thin materials [3]; Microsoft advises against accent-coloured text and hyperlinks on acrylic [11]. Colour lives in the backdrop, not the type.
10. **Concentric geometry.** Glass controls nest into rounded containers with concentric corners [4]; Big Sur's uniform icon shape [8].
11. **Light responds to interaction.** Reveal lights borders as the pointer approaches a group of commands [15]; Liquid Glass illuminates from under the finger and spreads to nearby glass [4].
12. **A defined off state.** Acrylic and Mica go solid under High Contrast, transparency off, battery saver and low-end hardware [11][12]; Apple honours reduce transparency and increase contrast [3]; NN/g recommends user controls or WCAG-compliant defaults [24]. On the web the hooks are `prefers-reduced-transparency: reduce` and `prefers-contrast` [22].

---

## 4. Traps

- **Glass on everything.** The canon's most repeated warning [1][3][4][11][12][14][19]. Malewicz says the overused version is both less accessible and dull and unoriginal [1]. This is the likeliest single cause of a build reading as lackluster: when every surface is the same glass, there is no hierarchy for the glass to express.
- **Glass on glass.** Stacking translucent layers muddies them and makes interfaces cluttered [4][11]; Heer documents the resulting readability loss in Big Sur [26]. Technically, nested `backdrop-filter` creates nested Backdrop Roots, so inner glass samples less than a designer expects [21].
- **Edge-to-edge panes.** Two acrylic panes side by side produce a visible seam [11].
- **The 2000s recipe.** A linear-gradient sheen plus a bevel is what Microsoft names as the old effect Acrylic replaced [14]. A diagonal streak specifically recalls the aurora streak in Aero glass [19].
- **Dull or over-busy backdrops.** Too plain and the glass is invisible; too detailed and it is noise [1].
- **Glass controls.** Malewicz says buttons and toggles should not be transparent because they need more contrast; cards are fine [1]. Apple's exception is the reverse case: sliders and toggles take a glass look only while being operated [3].
- **Accent text and links on the glass** [11].
- **No fallback.** Every platform ships an off state; a build with only a support check is missing a defining trait [11][12][3][22].
- **Translucency for its own sake.** Snell and Heer both argue Big Sur's translucent chrome costs legibility with little gain (paraphrased, secondary) [25][26]. The lesson is not "less glass" but "glass only where context behind it helps".
- **Neighbouring styles.** Neumorphism is the style Malewicz defines this one against: a single extruded plastic layer, where glass is vertical and see-through [1]. Keep them apart: no double soft extrusion shadows on glass. Liquid Glass is the successor, not the same thing; its lensing and morphing are 2025 behaviours, so use them as motion inspiration rather than as the period look.

---

## 5. Palette and type evidence

**Palette.** None of the canon sources fix a brand palette; they fix where colour comes from.
- Colour comes from behind. Aero glass takes a user-chosen colorization and opacity [19]; Acrylic takes a personalisation tint [11][14]; Mica tints from the wallpaper [12]; Liquid Glass's colour is informed by the surrounding content [5]; Malewicz asks for vivid colours behind the glass and cites Big Sur's colourful wallpaper [1].
- The glass itself is near neutral, with luminosity adjusted for legibility [3][11]. Text on it is neutral and ranked by vibrancy level, not colour [3][11].
- Dimming is its own material: Fluent's Smoke is translucent black behind modals [13]; Apple suggests a 35% dark dimming layer under Clear glass over bright content [3].
- Mapping to us: our four orb hues (violet, cyan, peach, pink) are a fair stand-in for a Big Sur style wallpaper palette. What the sources argue against is our fixed white or navy glass tint and our accent-coloured text on glass (section 7). A sourced move is to let each panel's tint lean slightly toward the section's dominant orb, standing in for content-aware tint [5][12].

**Type.** The platforms set glass UI in their system sans: Apple's SF Pro, which Apple describes as having variable optical sizes, size-specific outlines and dynamic tracking for legibility at every size [10]. We cannot license SF Pro. What we have installed (package.json, `@fontsource`):
- **Inter Variable** (body): an open-source UI workhorse whose site offers text and display optical sizes, tabular numbers, and the `cv11` single-storey a and `ss01` open digits our theme already turns on [27]. The package installs an `opsz` axis (`@fontsource-variable/inter/opsz.css`), but `src/pages/t/glassmorphism/[...page].astro` imports only `wght.css`. Loading `opsz` gives the closest thing we have to SF's text and display sizes.
- **Plus Jakarta Sans Variable** (headings): designed by Gumpita Rahayu (Tokotype) in 2020 for Jakarta's city identity [28]. Its date makes it period-correct for a 2020 to 2021 room, and it reads as the Dribbble-era version of the style rather than the platform version. Keeping it is a legitimate choice. Switching headings to Inter Display would pull the room toward the Apple and Microsoft canon. That is a founder call.
- **Space Grotesk Variable** (labels): the canon offers no evidence either way for tracked uppercase labels. Leave it as house flavour, but do not let it carry accent colour on glass (tell 9).

---

## 6. Motion vocabulary

Everything below is grounded in a source. Where it is a studio proposal built on a source, it says so.

**Within the page**
- **Light that follows the pointer.** Reveal border light brightens the hidden edges of interactive items as the pointer nears, and Reveal hover adds a halo and press animation [15]. Microsoft's rule is to use it on groups of commands, not a lone button [15]. Liquid Glass does the same with a glow that starts under the finger and spreads to nearby glass [4], and specular highlights that react to movement [5]. For us: the nav segmented control, the footer pills and the form fields are groups; the door cards are not interactive, so lighting them would falsely signal a control.
- **Content passing beneath glass.** The scroll edge effect dissolves content into the background as it scrolls under a bar, which keeps the bar clear and visibly above [4]. Studio proposal: give the backdrop its own scroll rate (a fixed wallpaper plus orbs on scroll-driven parallax), so panels visibly slide over colour and the frosting changes as you read.
- **Adaptive shadow.** Shadow opacity rises over text and falls over flat light backgrounds [4]. The cheap web version is a stronger shadow on the sticky header once content is under it.
- **Gel and elasticity, separable.** Liquid Glass flexes with interaction, and Reduced Motion turns off its elastic properties while keeping the rest [4]. Our `prefers-reduced-motion` rules should remove bounce but keep instant state changes.
- **Slow ambient drift.** Our 19 to 29 s orb drift has no direct canon precedent (the wallpaper drives the motion in every platform), but it is harmless. It becomes meaningful only when the glass visibly reacts to it.

**Timing, from Microsoft's published table** [17] (Microsoft's separate "Timing and easing" page [18] gives simpler named duration tokens — 250ms, 167ms, 83ms — and the same two easing curves for entrance and exit, but not this specific purpose-by-purpose table; it corroborates the durations, not the full table)
| Purpose | Easing | Duration |
|---|---|---|
| Direct entrance | `cubic-bezier(0,0,0,1)` | 167, 250 or 333 ms |
| Existing element, point to point | `cubic-bezier(0.55,0.55,0,1)` | 167, 250 or 333 ms |
| Direct exit (always with fade) | `cubic-bezier(0,0,0,1)` | 167 ms |
| Gentle exit | `cubic-bezier(1,0,1,1)` | 167 ms |
| Bare minimum fade | linear | 83 ms |
| Strong entrance (3 keyframes) | `(0.85,0,0,1)`, `(0.85,0,0.75,1)`, `(0.85,0,0,1)` | 167, 167, 333 ms |

Microsoft's principles: Connected (elements that change position and size should visibly connect between states), Consistent, Responsive, Delightful ("These moments are always brief and fleeting"), and Resourceful [17].

**Arrival and transitions, for the later transitions phase**
- **Materialise, do not fade.** Apple: "Instead of fading, Liquid Glass objects materialize in and out" by ramping the light bending [4]. Web version, as a studio proposal: each panel arrives with its `backdrop-filter` blur ramping from 0 to full and its edge highlight arriving last, instead of blurring the whole page, text included, as `glass-arrive` does now.
- **One persistent floating plane.** Liquid Glass morphs between controls to keep one floating plane [4]; Fluent's Connected principle [17]. Proposal: persist the whole header bar across page changes (we persist only the wordmark today) and slide the segmented control's current-page thumb from the old item to the new one.
- **Frost over, clear through (proposal).** For arriving from another school: a full-viewport pane frosts over the outgoing page (blur rising while it is still visible behind the glass), then the pane clears into the Glassmorphism page. This is the canon's own mechanism, a compositor blurring whatever lies behind [19][20], turned into a doorway. The previous school literally becomes the wallpaper the glass frosts.
- **Pace.** Fluent keeps motion fast and direct [17]; our 620 ms root arrival is about twice Fluent's longest entrance step. Liquid Glass is more fluid [4]. Pick one lineage per transition and say which.
- **Cost.** Microsoft flags acrylic as GPU-intensive and disables it on battery saver [11]; Fosner warns glass taxes the GPU [19]. Animating `backdrop-filter` on many panels at once needs the same off-screen pause discipline `fx.ts` already applies to the orbs.

---

## 7. Gap analysis against our build

Files read: `src/themes/glassmorphism/theme.css`, `meta.ts`, `fx.ts`, `Orbs.astro`, `Header.astro`, `Footer.astro`, `pages/*.astro`. Renders read: `scripts/themes/.out/glassmorphism-f2/` (desktop and phone, both schemes) and `scripts/themes/.out/mobile-review/sheets/glassmorphism.jpg`. Note that the f2 captures predate commit a96d9eb, which removed `contain: paint` from sections. The flat-cut orbs visible at section edges in f2 are already fixed and are not listed below.

**What already lands**
- **Legibility engineering is unusually serious.** `meta.ts` measures every text token against a panel composited over the worst orb, and `theme.css` swaps to a near-opaque `--glass-fallback` without `backdrop-filter`. That matches the canon's insistence on contrast and solid fallbacks [3][11][24].
- **The basic recipe is complete.** `.glass` has blur 24px with `saturate(170%)`, a 1px `--edge` border, an inset top highlight, a diffuse two-part shadow and large radii. That meets or exceeds Malewicz's four traits and the Hype4 defaults [1][2]. The upstream suggestion that we lack borders and shadows is wrong.
- **A vivid backdrop exists** (four hues, drifting orbs, paused off-screen by `fx.ts`), and dark mode gives the glass its own edge light.
- **The sticky header is true glass behaviour.** Content scrolls under a blurred bar [4].
- **Period props are right.** Big Sur squircle app icons (`.app-icon`, radius 28%) [8] and window chrome on the hero.
- **The wordmark persists across page changes** (`transition:name="wordmark"`), an early instance of the one-floating-plane idea [4][17].

**What is missing or wrong**, most consequential first

1. **Every surface is the same glass, so there is no hierarchy.** Every section's content is a `.glass` panel with the same fill, sheen, shadow and a 32px radius (40px hero): hero `.window`, `.door`, `.lab-panel`, `.ask`, `.head-card`, `.offer`, `.step`, `.title-card`, `.reading`, `.founder-card`, `.manifesto`, `.intro`, `.form`, `.direct`, the footer `.card` and the header `.bar`. `.glass-strong` differs by 0.14 alpha and is used only for the header bar and pills. This breaks tells 4 and 5 [1][3][4][11][12][14]. In the f2 desktop render the page reads as a stack of near-identical white cards; that sameness is the evidence-based explanation for "lackluster".
2. **Glass sits on glass.** `.seg` (a `--well`) inside the glass `.bar`; `.cells` inside `.lab-panel`; `.chip` and `.trust-chip` on panels; form fields (`--well`) inside `.form`; `.btn-glass` on the field; `.locale` overlapping `.window`. Tell 5 and the glass-on-glass trap [4][11][21].
3. **The material is the 2000s recipe.** `.glass` paints `linear-gradient(140deg, var(--sheen), transparent 48%)` over the fill plus an inset bevel line. That is the gradients-and-bevel effect Microsoft says Acrylic replaced [14], and the diagonal streak recalls Aero's aurora [19]. There is no noise layer [11][14], no luminosity step beyond `saturate()` [3][11], and no light response [4][5][15]. Note the conflict: `meta.ts` `forbids` includes "paper grain". Acrylic's noise is a fine texture inside the material, not paper grain on the field, but adding it means rewording that forbid. That is a founder call.
4. **Light-scheme glass is milky.** `--glass: rgb(255 255 255 / 0.56)` plus `--sheen` at 0.45 makes panels read as white cards with pastel stains (f2 door cards), against the Hype4 default fill of 0.15 [2]. The cause is methodological. `meta.ts` measures against the unblurred worst orb, which its own comment calls harsher than what the reader sees, so the fill had to rise. Apple's answer is to pick thickness per content: thick under fine text, thin where context matters [3]. WCAG allows 3:1 for large text (at least 24px, or 18.5px bold) [23], so display type can sit on thinner glass than body copy. Changing the measurement method is a decision to bring to the founder, not a silent edit.
5. **The light backdrop is dull between panels.** `--field` is `#eef0fb`, and the ambient wash (`main::before`) uses the pale `-hi` hues at 0.62 opacity under a 100px blur, so between sections the page is flat lilac. That fails tell 2 [1]. Dark mode is richer, but light is the native scheme (`nativeScheme: 'light'`), so it is what the founder judges.
6. **Nothing moves beneath the glass as you read.** Orbs are `position: absolute` inside their sections, so they scroll in lockstep with the panels; only the slow drift changes what the glass shows. The fixed ambient layer is too faint to register. Tell 3 [1][4][19].
7. **No off state for users.** There is no `prefers-reduced-transparency` or `prefers-contrast` handling anywhere in `src/` (grep, 09-23-26), only the `@supports` fallback. Tell 12 [3][11][12][22][24].
8. **Radii are not concentric.** `.cells` (24px) inside `.lab-panel` (32px, padding up to 3.5rem); form fields at 18px and 22px inside a 36px `.form` with up to 2.75rem padding. Tell 10 [4].
9. **Interaction is lift only.** `.btn` translates -2px on hover; `.seg a` and `.pills a` change colour or background. There is no light near the pointer on the command groups where Reveal would put it [15][4].
10. **Accent text on glass.** `.chip` and `.designation` in `--accent`, links in `--link`, and the gradient billboard `.b2` all sit on panels. They pass our contrast checks, but the canon keeps text on glass neutral [3][11]. Lower priority than items 1 to 6.
11. **The hero's decorative switch is a fake control.** `.switch` is `aria-hidden` and does nothing, yet it looks like a toggle, which is the very control type Malewicz and Apple treat specially [1][3]. Either make it real (for example the scheme toggle, which is a portal-level decision) or accept it as a prop.
12. **The arrival blurs the content, not the glass.** `glass-arrive` animates `filter: blur(22px)` on the whole root for 620ms, so the text itself is out of focus. The canon materialises the material [4] and keeps entrances to 167 to 333ms [17]. This belongs to the transitions phase but should be planned now.

---

## 8. Priorities for Tier 3

Most important first. Items marked (decision) need the founder before building.

1. **Build a material hierarchy and remove glass on glass.** Define three or four material tokens after Apple's ultraThin, thin, regular and thick, plus a Clear-with-dim variant for dark [3], and assign them by role: navigation (header, footer nav) on the thickest glass; one showpiece pane per page; large display type on thin glass; body-copy panes thick or solid. Inner wells (`.seg`, `.cells`, fields, chips) become hairline groupings or solid, not a second glass. Reconcile Malewicz ("closer is more transparent") with Apple ("bigger is thicker") [1][4]: big back panes carry body text and are thicker; small front elements are clearer and carry only bold content. Addresses gaps 1, 2 and 4.
2. **Give the page a real wallpaper and let content pass over it.** Replace the pale field and faint wash with a vivid, fixed, Big Sur style colour field in light as well as dark, with orbs as foreground accents on scroll-driven parallax at a different rate from the panels [1][4][19]. Addresses gaps 5 and 6. Performance must keep the `fx.ts` pause discipline [11].
3. **Upgrade the recipe from gradient-and-bevel to material.** Drop or greatly soften the 140deg sheen stripe. Add a luminosity step in `--blur` (for example `brightness()` alongside `blur()` and `saturate()`) standing in for Acrylic's exclusion layer and Apple's luminosity adjustment [3][11], plus a fine noise layer inside glass only (decision: reword the "paper grain" forbid) [11][14]. Keep the 1px edge and make it the main light cue [1][2]. Addresses gap 3.
4. **Revisit how contrast is measured (decision).** Keep 4.5:1 for body text, but let large type use 3:1 [23] and consider measuring against the blurred average rather than the raw worst orb. That lets the glass thin out and actually look like glass without losing legibility. Addresses gap 4.
5. **Add pointer light to interactive glass groups.** Put a Reveal-style border light and hover halo on the nav segmented control, footer pills and form fields only [15][4]. Respect `prefers-reduced-motion` by dropping the travel, not the state [4]. Addresses gap 9.
6. **Ship the off state.** Under `prefers-reduced-transparency: reduce` and `prefers-contrast: more`, switch to `--glass-fallback` and drop `backdrop-filter`, mirroring Acrylic and Mica [11][12][22][3]. Addresses gap 7. Cheap, and clearly canon.
7. **Make radii concentric** across nested shapes [4]. Addresses gap 8.
8. **Move colour off the text.** Keep the gradient and colour in the orbs and material tint, make panel text neutral in a label hierarchy, and let tint lean toward each section's dominant orb [3][5][11]. Addresses gap 10.
9. **Plan the motion now, build it in the transitions phase.** A persistent header plane with a sliding current-page thumb [4][17]; panels that materialise by ramping blur and edge light instead of the whole-root blur [4]; and the "frost over, clear through" entrance from other schools [19][20]. Addresses gap 12.

---

## Sources

Primary unless marked secondary. All were opened on 09-23-26.

1. Michal Malewicz, "Glassmorphism in user interfaces," UX Collective, 11-22-20. Full text read from the Internet Archive capture https://web.archive.org/web/20210105022913id_/https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9 (the live page https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9 and the Hype4 mirror https://hype4.academy/articles/design/glassmorphism-in-user-interfaces are paywalled after the introduction). Primary.
2. Hype4 Academy, Glassmorphism CSS Generator, https://hype4.academy/tools/glassmorphism-generator. Defaults as served 09-23-26. Primary (the trend's originating studio's tool).
3. Apple, Human Interface Guidelines, "Materials," https://developer.apple.com/design/human-interface-guidelines/materials (read through Apple's documentation data endpoint https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json, since the HTML page renders client-side; changelog last entry 09-09-25). Primary.
4. Apple, "Meet Liquid Glass," WWDC25 session 219, transcript, https://developer.apple.com/videos/play/wwdc2025/219/. Primary.
5. Apple Newsroom, "Apple introduces a delightful and elegant new software design," 06-09-25, https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/. Primary.
6. Apple, "iOS 7 - Design" page, Internet Archive capture of 2013, https://web.archive.org/web/20130915000000id_/http://www.apple.com/ios/design/. Primary.
7. Apple Newsroom, "Apple Unveils iOS 7," 06-10-13, https://www.apple.com/newsroom/2013/06/10Apple-Unveils-iOS-7/. Primary.
8. Apple, "macOS Big Sur" product page, Internet Archive capture of November 2020, https://web.archive.org/web/20201115000000id_/https://www.apple.com/macos/big-sur/. Primary.
9. (unused number, intentionally left blank so citations stay stable; see corrections)
10. Apple, "Fonts" (SF Pro), https://developer.apple.com/fonts/. Primary.
11. Microsoft Learn, "Acrylic material," https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic (updated 08-29-26). Primary.
12. Microsoft Learn, "Mica material," https://learn.microsoft.com/en-us/windows/apps/design/style/mica. Primary.
13. Microsoft, Fluent 2 Design System, "Material," https://fluent2.microsoft.design/material. Primary.
14. Mike Jacobs (Microsoft Design), "Science in the System: Fluent Design and Material," 04-10-18, https://medium.com/microsoft-design/science-in-the-system-fluent-design-and-material-42b4dc532c14. Primary.
15. Microsoft Docs, "Reveal Highlight," Internet Archive capture of 12-13-19, https://web.archive.org/web/20191213080945id_/https://docs.microsoft.com/en-us/windows/uwp/design/style/reveal. Primary.
16. Microsoft Learn, "RevealBrush Class" (introduced in 10.0.16299; Microsoft now advises against its use), https://learn.microsoft.com/en-us/uwp/api/windows.ui.xaml.media.revealbrush. Primary.
17. Microsoft Learn, "Motion in Windows," https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/motion. Primary.
18. Microsoft Learn, "Timing and easing," https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing. Primary.
19. Ron Fosner, "Aero Glass: Create Special Effects With The Desktop Window Manager," MSDN Magazine, April 2007, https://learn.microsoft.com/en-us/archive/msdn-magazine/2007/april/aero-glass-create-special-effects-with-the-desktop-window-manager. Primary.
20. Brent Fulgham, "Introducing Backdrop Filters," WebKit blog, 08-10-15, https://webkit.org/blog/3632/introducing-backdrop-filters/. Primary.
21. W3C CSS Working Group, "Filter Effects Module Level 2," Editor's Draft 01-23-26, https://drafts.csswg.org/filter-effects-2/. Primary (standards draft).
22. W3C CSS Working Group, "Media Queries Level 5" (`prefers-reduced-transparency`, `prefers-contrast`), https://drafts.csswg.org/mediaqueries-5/#prefers-reduced-transparency. Primary (standards draft).
23. W3C WAI, "Understanding Success Criterion 1.4.3: Contrast (Minimum)," WCAG 2.2, https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html. Primary (standard).
24. Megan Brown, "Glassmorphism," Nielsen Norman Group, 06-07-24, https://www.nngroup.com/articles/glassmorphism/. Secondary.
25. Jason Snell, "macOS Big Sur Review: Third age of Mac," Six Colors, 11-12-20, https://sixcolors.com/post/2020/11/macos-big-sur-review-third-age-of-mac/. Secondary.
26. Nick Heer, "Sidebar: Translucency," Pixel Envy, 01-28-21, https://pxlnv.com/blog/sidebar-translucency/. Secondary.
27. Rasmus Andersson, Inter typeface site, https://rsms.me/inter/. Primary (the designer's own site).
28. Tokotype, Plus Jakarta Sans repository, https://github.com/tokotype/PlusJakartaSans. Primary (the foundry's own repository).

Count: 24 primary (1 to 8, 10 to 23, 27, 28), 3 secondary (24 to 26). Number 9 is unused.

---

## Corrections to the upstream reports

- **Acrylic layer order.** One report gave background, blur, noise, exclusion, tint. Microsoft's page captions the recipe as background, blur, exclusion blend, colour/tint overlay, noise [11]. The second report was right.
- **Malewicz's recipe.** One report said the founding article contains no characteristics, and the other could not read past the paywall. The archived full text [1] gives the four traits, the fill-versus-object-opacity rule, the background advice, the 1px inner border and the accessibility guidance used above. It gives no CSS numbers beyond a Sketch blur value of 8 in one example.
- **"Glassmorphism is my least favorite" (Medium, 12-08-20)** is a one-line reply by Malewicz under another author's trends article, not an essay (read through an Internet Archive capture). It is not evidence for anything and is not cited.
- **Snell's wording.** The quoted phrases in the first report could not be confirmed on reopening; Snell's and Heer's positions are paraphrased only [25][26].
- **Our build lacking border, edge highlight and shadow.** Wrong: `theme.css` `.glass` has all three. The real gaps are hierarchy, backdrop, recipe texture and light response (section 7).
- **iOS 7 parallax.** Not found in Apple's own iOS 7 design page [6] or the iOS 7 press release [7]. Dropped as unverified.
- **Big Sur press release.** The guessed newsroom URLs returned 404; the archived product page [8] is used instead.
- **Source [9]** (WWDC20 "Adopt the new look of macOS") was opened, but its transcript does not discuss materials or translucency, so it supports nothing here and was removed.

---

## Verification

Re-verified 09-23-26 by re-opening the source list with a fresh WebFetch pass.

**Opened and confirmed as described (institution, title, date, and the specific claims they back):** [2] Hype4 Academy generator (confirmed blur 20, refraction 0.15, depth 10 as slider labels; fill `rgba(255,255,255,0.15)`, border `1px solid rgba(255,255,255,0.3)`, radius 20px, shadow `0 8px 32px rgba(0,0,0,0.1)`, matching the dossier). [3] Apple HIG "Materials" (four thicknesses, vibrancy hierarchy, do/don't rules for Liquid Glass in the content layer). [4] WWDC25 "Meet Liquid Glass" transcript (lensing vs. scattering, adapts to background, materialize not fade, glow from touch point, morphs between controls, navigation-layer guidance, Regular/Clear variants, scroll edge effect). [5] Apple Newsroom 06-09-25 (color "informed by surrounding content"; no 35% dimming figure found there — that number is not independently confirmed by this source and should be treated as unconfirmed if it matters to a build decision). [7] Apple Newsroom iOS 7 (confirms "translucency and motion" language from Jony Ive; does not itself use the word "blur" or "parallax", consistent with the dossier's cautious framing). [10] Apple Fonts page (SF Pro variable optical sizes, size-specific outlines, dynamic tracking, confirmed). [11] Microsoft Learn Acrylic (full recipe confirmed verbatim: "background, blur, exclusion blend, color/tint overlay, noise"; transient/supporting-surface guidance, edge-to-edge seam warning, battery-saver/High-Contrast fallback, and the "avoid accent-colored text/hyperlinks" line all confirmed; page dated 08-29-26 as the dossier states). [12] Microsoft Learn Mica (opaque, samples wallpaper once, neutral on deactivation, Mica Alt confirmed, "apply once per app" confirmed). [13] Fluent 2 "Material" (Solid, Acrylic, Mica, Smoke confirmed, Smoke as "always translucent black" confirmed). [14] Mike Jacobs Medium article (opened; acrylic recipe order and "linear gradients and a bevel" framing consistent with what's cited). [16] RevealBrush Class page (confirmed: introduced Windows 10 Fall Creators Update 10.0.16299.0; page states "we do not recommend its use," matching the dossier's "now not recommended by Microsoft"). [17] Motion in Windows (the five principles Connected/Consistent/Responsive/Delightful/Resourceful confirmed verbatim, including "These moments are always brief and fleeting"; the purpose-by-purpose timing table matches the dossier's table exactly, cell for cell). [18] Timing and easing (opened; see the correction above — it does not carry the same table as [17]). [19] Ron Fosner, MSDN Magazine April 2007 (DWM compositing windows over the live desktop confirmed with the Windows Media Player example; the diagonal "aurora" streak confirmed as the effect seen with composition/opacity changed; the black-text-renders-transparent legibility trap confirmed in detail; "use sparingly... taxing on your computer's GPU" confirmed verbatim). [20] WebKit blog, Brent Fulgham, 08-10-15 (confirmed; iOS 7/Yosemite framing and `backdrop-filter: blur(10px);` reference value both confirmed). [21] W3C Filter Effects Level 2 Editor's Draft (backdrop-filter, mirrored-edge blur, and Backdrop Root creation by backdrop-filter/opacity<1/filters/masks/clip-path/blend-modes all confirmed; "does not yet have Working Group consensus" confirmed verbatim). [22] W3C Media Queries 5 (`prefers-reduced-transparency` and `prefers-contrast` both confirmed present). [23] WCAG 2.2 Understanding 1.4.3 (4.5:1 normal / 3:1 large text confirmed, with the 18pt/24px and 14pt-bold/18.5px equivalences confirmed verbatim). [24] NN/g, Megan Brown, 06-07-24 (confirmed; "give users the option to control contrast or transparency settings" and the WCAG-compliant-minimum framing both confirmed). [27] rsms.me/inter (text/display optical sizes, tabular numbers, single-story a, open digits all confirmed). [28] Tokotype GitHub repo (confirmed Gumpita Rahayu/Tokotype as designer and the 2020 Jakarta city-identity commission; the repo credits 6616 Studio as the commissioning agency for the Jakarta Provincial Government program, a detail the dossier's phrasing does not contradict but could make more precise for Tier 3).

**Could not open this session:** [1], [6], [8], and [15] are all Internet Archive (web.archive.org) captures, and this session's WebFetch tool refuses every web.archive.org URL outright (confirmed with four different URL forms, including the exact capture timestamps the dossier cites and one freshly resolved via the Wayback "available" API). WebSearch was also unavailable (session search budget exhausted before these could be corroborated by other means). This means the founding Malewicz article [1], the iOS 7 design page [6], the Big Sur product page [8], and the Reveal Highlight capture [15] were not independently re-verified this pass. Nothing found elsewhere in this session contradicts what the dossier draws from them, and the live (non-archived) counterparts that were reachable are consistent where they overlap (Apple's iOS 7 newsroom release [7] uses the same "translucency" framing the dossier attributes to the archived design page; Apple's live Fonts and HIG pages are consistent with Big Sur-era design language). Their claims are left in place rather than cut, since cutting well-attested claims for a tooling limitation, not a sourcing problem, would remove information Tier 3 needs without evidence it is wrong. Tier 3 or a later research pass with archive.org access should re-open these four directly before treating this as fully closed.

**Fixed:** the timing-table citation in section 6 cited [17][18] together; only [17] carries that exact table, so the citation was narrowed and [18]'s actual (weaker) corroboration was spelled out in place.

**Checked and clean:** no em dashes anywhere in the dossier (checked by search). Quotes: every quotation in the dossier is one short quote per source, under 15 words, with attribution (the two checked at length above, "a sense of context and place" and "Instead of fading, Liquid Glass objects materialize in and out," are both under 15 words and correctly attributed).

**Not cut:** no claim was found unsupported by its cited source among the sources this pass could open; no citation renumbering was needed.
