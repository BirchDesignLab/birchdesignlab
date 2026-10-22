/**
 * Why was the RAISED framing dropped? Opens the school list from cottagecore
 * under each framing's window and bottom inset and prints the list and row
 * geometry, with a screenshot of what a visitor would see. Under RAISED the
 * dialog's top sat at -162px, off the window. RAISED is no longer in
 * render/screen-framing.mjs; this probe carries its own copy of the numbers.
 * Usage: BDL_BASE=http://localhost:4400 BDL_GPU=1 node scripts/probe-raised-dialog.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteUrl } from '../lib/devserver.mjs';
import { launch, phoneContext } from '../lib/screen-record.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const FRAMES = {
  PHONE: { css: { width: 390, height: 700 }, dpr: 3, safeAreaInsetBottomPx: 0 },
  RAISED: { css: { width: 390, height: 693 }, dpr: 3, safeAreaInsetBottomPx: 242 },
  SHORT: { css: { width: 390, height: 420 }, dpr: 3, safeAreaInsetBottomPx: 0 },
};
for (const fid of Object.keys(FRAMES)) {
  const f = FRAMES[fid];
  const browser = await launch({ width: f.css.width, height: f.css.height, dpr: f.dpr });
  const context = await phoneContext(browser, { ...f.css, dpr: f.dpr, native: true });
  const page = await context.newPage();
  if (f.safeAreaInsetBottomPx) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: f.safeAreaInsetBottomPx } });
  }
  await page.goto(siteUrl('/t/cottagecore/'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.waitForTimeout(800);
  const geo = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
    const root = document.querySelector('bdl-switcher').shadowRoot;
    return {
      viewport: innerHeight,
      dialog: r(root.querySelector('dialog')),
      list: r(root.querySelector('ul')),
      listScrollable: root.querySelector('ul').scrollHeight > root.querySelector('ul').clientHeight,
      rows: [...root.querySelectorAll('a[data-school]')].map((a) => ({ id: a.dataset.school, ...r(a) })),
      bar: r(root.querySelector('.bar')),
    };
  });
  console.log(fid, JSON.stringify(geo));
  await page.screenshot({ path: path.join(OUT, 'framing', `probe-dialog-${fid}.png`) });
  await browser.close();
}
