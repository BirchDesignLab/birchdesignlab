/**
 * The scripted takes for the screen captures: what the visitor does, in order,
 * with real input on the real dev-server page.
 *
 * A take is `{ id, start, scheme, run(c) }`. `c` is the controller from
 * `controller()`: it paces the take against the clip clock, moves a real mouse,
 * and reaches into the switcher's shadow root. Nothing here fakes a state; a
 * school change is the visitor's own two clicks (open the list, pick a row) and
 * the page is not considered "landed" until the router has finished its
 * transition.
 *
 * Durations come from the calendar (manifest `duration_s`). A take that runs
 * past its slot throws instead of being trimmed: a clip cut mid-gesture is a
 * defect the verifier cannot see.
 */

const SWITCHER = 'document.querySelector("bdl-switcher").shadowRoot';

export function controller(page, t0) {
  const events = [];
  const now = () => Date.now() / 1000 - t0;
  let pointer = { x: 195, y: 420 };

  const c = {
    page,
    events,
    now,
    log(label, extra = {}) {
      events.push({ t: +now().toFixed(3), label, ...extra });
    },
    /** Wait until the clip clock reads `t`. Returns how many seconds late we already were (0 when on time). */
    async until(t) {
      const wait = (t - now()) * 1000;
      if (wait > 0) await page.waitForTimeout(wait);
      return Math.max(0, -wait / 1000);
    },
    async pause(seconds) {
      await page.waitForTimeout(seconds * 1000);
    },

    /** A handle into the switcher's shadow root. */
    shadow(selector) {
      return page.evaluateHandle(
        ([s, sel]) => new Function(`return ${s}.querySelector(${JSON.stringify(sel)})`)(),
        [SWITCHER, selector],
      ).then((h) => h.asElement());
    },

    /** Centre of an element in viewport CSS px. */
    async centre(handle) {
      const box = await handle.boundingBox();
      if (!box) throw new Error('element has no box (hidden or detached)');
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    },

    /**
     * Call `step(u)` as fast as the page will take it for `seconds`, u running
     * 0..1 by the CLOCK. A step-counted loop took ~36ms a step where it asked
     * for 16, and turned a 3.2s pull into 7s.
     */
    async glide(seconds, step) {
      const start = Date.now();
      for (;;) {
        const u = Math.min(1, (Date.now() - start) / (seconds * 1000));
        await step(u);
        if (u >= 1) break;
      }
    },

    /** Move the real mouse there along a short path, as a hand would. */
    async moveTo(x, y, { steps = 14 } = {}) {
      await page.mouse.move(x, y, { steps });
      pointer = { x, y };
    },

    /** A real click: the pointer travels to the centre, rests a beat, presses. */
    async click(handle, { steps = 9, rest = 50 } = {}) {
      const { x, y } = await c.centre(handle);
      await c.moveTo(x, y, { steps });
      await page.waitForTimeout(rest);
      await page.mouse.click(x, y);
    },

    /**
     * Press, hold for `seconds`, release. `expect` runs in the page a moment
     * after the press and must return true: a hold that changed nothing is a
     * take that filmed nothing, and verification cannot see that.
     */
    async hold(handle, seconds, { expect, what = 'hold' } = {}) {
      const { x, y } = await c.centre(handle);
      await c.moveTo(x, y);
      await page.waitForTimeout(80);
      await page.mouse.down();
      if (expect) {
        await page.waitForFunction(expect, null, { polling: 20, timeout: 800 }).catch(() => {
          throw new Error(`${what}: the press did not take effect`);
        });
      }
      await page.waitForTimeout(seconds * 1000);
      await page.mouse.up();
    },

    /**
     * Press on `handle`, travel `path` (offsets in CSS px from where it was
     * picked up) over `seconds`, hold `dwell`, release. The path is clamped to
     * the window, so a shape is carried but never shoved off it, and the shape
     * must read as picked up (data-held) once pressed.
     */
    async drag(handle, path, { seconds = 1.0, dwell = 0.3, what = 'drag' } = {}) {
      const from = await c.centre(handle);
      const win = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      await c.moveTo(from.x, from.y);
      await page.waitForTimeout(80);
      await page.mouse.down();
      const picked = await page
        .waitForFunction(() => !!document.querySelector('[data-held]'), null, { polling: 20, timeout: 800 })
        .then(() => true, () => false);
      if (!picked) throw new Error(`${what}: the shape was not picked up`);
      await c.glide(seconds, async (u) => {
        const p = path(u);
        await page.mouse.move(clamp(from.x + p.x, 24, win.w - 24), clamp(from.y + p.y, 24, win.h - 96));
      });
      await page.waitForTimeout(dwell * 1000);
      await page.mouse.up();
    },

    /** Open the school list: the bar's School button. */
    async openList() {
      await c.click(await c.shadow('.open'));
      await page.waitForFunction(
        (s) => new Function(`return ${s}.querySelector("dialog").open`)(),
        SWITCHER,
        { polling: 20, timeout: 3000 },
      );
      c.log('list open');
    },

    /** Pick a school's row in the open list, scrolling the list with the wheel if the row is out of view. */
    async pickSchool(id) {
      const row = await c.shadow(`a[data-school="${id}"]`);
      for (let tries = 0; tries < 8; tries++) {
        // Pixels to scroll the list so the whole row is in its window: negative
        // when the row is above it, positive when below, 0 when in view. Exact,
        // not a fixed step: in a short window a row is nearly as tall as the
        // list, and a step bigger than the slack overshoots one way then the other.
        const need = await row.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const l = el.closest('ul').getBoundingClientRect();
          const margin = 10;
          return r.top < l.top ? r.top - l.top - margin : r.bottom > l.bottom ? r.bottom - l.bottom + margin : 0;
        });
        if (need === 0) break;
        const list = await c.shadow('ul');
        const at = await c.centre(list);
        await c.moveTo(at.x, at.y, { steps: 6 });
        await page.mouse.wheel(0, Math.round(need));
        await page.waitForTimeout(320); // let the list stop moving: a row clicked mid-scroll is missed
      }
      await c.click(row);
      // A click that landed on a row still moving leaves the dialog open: try once more.
      const closed = await page
        .waitForFunction((s) => new Function(`return !${s}.querySelector("dialog").open`)(), SWITCHER, { polling: 20, timeout: 1200 })
        .then(() => true, () => false);
      if (!closed) {
        c.log(`${id} row missed; clicking again`);
        await c.click(row);
      }
      c.log(`picked ${id}`);
    },

    /** The router has finished: right address, theme set, transition attribute gone. */
    async landed(id) {
      await page.waitForFunction(
        (sid) =>
          location.pathname.startsWith(`/t/${sid}/`) &&
          document.documentElement.dataset.theme === sid &&
          !document.documentElement.hasAttribute('data-astro-transition'),
        id,
        { polling: 16, timeout: 8000 },
      );
      c.log(`landed ${id}`);
    },

    /** A shape in a poster cannot be picked up while its build animation runs (bauhaus loose.ts: stillBuilding). */
    async settleBuild(selector) {
      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel);
          return !!el && !el.getAnimations({ subtree: true }).some((a) => a.playState !== 'finished' && a.playState !== 'idle');
        },
        selector,
        { polling: 50, timeout: 6000 },
      );
      c.log(`built ${selector}`);
    },

    /** The switcher's light/dark button. */
    async toggleScheme() {
      await c.click(await c.shadow('.scheme'));
      c.log('scheme toggled');
    },
  };
  return c;
}

