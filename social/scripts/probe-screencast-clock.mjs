/**
 * Do screencast frame timestamps (metadata.timestamp) run on the same clock, at
 * the same rate, as Date.now()? toFrames() lays frames on the clip's timeline
 * from those stamps, so a clock that differs in rate or offset would stretch or
 * shift every clip. Prints the offset between the two over a 6s take.
 * Usage: BDL_BASE=http://localhost:4400 BDL_GPU=1 node scripts/probe-screencast-clock.mjs
 */
import { siteUrl } from '../lib/devserver.mjs';
import { launch, phoneContext } from '../lib/screen-record.mjs';

const browser = await launch({ width: 390, height: 700, dpr: 3 });
const context = await phoneContext(browser, { width: 390, height: 700, dpr: 3, native: true });
const page = await context.newPage();
await page.goto(siteUrl('/t/quiet/'), { waitUntil: 'networkidle' });
const cdp = await context.newCDPSession(page);
const rows = [];
cdp.on('Page.screencastFrame', ({ metadata, sessionId }) => {
  rows.push({ stamp: metadata.timestamp, now: Date.now() / 1000 });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1170, maxHeight: 2100, everyNthFrame: 1 });
// Idle for 3s, then drive the switcher the way a take does: the transitions are
// where a recorder under load would show a clock that slips.
for (let i = 0; i < 6; i++) { await page.mouse.move(50 + i * 20, 300); await page.waitForTimeout(500); }
for (const id of ['bauhaus', 'vaporwave', 'glassmorphism', 'quiet']) {
  const open = await page.evaluateHandle(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open'));
  await open.asElement().click();
  await page.waitForTimeout(500);
  const row = await page.evaluateHandle((sid) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${sid}"]`), id);
  await row.asElement().click();
  await page.waitForTimeout(1500);
}
await cdp.send('Page.stopScreencast');
const offsets = rows.map((r) => r.now - r.stamp);
const first = rows[0];
const last = rows[rows.length - 1];
console.log(JSON.stringify({
  frames: rows.length,
  stampSpanS: +(last.stamp - first.stamp).toFixed(3),
  wallSpanS: +(last.now - first.now).toFixed(3),
  offsetFirstS: +(first.now - first.stamp).toFixed(3),
  offsetLastS: +(last.now - last.stamp).toFixed(3),
  // How late a frame reaches Node after its own stamp. A frame stamped when the
  // compositor swapped but delivered much later is fine for timing (the stamp
  // is what toFrames uses); it is a clock that SLIPS that would stretch a clip.
  deliveryLagMs: { min: +(Math.min(...offsets) * 1000).toFixed(1), max: +(Math.max(...offsets) * 1000).toFixed(1) },
}, null, 2));
await browser.close();
