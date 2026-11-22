/**
 * Stage 6 wave 3, task 26: one-off edit of parts/plates.ts that adds the warm-up (the first animated frame of a
 * filtered plate costs the GPU about 240 ms once). Kept for the record; the edit is already in the file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('../../../src/themes/grandmillennial/parts/plates.ts', import.meta.url);
let s = readFileSync(f, 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const a = `  /* nothing moves while the page is hidden or the plates are off screen */
  const onVisibility = () => { if (document.hidden) cancelAll(); };
  const io = new IntersectionObserver((entries) => {
    live = entries[entries.length - 1].isIntersecting;
    if (!live) cancelAll();
  });`;
const b = `  /* The first animated frame of a plate (its drop shadow is a filter) costs the GPU a one-off 240 ms or so; paid on the
     first brush it is a hitch in the swing itself. So each shown plate plays one invisible 80 ms animation (a hundredth of
     a degree) once, when the hero is in view and the page has been quiet for a moment, or the moment a pointer arrives,
     whichever comes first. Nothing stays running, nothing is written. */
  let warmed = false;
  let warmTimer = 0;
  const warmAnims: Animation[] = [];
  const warm = () => {
    window.clearTimeout(warmTimer);
    warmTimer = 0;
    if (warmed || !live || document.hidden) return;
    warmed = true;
    for (const el of plates) {
      if (!isShown(el)) continue;
      warmAnims.push(el.animate([{ transform: 'rotate(0.01deg)' }, { transform: 'rotate(0deg)' }], { duration: 80 }));
    }
  };

  /* nothing moves while the page is hidden or the plates are off screen */
  const onVisibility = () => { if (document.hidden) cancelAll(); };
  const io = new IntersectionObserver((entries) => {
    live = entries[entries.length - 1].isIntersecting;
    if (!live) { cancelAll(); window.clearTimeout(warmTimer); warmTimer = 0; }
    else if (!warmed && !warmTimer) warmTimer = window.setTimeout(warm, 900);
  });`;
if (!s.includes(a)) throw new Error('anchor not found');
s = s.replace(a, b);
s = s.replace(`  hero.addEventListener('pointermove', onMove);`, `  hero.addEventListener('pointerenter', warm);\n  hero.addEventListener('pointerdown', warm);\n  hero.addEventListener('pointermove', onMove);`);
s = s.replace(`    hero.removeEventListener('pointermove', onMove);`, `    hero.removeEventListener('pointerenter', warm);\n    hero.removeEventListener('pointerdown', warm);\n    hero.removeEventListener('pointermove', onMove);`);
s = s.replace(`    io.disconnect();\n    ro.disconnect();\n    cancelAll();`, `    io.disconnect();\n    ro.disconnect();\n    window.clearTimeout(warmTimer);\n    for (const a of warmAnims) a.cancel();\n    cancelAll();`);
writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s);
