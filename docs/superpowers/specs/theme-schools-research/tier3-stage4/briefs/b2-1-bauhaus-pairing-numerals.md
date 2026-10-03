# B2 task 1: bauhaus pairing, lowercase voice and constructed numerals (E1, E2, E3, F3)

Shared rules: `b2-common.md`. Bauhaus brief items E1, E2, E3 and decision F3.

1. **The Kandinsky pairing true everywhere** (E1): the footer corner becomes a
   red square and a yellow triangle locked to the band's top rule (no blue on
   ink); the lab band a yellow triangle in front of an ink circle; Contact's
   blue circle meets a red square; About's loose circle becomes a small yellow
   triangle and the tree's sun a paper circle; dark `--poster-mark` becomes
   paper (update the comment); the pairing comment made exact.
2. **F3:** the hero eye's yellow stroke becomes neutral (paper or field); the
   About B keeps its red bowl.
3. **One lowercase voice** (E2): no `text-transform: uppercase` on kickers,
   buttons, `.more`, Contact labels or the footer location; hierarchy by
   weight, size, the leading shape and the rule, per the brief's table. Check
   "let's start your project" still holds its slab at 390.
4. **Constructed numerals** (E3), lifted from `../proofs/bauhaus-numerals.md`
   with the founder's answer: **taller, 0.9em** (not the proof's 0.78em), so
   they carry more weight. A shared `src/themes/bauhaus/parts/Numeral.astro`,
   the generator under `scripts/themes/bauhaus/`, numerals assembling with the
   `.asm` machinery and gated by `data-reveal` (add `data-reveal` where the
   proof found none), digits kept for parity and screen readers as the proof
   does, no seams at any size (the proof's overlap rule). BDL designations in
   League Spartan 700 tabular figures. `--font-num` and the Unbounded entry in
   `meta.fonts` go.
