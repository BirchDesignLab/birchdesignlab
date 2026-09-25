/**
 * Wave B1 glass fix round 2 (09-25-26): E10's off state after the fx.ts
 * rework (bevel deferred to idle, built one pane per idle slot). Per scheme,
 * on Home: loads with prefers-reduced-transparency no-preference and waits
 * for the bevel, then flips the media features live over CDP and reads the
 * thin pane, the header bar and the wallpaper after each step:
 *   start (no-preference) -> reduce -> no-preference -> contrast more ->
 *   no-preference -> forced-colors active.
 * Expected: reduce and contrast-more give backdrop-filter none (computed,
 * and no inline url() left), an opaque material, no wallpaper image, orbs
 * still; back to no-preference restores the inline bevel; forced colors
 * gives the panes a real border.
 * Writes nothing into another seat's folders; prints one line per step and
 * a PASS/FAIL line.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-e10.mjs [--base URL]
 */
import { chromium } from 'playwright';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const fails = [];
for (const scheme of ['light', 'dark']) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  const set = (features) => cdp.send('Emulation.setEmulatedMedia', { features });
  const NP = { name: 'prefers-reduced-transparency', value: 'no-preference' };
  await set([NP]);
  await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const thin = document.querySelector('.glass.thin');
    const bar = document.querySelector('.site-header > .bar');
    const cs = getComputedStyle(thin);
    const wp = getComputedStyle(document.querySelector('main'), '::before').backgroundImage;
    const orb = document.querySelector('.orb');
    return {
      thinBf: cs.backdropFilter.slice(0, 60), thinInline: thin.style.backdropFilter.slice(0, 30), thinBg: cs.backgroundColor,
      barBf: getComputedStyle(bar).backdropFilter, wp: wp.slice(0, 12), orbAnim: orb ? getComputedStyle(orb).animationName : 'n/a',
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
    };
  });
  const step = async (label, features, check) => {
    if (features) { await set(features); await page.waitForTimeout(1500); }
    const r = await read();
    const ok = check(r);
    if (!ok) fails.push(`${scheme} ${label}`);
    console.log(scheme, label.padEnd(22), ok ? 'ok  ' : 'FAIL', JSON.stringify(r));
  };
  const off = (r) => r.thinBf === 'none' && !r.thinInline && r.barBf === 'none' && r.wp === 'none' && r.orbAnim === 'none' && /, 0\.9\d\)$/.test(r.thinBg);
  const on = (r) => /^url\(/.test(r.thinBf) && /^url\(/.test(r.thinInline) && /blur/.test(r.barBf) && r.wp !== 'none';
  await step('start no-preference', null, on);
  await step('reduce (live)', [{ name: 'prefers-reduced-transparency', value: 'reduce' }], off);
  await step('back to no-preference', [NP], on);
  await step('contrast more (live)', [NP, { name: 'prefers-contrast', value: 'more' }], off);
  await step('contrast back', [NP, { name: 'prefers-contrast', value: 'no-preference' }], on);
  await step('forced-colors active', [NP, { name: 'forced-colors', value: 'active' }], (r) => /^1px solid/.test(r.border));
  await c.close();
}
console.log(fails.length ? `FAIL: ${fails.join('; ')}` : 'PASS: E10 off state and recovery in both schemes');
await browser.close();
