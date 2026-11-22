// Stage 6 w3 task 18, item 3: bauhaus loose-shape minors C1 to C4 (task 12).
// One-off source edit, kept for the record. Run once from the repo root:
//   node scripts/themes/stage6/w3-t18-bauhaus-edit.mjs
// Preserves the file's line endings; every replacement must match exactly once.
// NOTE (w4 task 28, 18/C3): this script is the record of the edit as first made. A later
// hand edit to parts/loose.ts is NOT in it: stillBuilding() also skips a CSSTransition
// (`!(typeof CSSTransition !== 'undefined' && a instanceof CSSTransition) &&`), so the 120 ms
// hover lift or the settle does not read as the build and a press just after the pointer
// arrives still picks the shape up. The file on disk is the truth; do not re-run this script.
import { readFileSync, writeFileSync } from 'node:fs';

function edit(path, pairs) {
  let s = readFileSync(path, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${path}: expected 1 match, found ${n}:\n${a}`);
    s = s.replace(a, () => b);
  }
  writeFileSync(path, crlf ? s.replace(/\n/g, '\r\n') : s);
}

edit('src/themes/bauhaus/parts/loose.ts', [
  // C1: the beat's own animation does not count as building.
  [
    `/** True while any build animation under the shape is still to finish (or parked below the fold). */
function stillBuilding(el: Element): boolean {
  try {
    return el.getAnimations({ subtree: true }).some((a) => a.playState !== 'finished' && a.playState !== 'idle');`,
    `/**
 * True while any build animation under the shape is still to finish (or
 * parked below the fold). The pick-me beat (\`skip\`) is not building: a
 * press, touch, hover or arrow key during it cancels it and takes the shape.
 */
function stillBuilding(el: Element, skip: Animation | null = null): boolean {
  try {
    return el
      .getAnimations({ subtree: true })
      .some((a) => a !== skip && a.playState !== 'finished' && a.playState !== 'idle');`,
  ],
  // C3: drop can settle straight into the hover lift.
  [
    `  function drop(el: SVGElement): void {
    if (!el.hasAttribute('data-held')) return;
    el.removeAttribute('data-held');
    el.style.transition = \`translate \${FALL_MS}ms var(--ease-snap, \${SNAP})\`;
    el.style.translate = '0px 0px';`,
    `  /** Falls back to the mark, or (lift > 0, the mouse still over it) straight to the hover lift. */
  function drop(el: SVGElement, lift = 0): void {
    if (!el.hasAttribute('data-held')) return;
    el.removeAttribute('data-held');
    el.style.transition = \`translate \${FALL_MS}ms var(--ease-snap, \${SNAP})\`;
    el.style.translate = \`\${-lift}px \${-lift}px\`;`,
  ],
  [
    `  function cancelBeat(): void {
    window.clearTimeout(beatTimer);
    beat?.cancel();
    beat = null;
  }
`,
    `  function cancelBeat(): void {
    window.clearTimeout(beatTimer);
    beat?.cancel();
    beat = null;
  }

  /** Building, not counting the pick-me beat. */
  const building = (el: SVGElement): boolean => stillBuilding(el, beat);
`,
  ],
  [
    `        if (e.pointerType !== 'mouse' || !fine.matches || el.hasAttribute('data-held') || stillBuilding(el)) return;
        setLift(el, true);`,
    `        if (e.pointerType !== 'mouse' || !fine.matches || el.hasAttribute('data-held') || building(el)) return;
        cancelBeat();
        setLift(el, true);`,
  ],
  [
    `        if (grab || (e.pointerType === 'mouse' && e.button !== 0) || stillBuilding(el)) return;
        const at = pixelsToUnits(root, e.clientX, e.clientY);
        if (!at) return;`,
    `        if (grab || (e.pointerType === 'mouse' && e.button !== 0) || building(el)) return;
        const at = pixelsToUnits(root, e.clientX, e.clientY);
        if (!at) return;
        cancelBeat();`,
  ],
  // C2: a mouse press always shows the ink block.
  [
    `          if (shadows.get(el)) setLift(el, true);`,
    `          if (fine.matches) setLift(el, true);`,
  ],
  [
    `      if (!was.held) return;
      drop(el);
      // Let go with the mouse still over it: it settles back into the hover lift.
      setLift(el, !was.touch && fine.matches && el.matches(':hover'));`,
    `      if (!was.held) return;
      // Let go with the mouse still over it: it settles straight into the
      // hover lift, one motion, not down to the mark and back up.
      const over = !was.touch && fine.matches && el.matches(':hover');
      drop(el, over ? LIFT_PX * unitsPerPixel(root) : 0);
      setLift(el, over);`,
  ],
  [
    `          if (stillBuilding(el)) return;
          e.preventDefault();
          cancelBeat();`,
    `          if (building(el)) return;
          e.preventDefault();
          cancelBeat();`,
  ],
]);

edit('src/themes/bauhaus/pages/Services.astro', [
  [
    `numbered module on the grid, the process as four columns under four
    coloured bars, and the closing ask on a blue slab. */`,
    `numbered module on the grid, the process as a beam diagram (the four
    shapes as stations on an ink beam, each step's text hanging from its
    station), and the closing ask on a blue slab. */`,
  ],
]);
console.log('bauhaus edits applied');
