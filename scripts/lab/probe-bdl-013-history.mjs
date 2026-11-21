// Probes BDL-013's sheet history and wall-label fit against a served build.
//
//   node scripts/themes/snap.mjs --name og013 --reuse --port 4477 -- node scripts/lab/probe-bdl-013-history.mjs
//
// Base URL from SNAP_BASE (snap.mjs sets it) or --base. Checks:
//  1. ?detail=2, Next, Back lands on detail 2 (was sheet 0: critic C2, T1).
//  2. The first push drops ?detail= so reload follows the hash.
//  3. Plain sheet 0, Next x2, Back x2 walks 2 -> 1 -> 0.
//  4. At 1920x1080 the drawing re-centres when the open wall label folds (C3).
//  5. At 740x600 an open wall label does not lift the phone bar (r1 N1).
// Exits 1 on any failure.
import { chromium } from 'playwright';

const at = process.argv.indexOf('--base');
const base = at >= 0 ? process.argv[at + 1] : process.env.SNAP_BASE || 'http://127.0.0.1:4400';
const url = (q = '') => `${base}/lab/bdl-013/${q}`;
const detail = (p) => p.evaluate(() => document.querySelector('.ds')?.getAttribute('data-detail'));
const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await p.goto(url('?detail=2'));
  await p.click('#next');
  check((await detail(p)) === '3', 'deep link ?detail=2, Next -> 3');
  check(!new URL(p.url()).searchParams.has('detail') && p.url().endsWith('#detail-3'), `push drops ?detail (url ${p.url()})`);
  await p.goBack();
  check((await detail(p)) === '2', `Back -> 2 (got ${await detail(p)})`);
  await p.goForward();
  await p.reload();
  check((await detail(p)) === '3', 'reload follows the hash -> 3');

  await p.goto(url());
  await p.click('#next');
  await p.click('#next');
  await p.goBack();
  check((await detail(p)) === '1', 'sheet, Next x2, Back -> 1');
  await p.goBack();
  check((await detail(p)) === '0', 'Back again -> 0');

  const w = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await w.goto(url());
  const left = () => w.evaluate(() => Math.round(document.getElementById('stage').getBoundingClientRect().left));
  const open = await w.evaluate(() => document.querySelector('details.label')?.open);
  const l0 = await left();
  if (open) {
    await w.click('details.label > summary');
    await w.waitForTimeout(300);
  }
  const l1 = await left();
  const rootW = await w.evaluate(() => document.querySelector('.ds').clientWidth);
  const stageW = await w.evaluate(() => Math.round(document.getElementById('stage').getBoundingClientRect().width));
  check(Math.abs(l1 - (rootW - stageW) / 2) <= 2, `1920 folded label: drawing centred (label open at load: ${open}, left ${l0} -> ${l1})`);

  const t = await browser.newPage({ viewport: { width: 740, height: 600 } });
  await t.goto(url());
  const lift = () => t.evaluate(() => getComputedStyle(document.querySelector('.ds')).getPropertyValue('--ds-nav-bottom').trim());
  const folded = await lift();
  await t.click('details.label > summary');
  await t.waitForTimeout(300);
  const opened = await lift();
  check(opened === '' || parseInt(opened, 10) <= parseInt(folded || '0', 10), `740x600 open label does not lift the bar (folded ${folded || 'none'}, open ${opened || 'none'})`);
} finally {
  await browser.close();
}
if (fails.length) { console.error(`${fails.length} failed`); process.exit(1); }
console.log('all passed');
