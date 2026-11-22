// Stage 6 w3 task 18, item 5 C2: the no-backdrop-filter fallback must win.
// (1) The phone --mat-regular override only applies where some backdrop-filter
//     works: nested @supports, not `or` (lightningcss drops the -webkit- branch
//     of an `or`; scripts/themes/glassmorphism/b1-fix2-lightningcss.mjs).
// (2) Tinted (0,3,0 light, 0,4,0 dark) and dark's token block (0,3,0) outranked
//     the fallback (0,2,0): the fallback takes E10's doubled-attribute
//     selectors, (0,4,0) and (0,5,0), strictly above every Control Centre setting.
// One-off source edit, kept for the record: node scripts/themes/stage6/w3-t18-glass-css-edit.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/themes/glassmorphism/theme.css';
let s = readFileSync(path, 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`expected 1 match, found ${n}:\n${a}`);
  s = s.replace(a, () => b);
}

rep(
  `   b1-fix2-lightningcss.mjs). Nested queries both survive. */
@supports not (backdrop-filter: blur(1px)) {
  @supports not (-webkit-backdrop-filter: blur(1px)) {
    :root[data-theme='glassmorphism'] {
      --mat-thin: var(--glass-fallback);
      --mat-regular: var(--glass-fallback);
      --mat-thick: var(--glass-fallback);
      --mat-bar: var(--glass-fallback);
    }
  }
}`,
  `   b1-fix2-lightningcss.mjs). Nested queries both survive.
   The selectors are E10's (below): doubled attributes, (0,4,0) light and
   (0,5,0) dark, so the fallback wins over dark's token block (0,3,0), Tinted
   (0,3,0 light, 0,4,0 dark) and the phone pane wherever they sit in the file
   (Stage 6 w3 task 18, T9 C2). */
@supports not (backdrop-filter: blur(1px)) {
  @supports not (-webkit-backdrop-filter: blur(1px)) {
    :root[data-theme='glassmorphism'][data-theme='glassmorphism'][data-theme='glassmorphism'],
    :root[data-theme='glassmorphism'][data-scheme='dark'][data-theme='glassmorphism'][data-theme='glassmorphism'] {
      --mat-thin: var(--glass-fallback);
      --mat-regular: var(--glass-fallback);
      --mat-thick: var(--glass-fallback);
      --mat-bar: var(--glass-fallback);
    }
  }
}`,
);

rep(
  `  /* Stage 6 wave 2 (G2): the thinner regular pane (light; dark's token
     block, 0,3,0, and Tinted's both outrank this, as they should). */
  :root[data-theme='glassmorphism'] {
    --mat-regular: var(--mat-regular-phone);
  }`,
  `  /* Stage 6 wave 2 (G2): the thinner regular pane (light; dark's token
     block, 0,3,0, and Tinted's both outrank this, as they should). Only
     where a backdrop-filter works (w3 task 18, T9 C2): without one the pane
     keeps the opaque fallback. Two exclusive blocks, the second nested, not
     an \`or\` (the minifier drops the -webkit- branch of an \`or\`). */
  @supports (backdrop-filter: blur(1px)) {
    :root[data-theme='glassmorphism'] {
      --mat-regular: var(--mat-regular-phone);
    }
  }
  @supports not (backdrop-filter: blur(1px)) {
    @supports (-webkit-backdrop-filter: blur(1px)) {
      :root[data-theme='glassmorphism'] {
        --mat-regular: var(--mat-regular-phone);
      }
    }
  }`,
);
writeFileSync(path, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('glass css edits applied');
