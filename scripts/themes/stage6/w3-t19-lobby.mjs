/**
 * Stage 6 wave 3, task 19 (vaporwave C4): the mall's fountain against the
 * lobby floor's horizon. For each width: the centre jet's top against the
 * floor's top edge (the horizon; the jet must stay below it), the stem's
 * span against the bowl and the basin, and the rail, fountain and Venus
 * boxes so the phone mall's three props can be checked for overlap.
 *
 *   node scripts/themes/stage6/w3-t19-lobby.mjs
 */
import { launch, open } from './w3-t19-lib.mjs';

const widths = [1440, 1280, 1024, 900, 820, 761, 700, 620, 430, 390, 360];
const browser = await launch();
for (const width of widths) {
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/services/', width, scheme: 'dark', settle: 300 });
  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(`.lobby-mall ${s}`);
    const box = (s) => { const b = q(s).getBoundingClientRect(); return { l: +b.left.toFixed(1), r: +b.right.toFixed(1), t: +b.top.toFixed(1), b: +b.bottom.toFixed(1) }; };
    const venusImg = box('.lobby-venus img');
    return {
      jetTop: box('.fn-jet-c').t, floorTop: box('.lobby-floor').t,
      stem: box('.fn-stem'), bowl: box('.fn-bowl'), basin: box('.fn-basin'),
      rail: getComputedStyle(q('.mall-rail')).display === 'none' ? null : box('.mall-rail'),
      fountain: box('.mall-fountain'), venusImg,
    };
  });
  const clear = +(r.jetTop - r.floorTop).toFixed(1);
  const stemOk = r.stem.t <= r.bowl.b + 1 && r.stem.b >= r.basin.t;
  console.log(width, 'jetTop-floorTop', clear, clear > 0 ? 'BELOW horizon' : 'ABOVE', '| stem', JSON.stringify(r.stem), 'bowl.b', r.bowl.b, 'stem spans bowl to basin', stemOk,
    '| rail', r.rail && `${r.rail.l}-${r.rail.r}`, 'fountain', `${r.fountain.l}-${r.fountain.r}`, 'venusImg', `${r.venusImg.l}-${r.venusImg.r}`);
  await ctx.close();
}
await browser.close();