/** ease in-out for pointer paths */
const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2);

export const TAKES = {
  // The Portal tour: quiet, then each school through the switcher, then home.
  VP1: {
    start: '/t/quiet/',
    scheme: 'dark',
    async run(c) {
      const order = ['swiss', 'bauhaus', 'vaporwave', 'glassmorphism', 'grandmillennial', 'cottagecore', 'quiet'];
      // 2.8s a school, of which the list and the router's swap take ~1.3s; the
      // critic found 2.6s left only ~0.9s of clean page per school.
      const SLOT = 2.8;
      const FIRST = 1.0;
      c.log('start on quiet');
      for (let i = 0; i < order.length; i++) {
        const late = await c.until(FIRST + i * SLOT);
        c.log(`slot ${i + 1} (${order[i]}) ${late > 0.05 ? `began ${late.toFixed(2)}s late` : 'on time'}`);
        await c.openList();
        await c.pause(0.1);
        await c.pickSchool(order[i]);
        await c.landed(order[i]);
      }
    },
  },

  // Swiss with the grid key held, Bauhaus with a shape dragged, both schemes.
  // The recorder keeps filming to the end of the slot, so the last release
  // plays out on screen.
  VP2: {
    start: '/t/swiss/',
    scheme: 'light',
    async run(c) {
      const page = c.page;
      const key = await page.$('[data-sw-grid-key]');
      if (!key) throw new Error('no grid key on /t/swiss/');
      const gridHeld = () => document.querySelector('[data-sw-grid-key]')?.hasAttribute('data-held');
      await c.until(0.6);
      c.log('hold grid key (light)');
      await c.hold(key, 2.6, { expect: gridHeld, what: 'grid key (light)' });
      await c.until(4.0);
      await c.toggleScheme();
      await c.until(5.0);
      c.log('hold grid key (dark)');
      await c.hold(key, 2.4, { expect: gridHeld, what: 'grid key (dark)' });
      await c.until(8.0);
      await c.openList();
      await c.pause(0.1);
      await c.pickSchool('bauhaus');
      await c.landed('bauhaus');
      await c.settleBuild('.loose[aria-label^="Blue circle"]');
      await c.until(11.0);
      c.log('drag circle (dark)');
      await c.drag(await page.$('.loose[aria-label^="Blue circle"]'), (u) => ({ x: -90 * ease(u), y: 70 * Math.sin(Math.PI * u * 0.8) }), { seconds: 1.2, dwell: 0.3, what: 'circle' });
      c.log('circle released');
      await c.pause(0.7); // the snap-back is 360ms; let it be seen before the next move
      await c.until(13.4);
      await c.toggleScheme();
      await c.until(14.4);
      c.log('drag square (light)');
      await c.drag(await page.$('.loose[aria-label^="Red square"]'), (u) => ({ x: 90 * ease(u), y: -80 * ease(u) }), { seconds: 1.1, dwell: 0.3, what: 'square' });
      c.log('square released');
    },
  },

  // The Bark Engine. Typing a seed only swaps the dashes (BarkEngine.svelte
  // rebuild(): no growTree), so the regrow is New tree's, shown first; then the
  // seed is cleared and "birch" typed, which ends on the default tree; then the
  // density is pulled once, slowly, and the pointer wakes the bark.
  V001: {
    start: '/lab/bdl-001',
    scheme: 'dark',
    async run(c) {
      const page = c.page;
      const seed = await page.$('input[type="text"]');
      const slider = await page.$('input[type="range"]');
      const fresh = await page.$('button:has-text("New tree")');
      if (!seed || !slider || !fresh) throw new Error('/lab/bdl-001 is missing the seed field, the density slider or New tree');
      await c.until(1.0);
      c.log('new tree (regrow)');
      await c.click(fresh);
      await c.until(3.6); // the grow-in is 1.4s; let it finish
      await c.click(seed);
      await page.keyboard.press('End');
      c.log('clearing seed');
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Backspace');
        await c.pause(0.16);
      }
      await c.pause(0.3);
      c.log('typing seed');
      await page.keyboard.type('birch', { delay: 320 });
      const typed = await seed.inputValue();
      if (typed !== 'birch') throw new Error(`seed field reads "${typed}", wanted "birch"`);
      await c.until(8.0);
      const range = await slider.evaluate((el) => ({ min: Number(el.min), max: Number(el.max), value: Number(el.value) }));
      const box = await slider.boundingBox();
      const thumb = (v) => box.x + 10 + ((box.width - 20) * (v - range.min)) / (range.max - range.min);
      const y = box.y + box.height / 2;
      await c.moveTo(thumb(range.value), y);
      await c.pause(0.2);
      c.log('pull density');
      await page.mouse.down();
      await c.glide(3.2, (u) => page.mouse.move(thumb(range.value + (440 - range.value) * ease(u)), y));
      await c.pause(0.3);
      await page.mouse.up();
      // The bark wakes under the pointer: sweep it across the canvas.
      c.log('pointer across the bark');
      const canvas = await page.$('canvas');
      const cb = await canvas.boundingBox();
      const sweepY = cb.y + cb.height * 0.2;
      await c.moveTo(cb.x + 30, sweepY, { steps: 8 });
      await c.glide(1.5, (u) => page.mouse.move(cb.x + 30 + (cb.width - 60) * ease(u), sweepY + 40 * Math.sin(Math.PI * u)));
    },
  },
};
