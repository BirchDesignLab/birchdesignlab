// One-off: rewrite the 6 and 4 placements in proof.css so every division hangs
// blocks from at least one line the others lack (fix round 1, critic C1).
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'scripts/themes/proofs/stage6-swiss-p3/proof.css';
let s = readFileSync(f, 'utf8');
const cut = (a, b, rep) => {
  const i = s.indexOf(a), j = s.indexOf(b);
  if (i < 0 || j < 0 || j < i) throw new Error('marker ' + a);
  s = s.slice(0, i) + rep + s.slice(j);
};
cut('/* ---- Hero', '/* ---- Doors', `/* ---- Hero ----------------------------------------------------------------
   The billboard is the page's giant and spans the frame in every programme.
   The lede drops to its own row under it and hangs from column 2: that is the
   line at 1/2, 1/3, 1/4 or 1/6 of the sheet, so each division puts it
   somewhere the others do not. (It no longer sits beside the name at six: the
   name's widest cut would meet it at 1024, as the dial's cap shows.) */
@media (min-width: 640px) {
  html[data-p3] .hero .lede { grid-row: 2; grid-column: 2 / -1; }
}
@media (min-width: 1024px) {
  html[data-p3] .hero .billboard { align-self: start; }
}

`);
cut('/* ---- Doors', '/* ---- Lab', `/* ---- Doors ---------------------------------------------------------------
   Lines each division has that no other has: 2 none (its 1/2 is also 4's and
   6's middle), 3 its 1/3 and 2/3 (6 shares them), 4 its 1/4 and 3/4, 6 its 1/6
   and 5/6. So 4 hangs from 1/4 and 3/4, 6 from 1/6 and 5/6. */
@media (min-width: 640px) {
  html[data-p3] .doors { grid-template-rows: none; grid-auto-rows: auto; }
  html[data-p3] .doors .door { padding-block: 0; }

  html[data-p3='2'] .doors .kicker { grid-column: 1 / -1; grid-row: 1; }
  html[data-p3='2'] .doors .door:nth-child(1) { grid-column: 1; grid-row: 2; }
  html[data-p3='2'] .doors .door:nth-child(2) { grid-column: 2; grid-row: 2; }
  html[data-p3='2'] .doors .more { grid-column: 2; grid-row: 3; }

  html[data-p3='3'] .doors .kicker { grid-column: 1; grid-row: 1; }
  html[data-p3='3'] .doors .door:nth-child(1) { grid-column: 2; grid-row: 1; }
  html[data-p3='3'] .doors .door:nth-child(2) { grid-column: 3; grid-row: 1; }
  html[data-p3='3'] .doors .more { grid-column: 3; grid-row: 2; }

  html[data-p3='4'] .doors .kicker { grid-column: 1 / -1; grid-row: 1; }
  html[data-p3='4'] .doors .door:nth-child(1) { grid-column: 2 / 4; grid-row: 2; }
  html[data-p3='4'] .doors .door:nth-child(2) { grid-column: 4; grid-row: 2; }
  html[data-p3='4'] .doors .more { grid-column: 4; grid-row: 3; }

  html[data-p3='6'] .doors .kicker { grid-column: 1; grid-row: 1; }
  html[data-p3='6'] .doors .door:nth-child(1) { grid-column: 2 / 4; grid-row: 1; }
  html[data-p3='6'] .doors .door:nth-child(2) { grid-column: 5 / 7; grid-row: 1; }
  html[data-p3='6'] .doors .more { grid-column: 6; grid-row: 2; }
}
@media (max-width: 639.98px) {
  /* Two columns: the doors side by side. Three: stacked, hung from column 2
     (1/3). Six: stacked, hung from column 2 (1/6). Four is the page as built. */
  html[data-p3='2'] .doors .door:nth-child(1) { grid-column: 1; grid-row: 2; }
  html[data-p3='2'] .doors .door:nth-child(2) { grid-column: 2; grid-row: 2; border-top: 0; padding-top: 0; }
  html[data-p3='2'] .doors .door:last-child { padding-bottom: calc(var(--u) * 2); }
  html[data-p3='2'] .doors .more { grid-column: 2; grid-row: 3; }
  html[data-p3='3'] .doors .door,
  html[data-p3='3'] .doors .more { grid-column: 2 / -1; }
  html[data-p3='6'] .doors .door,
  html[data-p3='6'] .doors .more { grid-column: 2 / -1; }
}

`);
cut('/* ---- Lab', '/* ---- Closer', `/* ---- Lab (the black sheet) ----------------------------------------------- */
html[data-p3] .lab { align-items: first baseline; }
@media (min-width: 640px) {
  html[data-p3='2'] .lab-kicker { grid-column: 1 / -1; grid-row: 1; }
  html[data-p3='2'] .lab .pull { grid-column: 1 / -1; grid-row: 2; margin-top: calc(var(--u) * 2); }
  html[data-p3='2'] .lab .designation { grid-column: 1; }
  html[data-p3='2'] .lab .summary { grid-column: 2; }
  html[data-p3='2'] .lab .lab-more { grid-column: 2; }

  html[data-p3='3'] .lab-kicker { grid-column: 1; grid-row: 1; }
  html[data-p3='3'] .lab .pull { grid-column: 2 / -1; grid-row: 1; margin-top: 0; }
  html[data-p3='3'] .lab .designation { grid-column: 1; }
  html[data-p3='3'] .lab .summary { grid-column: 2 / -1; }
  html[data-p3='3'] .lab .lab-more { grid-column: 3; }

  html[data-p3='4'] .lab-kicker { grid-column: 1 / -1; grid-row: 1; }
  html[data-p3='4'] .lab .pull { grid-column: 2 / -1; grid-row: 2; margin-top: calc(var(--u) * 2); }
  html[data-p3='4'] .lab .designation { grid-column: 1; }
  html[data-p3='4'] .lab .summary { grid-column: 2 / 4; }
  html[data-p3='4'] .lab .lab-more { grid-column: 4; }

  html[data-p3='6'] .lab-kicker { grid-column: 1; grid-row: 1; }
  html[data-p3='6'] .lab .pull { grid-column: 2 / -1; grid-row: 1; margin-top: 0; }
  html[data-p3='6'] .lab .designation { grid-column: 1; }
  html[data-p3='6'] .lab .summary { grid-column: 2 / 6; }
  html[data-p3='6'] .lab .lab-more { grid-column: 6; }
}
@media (max-width: 639.98px) {
  html[data-p3='2'] .lab .designation { grid-column: 1; }
  html[data-p3='2'] .lab .summary { grid-column: 2; }
  html[data-p3='2'] .lab .lab-more { grid-column: 2; }

  html[data-p3='3'] .lab .summary,
  html[data-p3='3'] .lab .lab-more { grid-column: 2 / -1; }

  html[data-p3='6'] .lab .pull,
  html[data-p3='6'] .lab .summary,
  html[data-p3='6'] .lab .lab-more { grid-column: 2 / -1; }
}

`);
s = s.replace(`  html[data-p3='6'] .closer .closer-lead { grid-column: 1 / 5; grid-row: 1; }
  html[data-p3='6'] .closer .closer-cta { grid-column: 5 / -1; grid-row: 1; align-self: end; }`,
`  html[data-p3='6'] .closer .closer-lead { grid-column: 1 / 6; grid-row: 1; }
  html[data-p3='6'] .closer .closer-cta { grid-column: 6; grid-row: 1; align-self: end; }`);
s = s.replace(`  html[data-p3='6'] .closer .closer-cta { grid-column: 3 / -1; }`, `  html[data-p3='6'] .closer .closer-cta { grid-column: 2 / -1; }`);
writeFileSync(f, s);
