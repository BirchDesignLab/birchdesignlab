/**
 * Zoomed crops of the .kana billboards on Sent and About, at a high device
 * scale factor, to eyeball whether Dela Gothic One's kanji fill solid
 * (sent-kanji-blobs: font-weight 700 synthesized a bold that blobbed
 * メッセージ送信完了 and シャイニング・ツリー). Written for the B1 fixer pass
 * that dropped both to weight 400; kept here in case the same check is
 * needed again on a later kana or weight change.
 *
 * Usage: node scripts/themes/vaporwave/zoom-kana-check.mjs [baseUrl]
 * Output: scripts/themes/.out/sent-kana-zoom.png, about-kana-zoom.png
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:4473';
mkdirSync('scripts/themes/.out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });
for (const [path, sel, out] of [
  ['/t/vaporwave/contact/sent/', '.kana', 'sent-kana-zoom.png'],
  ['/t/vaporwave/about/', '.kana', 'about-kana-zoom.png'],
]) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$(sel);
  await el.screenshot({ path: `scripts/themes/.out/${out}` });
  console.log('wrote', out);
}
await browser.close();
