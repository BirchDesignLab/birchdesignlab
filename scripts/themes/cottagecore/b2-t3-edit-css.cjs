/* B2 task 3: theme.css edits (tactile states, tape corners). Run once. */
const edit = require('./edit-helper.cjs');
const f = 'src/themes/cottagecore/theme.css';
edit(f, [
[`[data-theme='cottagecore'] .cc-label:hover {
  rotate: -1.2deg; translate: 0 -1px;
  text-decoration: none;
}
`, `/* Hover lift only where there is a real hover; a tap never leaves a label
   tilted. Pressed is flat: the label sits down on the table. */
@media (hover: hover) {
  [data-theme='cottagecore'] .cc-label:hover {
    rotate: -1.2deg; translate: 0 -1px;
    text-decoration: none;
  }
}
[data-theme='cottagecore'] .cc-label:active {
  rotate: 0deg; translate: 0 1px;
  box-shadow: 0 1px 0 rgba(var(--shadow), 0.1), 0 3px 6px -4px rgba(var(--shadow), 0.5);
  transition-duration: 80ms;
}
`],
[`[data-theme='cottagecore'] .cc-note-link:hover { text-decoration: underline wavy var(--accent) 1px; text-underline-offset: 0.18em; }
`, `@media (hover: hover) {
  [data-theme='cottagecore'] .cc-note-link:hover { text-decoration: underline wavy var(--accent) 1px; text-underline-offset: 0.18em; }
}
`],
[`[data-theme='cottagecore'] .cc-note-link:hover svg { translate: 4px 0; }
`, `@media (hover: hover) {
  [data-theme='cottagecore'] .cc-note-link:hover svg { translate: 4px 0; }
}
`],
[`  pointer-events: none;
}
[data-theme='cottagecore'] .cc-tape--rose {`, `  /* Inert but touchable: the free corner lifts on hover or tap (below). */
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  /* The free corner: which end and which side, and how big the curl. */
  --c-x: 100%; --o-x: 0%; --c-y: 100%; --o-y: 0%;
  --curl: 1.15rem;
}
[data-theme='cottagecore'] .cc-tape--rose {`],
[`/* ---------- gingham ---------- */
`, `/* The free corner of a washi tape lifts: a pale, translucent back where the
   corner curls up and a soft shade under it, pressed flat again on leave. Each
   cut-end variant lifts its own corner. Specimens never move. */
[data-theme='cottagecore'] .cc-tape::before,
[data-theme='cottagecore'] .cc-tape::after {
  content: '';
  position: absolute;
  left: var(--c-x); top: var(--c-y);
  translate: calc(var(--c-x) * -1) calc(var(--c-y) * -1);
  pointer-events: none;
  scale: 0;
  transform-origin: var(--c-x) var(--c-y);
  transition: scale 170ms ease-out;
}
[data-theme='cottagecore'] .cc-tape::before {
  width: calc(var(--curl) * 2.1); height: calc(var(--curl) * 2.1);
  background: radial-gradient(circle at var(--c-x) var(--c-y), rgba(var(--shadow), 0.38), rgba(var(--shadow), 0.12) 45%, transparent 72%);
}
[data-theme='cottagecore'] .cc-tape::after {
  width: var(--curl); height: var(--curl);
  background: linear-gradient(
    to var(--fold-dir, top left),
    rgba(255, 253, 247, 0.74), rgba(255, 253, 247, 0.38)
  );
  clip-path: polygon(var(--c-x) var(--c-y), var(--o-x) var(--c-y), var(--c-x) var(--o-y));
}
[data-theme='cottagecore'] .cc-tape--cut { --c-y: 0%; --o-y: 100%; --fold-dir: bottom left; }
[data-theme='cottagecore'] .cc-tape--half { --curl: 1.4rem; }
[data-theme='cottagecore'] .cc-tape--ragged { --c-x: 0%; --o-x: 100%; --c-y: 0%; --o-y: 100%; --fold-dir: bottom right; --curl: 1.3rem; }
[data-theme='cottagecore'] .cc-tape--pinked { --c-x: 0%; --o-x: 100%; --fold-dir: top right; --curl: 1.25rem; }
[data-theme='cottagecore'] .cc-tape[data-lift]::before,
[data-theme='cottagecore'] .cc-tape[data-lift]::after { scale: 1; }
@media (hover: hover) and (pointer: fine) {
  [data-theme='cottagecore'] .cc-tape:hover::before,
  [data-theme='cottagecore'] .cc-tape:hover::after { scale: 1; }
}

/* ---------- gingham ---------- */
`],
]);
