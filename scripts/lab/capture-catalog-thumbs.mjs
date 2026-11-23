/**
 * Catalog pictures: one still per Lab entry, shown in its row on /lab.
 *
 * Experiments are shot from a running preview of the built site (launch
 * config "preview", port 4400) with the page chrome hidden (back hatch, wall
 * label, specimen plate), so the picture is the piece itself. The two genre
 * demos are shot from their deployed sites. BDL-011 is a sheet of the six
 * schools' home pages. BDL-005 and BDL-010 reuse existing images (their
 * frontmatter points at them), so they are not captured here.
 *
 * GPU rasteriser so the WebGL pieces draw. Re-run for an entry when its piece
 * changes:
 *
 *   node scripts/lab/capture-catalog-thumbs.mjs [bdl-001 ...]
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { suppressPrompt } from '../themes/lib/portal-prompt.mjs';

const BASE = process.env.BASE || 'http://localhost:4400';
const W = 1200, H = 750; // 16:10, the catalog frame
const HIDE = '.hatch,details.label,details.plate,bdl-switcher{display:none!important}';
const SCHOOLS = ['bauhaus', 'swiss', 'vaporwave', 'cottagecore', 'grandmillennial', 'glassmorphism'];

/** id -> { url, y: scroll offset, wait: ms to settle, scheme, crop: region of
    the W x H frame to enlarge, pre: page setup before the shot } */
const shots = {
  // Dark, dense and without its control box: in light the bark is nearly
  // invisible at this size.
  'bdl-001': {
    url: `${BASE}/lab/bdl-001/`, wait: 2500, scheme: 'dark',
    pre: async (page) => {
      await page.evaluate(() => {
        const r = document.querySelector('input[type=range]');
        if (!r) return;
        r.value = r.max;
        r.dispatchEvent(new Event('input', { bubbles: true }));
        r.dispatchEvent(new Event('change', { bubbles: true }));
        // The control box: the nearest ancestor that also holds the seed field.
        let box = r.parentElement;
        while (box && !box.querySelector('input[type=text], input:not([type])')) box = box.parentElement;
        if (box && box !== document.body) box.style.visibility = 'hidden';
      });
    },
  },
  'bdl-002': { url: `${BASE}/lab/bdl-002/`, y: 380 },
  'bdl-007': { url: `${BASE}/lab/bdl-007/`, wait: 1200, crop: { left: 140, top: 20, width: 912, height: 570 } },
  'bdl-008': { url: 'https://demo-magnolia-mane-salon.birchdesignlab.workers.dev/' },
  'bdl-009': { url: 'https://demo-bayou-kitchen.birchdesignlab.workers.dev/' },
  'bdl-012': { url: `${BASE}/lab/bdl-012/`, wait: 1500 },
  'bdl-013': { url: `${BASE}/lab/bdl-013/`, wait: 1500 },
};
const want = process.argv.slice(2);
const ids = want.length ? want : [...Object.keys(shots), 'bdl-011'];

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

/** The page (or `crop` within it) as a sharp image. Shot at 2x so a crop
    stays sharp once it is sized to the frame. */
async function shoot(url, { y = 0, wait = 800, scheme = 'light', crop, pre, width = W, height = H } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: scheme });
  await suppressPrompt(ctx);
  await ctx.addInitScript((v) => { try { localStorage.setItem('scheme', v); } catch {} }, scheme);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // Our own pages only: the demos' CSP refuses inline styles, and they have
  // none of this chrome to hide.
  if (url.startsWith(BASE)) await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => document.fonts.ready);
  if (pre) await pre(page);
  if (y) await page.evaluate((v) => scrollTo(0, v), y);
  await page.waitForTimeout(wait);
  let img = sharp(await page.screenshot());
  if (crop) img = img.extract({ left: crop.left * 2, top: crop.top * 2, width: crop.width * 2, height: crop.height * 2 });
  const buf = await img.toBuffer();
  await ctx.close();
  return sharp(buf);
}

for (const id of ids) {
  const out = `src/content/lab/${id}/thumb.png`;
  mkdirSync(`src/content/lab/${id}`, { recursive: true });
  if (id === 'bdl-011') {
    // Six homes, three across, two down, each shot at the tile's own shape so
    // the school lays itself out for it.
    const tw = W / 3, th = H / 2;
    const tiles = [];
    for (const s of SCHOOLS) tiles.push(await (await shoot(`${BASE}/t/${s}/`, { wait: 1500, width: 960, height: 900 })).resize(tw, th).toBuffer());
    await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite(tiles.map((input, i) => ({ input, left: (i % 3) * tw, top: Math.floor(i / 3) * th })))
      .png().toFile(out);
  } else if (shots[id]) {
    await (await shoot(shots[id].url, shots[id])).resize(W, H).png().toFile(out);
  } else {
    console.log('skip', id, '(no capture defined)');
    continue;
  }
  console.log('wrote', out);
}
await browser.close();
