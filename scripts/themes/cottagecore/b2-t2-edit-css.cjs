/* Stage 5 B2 task 2: theme.css edits (tokens, cloth, paper, ruled, torn, tape, board).
   Exact-string, one match each. Run: node scripts/themes/cottagecore/b2-t2-edit-css.cjs */
const edit = require('./edit-helper.cjs');
const f = 'src/themes/cottagecore/theme.css';
edit(f, [
/* ---------- light tokens ---------- */
[`  --tape-butter-stripe: rgba(214, 170, 70, 0.3);
  --wood: #c49a6c;`,
`  --tape-butter-stripe: rgba(214, 170, 70, 0.3);
  /* The one indigo thread (D8): an indigo-and-white gingham tape, no text on
     it. Same in both schemes; the one instance sits on the cream hero sheet. */
  --tape-indigo: rgba(236, 238, 248, 0.86);
  --tape-indigo-thread: rgba(58, 74, 140, 0.55);
  --wood: #c49a6c;`],
[`  --press-shadow: drop-shadow(0 1px 1px rgba(58, 42, 31, 0.2));

  --font-display`,
`  /* Pressed flat (brief item 3). A specimen mounted on paper casts nothing
     but a hairline of contact; a sprig lying loose on the cloth keeps a very
     soft contact shadow, so none floats. */
  --press-shadow: drop-shadow(0 1px 2px rgba(58, 42, 31, 0.16));
  --press-shadow-mounted: drop-shadow(0 0.5px 0 rgba(58, 42, 31, 0.12));
  /* The lamp laid over a paper by night (dark only). */
  --paper-lamp: none;

  /* The mounted herbarium sheets (Home hero, About) are boards. In light the
     board is the paper itself; in dark it is a dimmed-cream card. Held at the
     root so meta.contrast can check the pairs in both schemes. */
  --board: var(--paper);
  --board-ink: var(--mark);
  --board-ink-muted: var(--mark-muted);
  --board-accent: var(--accent);
  --board-link: var(--link);

  --font-display`],
/* ---------- dark tokens ---------- */
[`  /* Gingham by lamplight is only a running stitch in the dark cloth. */
  --gingham-ground: #1c251d;
  --gingham-thread: transparent;
  --gingham-texture: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M0 .75h5M9 .75h5M18 .75h5M.75 0v5M.75 9v5M.75 18v5' stroke='%23a9c294' stroke-opacity='.2' stroke-width='1.5'/%3E%3C/svg%3E");`,
`  /* The cloth by lamplight is still a woven check (brief item 5): sage thread
     in both directions over green-black, so the crossings show three tones.
     0.14 (founder call 7): at 0.18 the lit butter note read as sunk into the
     check. A faint diagonal weave stands where the dashed SVG was. */
  --gingham-ground: #1c251d;
  --gingham-thread: rgba(169, 194, 148, 0.14);
  --gingham-texture: repeating-linear-gradient(45deg, rgba(255, 214, 150, 0.035) 0 1px, transparent 1px 4px);
  /* The lamp-lit rim on the valance and hem scallops. */
  --cc-lamp-rim: rgba(255, 214, 150, 0.42);`],
[`  --field-texture: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M0 .75h5M9 .75h5M18 .75h5M.75 0v5M.75 9v5M.75 18v5' stroke='%23f2e5cc' stroke-opacity='.03' stroke-width='1.5'/%3E%3C/svg%3E");`,
`  --field-texture:
    repeating-linear-gradient(0deg, rgba(242, 229, 204, 0.022) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(242, 229, 204, 0.026) 0 1px, transparent 1px 4px);`],
[`  --press-shadow: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
}`,
`  --press-shadow: drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.3));
  --press-shadow-mounted: none;
  --paper-lamp: linear-gradient(165deg, rgba(255, 200, 120, 0.14), transparent 60%);

  /* D4 (c), the hybrid: the brown cards, the butter note and the letter stay;
     the two mounted herbarium sheets become a dimmed-cream board (the lamp
     does not light it white). Contrast, measured from the live colours at
     1440, the base case first and then the worst case with the lamp foot
     dimming the board at full strength under the text:
       ink on board       8.65 / 7.21
       muted ink          5.98 / 4.99
       accent             5.69 / 4.74
       link               5.53 / 4.61 (the token level)
     Cards, note and letter are unchanged from the brown papers above, so
     their rows are the plain --paper and --note pairs in meta.contrast. */
  --board: #cfc1a1;
  --board-ink: #2f2219;
  --board-ink-muted: #4f3a2b;
  --board-accent: #702a36;
  --board-link: #2f4a2a;
  --board-rule: rgba(58, 42, 31, 0.3);
  --board-lamp-foot: 0.1;
  --board-lamp:
    radial-gradient(ellipse 80% 60% at 18% 0%, rgba(255, 200, 120, 0.34), transparent 70%),
    linear-gradient(0deg, rgba(40, 25, 10, var(--board-lamp-foot)), transparent 45%);
}`],
/* ---------- portal tail ---------- */
[`  background-size: auto, 28px 28px, 28px 28px;
}
[data-theme='cottagecore'][data-scheme='dark'] [data-portal-tail] { background-size: 28px 28px, 28px 28px, 28px 28px; }
`,
`  background-size: auto, 28px 28px, 28px 28px;
}
`],
/* ---------- paper ---------- */
[`[data-theme='cottagecore'][data-scheme='dark'] .cc-paper {
  background-image: linear-gradient(165deg, rgba(255, 200, 120, 0.14), transparent 60%);
}
/* Ruled like a recipe card: the rule sits under each line of text. */
[data-theme='cottagecore'] .cc-ruled {
  --lh: 1.8rem;
  line-height: var(--lh);
  background-image: linear-gradient(to top, var(--rule) 1px, transparent 1px);
  background-size: 100% var(--lh);
  background-position: 0 -0.28rem;
}`,
`[data-theme='cottagecore'] .cc-paper { background-image: var(--paper-lamp); }

/* The mounted herbarium sheets (Home hero, About): a board. Petals are 10%
   less saturated than on a loose card (they are pressed and old), in both
   schemes; the light palette is the one drawn for cream. */
[data-theme='cottagecore'] .cc-board {
  --cc-petal: #fffdf7; --cc-petal-back: #efe6d4; --cc-petal-edge: rgba(107, 82, 66, 0.5);
  --cc-heart: #eec35a; --cc-heart-deep: #b98a2a;
  --cc-stem: #7f9870; --cc-leaf: #a9bb96; --cc-leaf-edge: #6c8460;
  --cc-lav: #a596c9; --cc-lav-edge: #6f5f98; --cc-fern: #95ae86;
  --cc-twig: #6d5140; --cc-lenticel: #f7efdf; --cc-catkin: #c9a672;
  --cc-rose-petal: #e5b1ad; --cc-rose-edge: #b8747a; --cc-blush: #fef4e5;
  --cc-gum-strip: #ece0c4;
}
/* By lamplight the board takes its own inks and stays cream, with a visible
   edge (a lit top lip, a dark thickness) in place of the soft paper lift. The
   washi on it is the light scheme's (founder call 7: the dark tape tokens read
   as heavy bands on cream). */
[data-theme='cottagecore'][data-scheme='dark'] .cc-board {
  --paper: var(--board);
  color: var(--board-ink);
  --mark: var(--board-ink);
  --mark-muted: var(--board-ink-muted);
  --accent: var(--board-accent);
  --link: var(--board-link);
  --rule: var(--board-rule);
  --margin-line: rgba(112, 42, 54, 0.42);
  --tape-sage: rgba(170, 192, 158, 0.78);
  --tape-sage-thread: rgba(98, 128, 88, 0.36);
  --tape-rose: rgba(236, 196, 190, 0.82);
  --tape-rose-dot: rgba(155, 70, 82, 0.34);
  --tape-butter: rgba(244, 222, 150, 0.8);
  --tape-butter-stripe: rgba(214, 170, 70, 0.3);
  --shadow: 58, 42, 31;
  background-color: var(--board);
  background-image:
    var(--board-lamp),
    repeating-linear-gradient(0deg, rgba(58, 42, 31, 0.022) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(58, 42, 31, 0.026) 0 1px, transparent 1px 4px);
  box-shadow:
    inset 0 1px 0 rgba(255, 246, 222, 0.5),
    inset 0 0 0 1px rgba(90, 70, 40, 0.2),
    0 2px 0 #a2936c,
    0 3px 0 rgba(0, 0, 0, 0.4),
    0 24px 36px -18px rgba(0, 0, 0, 0.8);
}
/* The plate mark a mounted print leaves in its board. */
[data-theme='cottagecore'][data-scheme='dark'] .cc-board::after {
  content: '';
  position: absolute; inset: 0.65rem;
  border: 1px solid rgba(58, 42, 31, 0.2);
  box-shadow: 0 1px 0 rgba(255, 246, 222, 0.35);
  pointer-events: none;
}

/* Ruled like a recipe card: the rule sits under each line of text. Whole
   pixels all the way (brief item 4): a 30px pitch, so the rule tile and the
   line boxes never drift apart as a fractional pitch would; a paragraph
   margin is a whole number of --lh. The rules are the element's own
   background, so they tilt with the text. Lora in a 30px line puts the
   baseline 21px down; the rule is 1px at --rule-y (24px), about 0.2em under
   it. Origin and clip are the content box, so the first and the last line
   both sit on a rule and none runs on past the text into the padding. */
[data-theme='cottagecore'] .cc-ruled {
  --lh: 30px;
  --rule-y: 24px;
  line-height: var(--lh);
  background-image: linear-gradient(to top, var(--rule) 1px, transparent 1px);
  background-size: 100% var(--lh);
  background-origin: content-box;
  background-clip: content-box;
  background-position: 0 calc(var(--rule-y) + 1px - var(--lh));
}`],
/* ---------- torn ---------- */
[`  box-shadow: none;
  -webkit-mask:
    var(--torn-top) top left / 240px 14px repeat-x,
    linear-gradient(#000 0 0) center / 100% calc(100% - 26px) no-repeat,
    var(--torn-bottom) bottom left / 240px 14px repeat-x;
  mask:
    var(--torn-top) top left / 240px 14px repeat-x,
    linear-gradient(#000 0 0) center / 100% calc(100% - 26px) no-repeat,
    var(--torn-bottom) bottom left / 240px 14px repeat-x;
}`,
`  box-shadow: none;
  /* One 1200px tile (gen-torn.mjs), wider than any torn sheet, so a tear
     never repeats along a sheet; --torn-x starts each sheet's window at its
     own stretch of the tile. */
  --torn-x: 0px;
  -webkit-mask:
    var(--torn-top) top var(--torn-x) / 1200px 14px repeat-x,
    linear-gradient(#000 0 0) center / 100% calc(100% - 26px) no-repeat,
    var(--torn-bottom) bottom var(--torn-x) / 1200px 14px repeat-x;
  mask:
    var(--torn-top) top var(--torn-x) / 1200px 14px repeat-x,
    linear-gradient(#000 0 0) center / 100% calc(100% - 26px) no-repeat,
    var(--torn-bottom) bottom var(--torn-x) / 1200px 14px repeat-x;
}`],
/* ---------- tape ---------- */
[`[data-theme='cottagecore'] .cc-tape--butter {
  background-color: var(--tape-butter);
  background-image: repeating-linear-gradient(-45deg, var(--tape-butter-stripe) 0 5px, transparent 5px 11px);
  background-size: auto;
}`,
`[data-theme='cottagecore'] .cc-tape--butter {
  background-color: var(--tape-butter);
  background-image: repeating-linear-gradient(-45deg, var(--tape-butter-stripe) 0 5px, transparent 5px 11px);
  background-size: auto;
}
/* The one indigo thread (D8): indigo-and-white gingham, no text on it. */
[data-theme='cottagecore'] .cc-tape--indigo {
  background-color: var(--tape-indigo);
  background-image:
    linear-gradient(90deg, var(--tape-indigo-thread) 50%, transparent 0),
    linear-gradient(var(--tape-indigo-thread) 50%, transparent 0);
  background-size: 8px 8px;
}
/* Cut ends (brief item 9): torn at both ends is the default; these are the
   others a roll of washi gives, so no two tapes on a page share an outline.
   Every instance also sets its own --tape-w. */
[data-theme='cottagecore'] .cc-tape--cut {
  clip-path: polygon(2.5% 0, 100% 0, 97.5% 100%, 0 100%);
}
[data-theme='cottagecore'] .cc-tape--half {
  clip-path: polygon(
    0 0, 100% 0, 100% 100%, 0 100%, 2.5% 88%, 0 76%, 3% 62%, 0 50%, 2.5% 36%, 0 22%, 3% 10%
  );
}
[data-theme='cottagecore'] .cc-tape--ragged {
  clip-path: polygon(
    1% 0, 99% 0, 100% 20%, 96% 41%, 99% 63%, 97% 84%, 100% 100%,
    2% 100%, 0 76%, 4% 58%, 1% 33%, 3% 14%
  );
}
[data-theme='cottagecore'] .cc-tape--pinked {
  clip-path: polygon(
    0 0, 100% 0, 98% 17%, 100% 33%, 98% 50%, 100% 67%, 98% 83%, 100% 100%,
    0 100%, 2% 83%, 0 67%, 2% 50%, 0 33%, 2% 17%
  );
}`],
/* ---------- gingham ---------- */
[`  background-size: auto, 28px 28px, 28px 28px;
}
[data-theme='cottagecore'][data-scheme='dark'] .cc-gingham { background-size: 28px 28px, 28px 28px, 28px 28px; }
`,
`  background-size: auto, 28px 28px, 28px 28px;
}
/* The valance and hem scallops by lamplight: a 1.5px lit rim, drawn as a ring
   gradient inside the same scallop tile the mask cuts (a mask hides borders
   and filters, so the rim has to be background). */
[data-theme='cottagecore'][data-scheme='dark'] .valance.cc-gingham {
  background-image:
    radial-gradient(var(--scallop) at 50% 0, transparent calc(97% - 1.5px), var(--cc-lamp-rim) calc(97% - 1.5px) 97%, transparent 97%),
    var(--gingham-texture),
    linear-gradient(90deg, var(--gingham-thread) 50%, transparent 0),
    linear-gradient(var(--gingham-thread) 50%, transparent 0);
  background-size: calc(2 * var(--scallop)) var(--scallop), auto, 28px 28px, 28px 28px;
  background-repeat: repeat-x, repeat, repeat, repeat;
  background-position: 50% 100%, 0 0, 0 0, 0 0;
}
[data-theme='cottagecore'][data-scheme='dark'] .hem.cc-gingham {
  background-image:
    radial-gradient(var(--scallop) at 50% 100%, transparent calc(97% - 1.5px), var(--cc-lamp-rim) calc(97% - 1.5px) 97%, transparent 97%),
    var(--gingham-texture),
    linear-gradient(90deg, var(--gingham-thread) 50%, transparent 0),
    linear-gradient(var(--gingham-thread) 50%, transparent 0);
  background-size: calc(2 * var(--scallop)) var(--scallop), auto, 28px 28px, 28px 28px;
  background-repeat: repeat-x, repeat, repeat, repeat;
  background-position: 50% 0, 0 0, 0 0, 0 0;
}
`],
/* ---------- pressed ---------- */
[`[data-theme='cottagecore'] .pressed { overflow: visible; filter: var(--press-shadow); }`,
`[data-theme='cottagecore'] .pressed { overflow: visible; filter: var(--press-shadow); }
/* Pressed flat: a specimen on paper (a card, a sheet, a note, the stationery)
   is held by the paper and casts nothing but a hairline of contact. */
[data-theme='cottagecore'] :is(.cc-paper, .cc-board, .note) .pressed { filter: var(--press-shadow-mounted); }`],
]);
console.log('ok');
