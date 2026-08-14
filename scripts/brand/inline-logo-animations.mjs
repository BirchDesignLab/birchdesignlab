// Make the animated brand marks self-contained.
//
// The Claude Design export keeps every path, gradient, mask and clip path, and
// it keeps the class hooks. What it drops is the CSS: in `Locked Marks.dc.html`
// each animation is an inline `style="animation: ..."` on the element, and the
// @keyframes live in one <style> block in that file's head. So the standalone
// SVGs are static marks with hooks that nothing binds to.
//
// This injects a <style> into each animated SVG carrying the keyframes it needs
// and the binding for its hooks. After this each file animates on its own, in an
// <img>, as a CSS background, or inlined -- declarative animation runs in all of
// those, only scripts are blocked.
//
// It is a script rather than a one-time hand edit because the brand kit is
// expected to be re-exported, and a re-export drops the bindings again.
//
// Run: node scripts/brand/inline-logo-animations.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'assets/brand/logos/files';

// Copied verbatim from the sheet, except bdl-bg-fill: the original animates
// `background-color` because in the sheet it drove a wrapper <div>. Here the
// same beat has to move a <rect>, so it animates `fill` instead.
const KEYFRAMES = {
  'bdl-draw': '0%{stroke-dashoffset:100}45%{stroke-dashoffset:0}100%{stroke-dashoffset:0}',
  'bdl-settle': '0%,12%{transform:translate(-26px,10px)}40%,84%{transform:translate(0,0)}100%{transform:translate(-26px,10px)}',
  'bdl-pass': '0%,100%{transform:translateX(-30px)}50%{transform:translateX(34px)}',
  'bdl-breathe2': '0%,100%{opacity:1}50%{opacity:0.5}',
  'bdl-faceA': '0%,42%{opacity:1}52%,92%{opacity:0}100%{opacity:1}',
  'bdl-faceB': '0%,42%{opacity:0}52%,92%{opacity:1}100%{opacity:0}',
  'bdl-bg-fill': '0%,42%{fill:#1c1a17}52%,92%{fill:#f5f1e8}100%{fill:#1c1a17}',
  'bdl-write': '0%{stroke-dashoffset:100}32%{stroke-dashoffset:0}88%{stroke-dashoffset:0}100%{stroke-dashoffset:100}',
  'bdl-rise': '0%,26%{opacity:0;transform:translateY(8px)}38%,86%{opacity:1;transform:translateY(0)}94%,100%{opacity:0;transform:translateY(8px)}',
  'bdl-sheen': '0%{transform:translateX(0)}40%,100%{transform:translateX(330px)}',
  'bdl-cross': '0%,8%{transform:translateX(-34px)}46%,58%{transform:translateX(34px)}96%,100%{transform:translateX(-34px)}',
};

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// One entry per file. `rules` is the CSS that binds hooks to keyframes; `extra`
// is anything the static (reduced-motion) state needs to still look right.
//
// TIMING LIVES HERE. Each duration is one number, in one place, per mark.
const MARKS = {
  '9e-settle.svg': {
    uses: ['bdl-settle'],
    rules: `.m{animation:bdl-settle 9s ${EASE} infinite}`,
  },
  '9f-pass.svg': {
    uses: ['bdl-pass'],
    rules: `.m{animation:bdl-pass 13s ease-in-out infinite}`,
  },
  '9g-drawn.svg': {
    uses: ['bdl-draw', 'bdl-breathe2'],
    // The second stroke trails the first by 1.2s; that offset is the effect.
    rules:
      `.a{animation:bdl-draw 11s ${EASE} infinite}` +
      `.b{animation:bdl-draw 11s ${EASE} -1.2s infinite}` +
      `.w{animation:bdl-breathe2 7s ease-in-out infinite}`,
  },
  '9h-flip.svg': {
    uses: ['bdl-faceA', 'bdl-faceB', 'bdl-bg-fill'],
    // .d starts hidden: the sheet set opacity:0 inline and the export dropped
    // it. Without this both faces stack on the first frame and under reduced
    // motion, which reads as mud.
    rules:
      `.d{opacity:0}` +
      `.bg{animation:bdl-bg-fill 16s ease-in-out infinite}` +
      `.n{animation:bdl-faceA 16s ease-in-out infinite}` +
      `.d{animation:bdl-faceB 16s ease-in-out infinite}`,
  },
  '10f-lacquer-night.svg': {
    uses: ['bdl-sheen'],
    rules: `.s{animation:bdl-sheen 9s ease-in-out infinite}`,
    // A frozen sheen is a bright bar parked across the mark. Hide it instead.
    reduced: `.s{display:none}`,
  },
  '10f-lacquer-day.svg': {
    uses: ['bdl-sheen'],
    rules: `.s{animation:bdl-sheen 9s ease-in-out infinite}`,
    reduced: `.s{display:none}`,
  },
  '10g-crossing.svg': {
    uses: ['bdl-cross'],
    // Two elements carry .m, one per clipped half. Both take the same beat.
    rules: `.m{animation:bdl-cross 18s ease-in-out infinite}`,
  },
};

// The four signature lockups share one binding set.
for (const f of [
  '10d-signature-stacked-night.svg', '10d-signature-stacked-day.svg',
  '10d-signature-horizontal-night.svg', '10d-signature-horizontal-day.svg',
]) {
  MARKS[f] = {
    uses: ['bdl-write', 'bdl-rise'],
    rules:
      `.p1{animation:bdl-write 14s ${EASE} infinite}` +
      `.p2{animation:bdl-write 14s ${EASE} -0.9s infinite}` +
      `.t{animation:bdl-rise 14s ${EASE} infinite}`,
  };
}

let done = 0;
for (const [file, spec] of Object.entries(MARKS)) {
  const path = join(DIR, file);
  let svg = readFileSync(path, 'utf8');

  if (svg.includes('<style>')) {
    console.log(`skip   ${file} (already has a style block)`);
    continue;
  }
  for (const k of spec.uses) {
    if (!KEYFRAMES[k]) throw new Error(`${file}: no keyframes named ${k}`);
  }

  const frames = spec.uses.map((k) => `@keyframes ${k}{${KEYFRAMES[k]}}`).join('');
  // Someone who asked their system to stop moving things gets a still mark.
  const reduced = `@media(prefers-reduced-motion:reduce){*{animation:none!important}${spec.reduced ?? ''}}`;
  const style = `<style>${frames}${spec.rules}${reduced}</style>`;

  // Inject as the first child of <svg> so it applies to everything after it.
  const out = svg.replace(/(<svg[^>]*>)/, `$1${style}`);
  if (out === svg) throw new Error(`${file}: could not find the opening <svg> tag`);

  writeFileSync(path, out);
  console.log(`inline ${file}  (${spec.uses.join(', ')})`);
  done++;
}
console.log(`\n${done} marks made self-contained`);
