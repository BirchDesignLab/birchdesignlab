/**
 * Does Chromium fire pointerout on a row of a modal <dialog> that closes
 * under a still mouse (the switcher's rows, when a click on one closes the
 * dialog and navigates)? runtime.ts drawOnIntent() forgets the row it is
 * timing only on pointerout/focusout; if none fires, the row stays remembered
 * and a later rest on the same row, after the dialog reopens, starts no timer.
 *
 * Written 09-24-26 for the Tier 3 Stage 2 review panel (code lens). A bare
 * page, no build: logs the boundary events the dialog sees across
 * hover row, click (closes), move, reopen, hover the same row again.
 *
 *   BDL_GPU=1 node scripts/themes/harness/dialog-boundary-probe.mjs
 */
import { chromium } from 'playwright';

const gpu = process.env.BDL_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [];
const browser = await chromium.launch({ args: gpu });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent(`
  <button id="open" style="position:fixed;left:10px;top:10px">open</button>
  <dialog id="d" style="width:300px"><a id="row" href="#x" style="display:block;height:60px">row <span>era</span></a></dialog>
  <script>
    window.log = [];
    const d = document.getElementById('d');
    for (const t of ['pointerover', 'pointerout', 'focusin', 'focusout'])
      d.addEventListener(t, (e) => log.push(t + ':' + (e.target.id || e.target.tagName)));
    document.getElementById('row').addEventListener('click', (e) => { e.preventDefault(); d.close(); });
    document.getElementById('open').addEventListener('click', () => d.showModal());
  </script>`);
await page.click('#open');
const box = await page.locator('#row').boundingBox();
const cx = box.x + 20, cy = box.y + 20;
await page.mouse.move(cx, cy);
await page.waitForTimeout(100);
const mark = async (label) => console.log(label.padEnd(28), JSON.stringify(await page.evaluate(() => log.splice(0))));
await mark('hover row');
await page.mouse.down(); await page.mouse.up();
await page.waitForTimeout(200);
await mark('click (dialog closes)');
await page.mouse.move(cx + 3, cy + 3);
await page.waitForTimeout(200);
await mark('mouse moves (still)');
await page.evaluate(() => document.getElementById('d').showModal());
await page.waitForTimeout(200);
await mark('reopen under the mouse');
await page.mouse.move(cx + 6, cy + 6);
await page.waitForTimeout(200);
await mark('mouse moves on the row');
await browser.close();
