// One-off: rewrite "The four layouts" in swiss-p3.md after fix round 1.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'docs/superpowers/specs/theme-schools-research/tier3-stage6/proofs/swiss-p3.md';
let s = readFileSync(f, 'utf8');
const a = s.indexOf('## The four layouts'), b = s.indexOf('Word parity holds');
if (a < 0 || b < a) throw new Error('markers');
const mid = `## The four layouts

Page heights are of the whole page (as built, 2, 3, 4, 6). 1440: 2476,
2716, 2464, 2680, 2464. 390: 3386, 3709, 3722, 3386, 3506. At 390 four
columns is the page as built (the phone is a four-column sheet already).

**Which lines belong to whom.** Each division's lines, as fractions of the
sheet: 2 has 0, 1/2; 3 has 0, 1/3, 2/3; 4 has 0, 1/4, 1/2, 3/4; 6 has 0,
1/6, 1/3, 1/2, 2/3, 5/6. Adjacent divisions share lines (3 and 6 share 1/3
and 2/3; 2, 4 and 6 share 1/2), so a layout only reads as its own when
blocks hang from the lines that are its own: 4 from 1/4 and 3/4, 6 from 1/6
and 5/6, 3 from 1/3 and 2/3, 2 from 1/2. The placements are chosen that way,
and the left edge of every block is measured per division
(\`w1-t8-edges.mjs\`, \`edges.json\`): at 1440 the lede is at 730, 506, 394, 282
(2, 3, 4, 6), the second door at 730, 954, 1066, 954, the link under the lab
at 730, 954, 1066, 1178. No two divisions share a lede line, and no two
share the closing button's line. The one repeat is the second door at 3 and
at 6 (2/3), which is a line both have; the first door (506 against 282) and
the button tell them apart.

**1440 (the giant spans the frame in all four).**

| | Lede | Doors | Lab sheet | Close |
|---|---|---|---|---|
| 2 | row 2, col 2 (1/2) | kicker over, one door per column | kicker, pull full width; designation col 1, summary col 2, link col 2 | lead full, button col 2 below |
| 3 | row 2, col 2 on (1/3) | kicker col 1, doors cols 2 and 3 (one row) | kicker col 1 beside pull cols 2-3; summary cols 2-3 | lead cols 1-2, button col 3 |
| 4 | row 2, col 2 on (1/4) | kicker over, door cols 2-3, door col 4 (1/4 and 3/4) | kicker over, pull cols 2-4; summary cols 2-3, link col 4 | lead cols 1-3, button col 4 |
| 6 | row 2, col 2 on (1/6) | kicker col 1, doors cols 2-3 and 5-6, link col 6 (5/6) | kicker col 1 beside pull cols 2-6; summary cols 2-5, link col 6 | lead cols 1-5, button col 6 (5/6) |

In every division the lede drops to its own row under the name and hangs
from column 2 ("Design" at 125 is more than half the sheet at 2, 3 and 4,
and at 6 and 1024 its widest cut meets a lede set beside it: round 1 moved
the lede below at 6, so the dial keeps its 125 rest at 1024 and 1440 in all
four divisions, measured). On twelve the page sets the lede beside the name;
that is the one thing the cycle does not show.

**390.** Doors side by side at 2; stacked and hung from column 2 at 3 (1/3,
at 139px) and at 6 (1/6, at 78px); as built at 4. Lede and subline from
column 2 of the division. Lab: designation beside its summary at 2; summary
indented to column 2 at 3 and at 6 (pull too at 6). Close: button from
column 2 in 2, 3 and 6. At 6 a column is about 50px wide, so the indent is
a narrow hang (78px against 139px at 3): the phone is the weakest width for
telling 4 and 6 apart, 4 being as built with everything at the margin and
6 hung in from it.

`;
s = s.slice(0, a) + mid + s.slice(b);
s = s.replace('(`proof.css`, about 130 lines,', '(`proof.css`, about 170 lines,');
s = s.replace('(4) Phone at 6 columns is about 50px a column:\n  everything hangs on a column line but only the indents show it.', '(4) Phone at 6 columns is about 50px a column:\n  everything hangs on a column line but only the indent shows it.');
writeFileSync(f, s);
