/**
 * Stage 6 wave 3, task 19 (vaporwave V3): the Home kiosk's two props at phone
 * and tablet widths. Measures the VISIBLE figure (the still's opaque part:
 * Venus on her drum is x 31.8 to 68.0% and y 15.6 to 89.1% of the image, the
 * ball x 29.5 to 70.3% and y 29.5 to 74.2%, both at alpha > 50%, measured from
 * the shipped webp files) after each still's own translateY, against the
 * stand's foot line, the plaque's box and text, and the TOUCH button's text.
 *
 *   node scripts/themes/stage6/w3-t19-kiosk.mjs [scheme]
 */
import { launch, open } from './w3-t19-lib.mjs';

const scheme = process.argv[2] || 'dark';
const widths = [360, 390, 430, 600, 761, 820, 900, 901, 1024];
const FIG = { venus: { x0: 0.318, x1: 0.68, y0: 0.156, y1: 0.891 }, sphere: { x0: 0.295, x1: 0.703, y0: 0.295, y1: 0.742 } };
const browser = await launch();
for (const width of widths) {
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 300 });
  await page.locator('.kiosk-stand').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const r = await page.evaluate((FIG) => {
    const R = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
    const textRect = (el) => { const g = document.createRange(); g.selectNodeContents(el); return R(g); };
    const fig = (img, f) => {
      const b = img.getBoundingClientRect();
      return { l: b.left + f.x0 * b.width, r: b.left + f.x1 * b.width, t: b.top + f.y0 * b.height, b: b.top + f.y1 * b.height };
    };
    const kiosk = document.querySelector('.kiosk');
    const venusImg = document.querySelector('.kiosk-prop-venus img');
    const sphereImg = document.querySelector('.kiosk-prop:not(.kiosk-prop-venus) img');
    const hidden = (el) => !el || getComputedStyle(el.closest('picture')).display === 'none';
    return {
      hidden: hidden(venusImg),
      venus: hidden(venusImg) ? null : fig(venusImg, FIG.venus),
      sphere: hidden(sphereImg) ? null : fig(sphereImg, FIG.sphere),
      foot: R(document.querySelector('.stand-foot')),
      kioskBottom: kiosk.getBoundingClientRect().bottom,
      stand: R(document.querySelector('.kiosk-stand')),
      plaque: R(document.querySelector('.stand-plaque')),
      plaqueText: textRect(document.querySelector('.kiosk-directory')),
      touchText: textRect(document.querySelector('.kiosk-touch span')),
      touch: R(document.querySelector('.kiosk-touch')),
      hscroll: document.documentElement.scrollWidth > innerWidth,
    };
  }, FIG);
  const f1 = (n) => +n.toFixed(1);
  const dims = (f) => f && `${f1(f.r - f.l)}w x ${f1(f.b - f.t)}h`;
  const base = (f) => f && f1(f.b - r.foot.b);
  // Horizontal gap between each figure and a text rect, only where they share vertical range.
  const gapTo = (f, t) => {
    if (!f) return null;
    if (f.b <= t.t || f.t >= t.b) return 'no vertical overlap';
    return f1(Math.max(t.l - f.r, f.l - t.r));
  };
  console.log(width,
    '| venus', dims(r.venus), 'base-foot', base(r.venus), 'x', r.venus && `${f1(r.venus.l)}-${f1(r.venus.r)}`,
    '| sphere', dims(r.sphere), 'base-foot', base(r.sphere), 'x', r.sphere && `${f1(r.sphere.l)}-${f1(r.sphere.r)}`,
    '| plaqueText', `${f1(r.plaqueText.l)}-${f1(r.plaqueText.r)}`, 'h', f1(r.plaque.h),
    '| gap v/plaqueText', gapTo(r.venus, r.plaqueText), 's/plaqueText', gapTo(r.sphere, r.plaqueText),
    '| gap v/touch', gapTo(r.venus, r.touchText), 's/touch', gapTo(r.sphere, r.touchText),
    '| hscroll', r.hscroll);
  await ctx.close();
}
await browser.close();
