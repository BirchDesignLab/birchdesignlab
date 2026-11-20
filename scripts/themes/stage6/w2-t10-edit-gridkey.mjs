/** One-off edit of GridKey.astro (Stage 6 wave 2, task 10, T4 C4): a column's number tag that would land on the key drops below it. Kept as the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/themes/swiss/GridKey.astro';
let s = readFileSync(p, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
rep(`      const vh = window.innerHeight;
      const frag = document.createDocumentFragment();`, `      const vh = window.innerHeight;
      // The column tags sit at the top of the screen and the key sits at the
      // start of one column, a line down on a mouse and half a line down on
      // touch (the bar's padding is pulled in): a tag that would cover the key,
      // the control that clears a latched grid, drops to the line below it.
      const kr = key.getBoundingClientRect();
      guides.style.setProperty('--clear-y', \`\${Math.ceil(kr.bottom)}px\`);
      for (const col of Array.from(guides.children) as HTMLElement[]) {
        const cr = col.getBoundingClientRect();
        const hit = cr.width > 0 && kr.bottom > 0 && kr.top < u && kr.right > cr.left - 1 && kr.left < cr.left + 30;
        if (hit) col.dataset.clear = '';
        else delete col.dataset.clear;
      }
      const frag = document.createDocumentFragment();`);
rep(`  @media (max-width: 1023.98px) { .guides span:nth-child(n + 7) { display: none; } }`, `  .guides span[data-clear]::before { top: var(--clear-y, 0px); }
  @media (max-width: 1023.98px) { .guides span:nth-child(n + 7) { display: none; } }`);
writeFileSync(p, s);
