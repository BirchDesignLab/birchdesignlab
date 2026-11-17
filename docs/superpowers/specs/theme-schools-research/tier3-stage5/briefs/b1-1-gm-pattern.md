# B1 task 1: grandmillennial pattern: the toile, the papered walls, aged prints, the lacquer (items 1, 2, 6, 7; F; Tier A calls 1 to 3)

Shared rules: `b1-common.md`. Brief items 1, 2, 6 and 7; decision F.

1. **The toile** (item 1), lifted from `../proofs/gm-toile.md`, replacing
   `#gm-porcelaine` on the Services No. 2 swatch, with two founder changes:
   - **Push the hatching** (call 1): tone from hatching density in the
     canopies, the ground and shadows under each island, the figures'
     clothing and the urn, so it reads as a copperplate engraving rather
     than an outline illustration. Faces stay simple. Keep the islands, the
     bare ground between them and the half-drop. Fix the a1 minors
     (non-uniform scale rounding, the write-up slips are not yours).
   - **External, cached** (call 2): one SVG file per scheme (oxblood on
     `--field` in light, gold on hunter in dark), loaded as a cached URL by
     the swatch and the wall, never inlined in the header.
2. **One papered wall per page** (item 2, F), lifted from
   `../proofs/gm-walls.md`: Contact gets the chintz wall at 0.6 ink layer
   opacity with the stripe band top and bottom; Services gets the toile wall
   at full ink behind the two offerings with a ticking border. About's wall
   is the chinoiserie scene (task 2 builds it; leave About's wall slot to
   task 2). Home keeps its card toppers and Lab band (no new wall). Fix the
   a2 minors where you lift the code (the dark pinstripe that vanishes at
   1.1:1 on the cream stripe: give it an ink that shows in dark).
   - **Phones** (call 3): at 820 and 390 the wall must show as a band around
     and between the cards (side padding and gaps), not slivers.
3. **The lacquered dark room** (item 6): static only: the deeper edge
   vignette, the diagonal specular band on a fixed pseudo-element, the top
   left highlight edge on framed cards and the Lab band. Nothing moves;
   hunter hue unchanged.
4. **Aged prints** (item 7): `--c-*` pattern inks only, about 15 to 25% less
   chroma; static grain inside the pattern ground; a slight registration
   offset between fills and outline; a thin brown outline on chintz motifs;
   two or three rose variants. Text tokens untouched. The 200px
   `#gm-chintz` tile on Home and the card toppers keeps its scale (protect
   item 5).

**Films:** arrival from quiet and an in-school swap (Home to Services,
Services to Contact) at 1440 and 390, both schemes.
