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

    /** Move the real mouse there along a short path, as a hand would. */
    async moveTo(x, y, { steps = 14 } = {}) {
      await page.mouse.move(x, y, { steps });
      pointer = { x, y };
    },

    /** A real click: the pointer travels to the centre, rests a beat, presses. */
    async click(handle, { steps = 14, rest = 90 } = {}) {
      const { x, y } = await c.centre(handle);
      await c.moveTo(x, y, { steps });
      await page.waitForTimeout(rest);
      await page.mouse.click(x, y);
    },

    /** Press, hold for `seconds`, release. */
    async hold(handle, seconds) {
      const { x, y } = await c.centre(handle);
      await c.moveTo(x, y);
      await page.waitForTimeout(80);
      await page.mouse.down();
      await page.waitForTimeout(seconds * 1000);
      await page.mouse.up();
    },

    /** Press on `handle`, travel the path over `seconds`, hold `dwell`, release. */
    async drag(handle, path, { seconds = 1.0, dwell = 0.3 } = {}) {
      const from = await c.centre(handle);
      await c.moveTo(from.x, from.y);
      await page.waitForTimeout(80);
      await page.mouse.down();
      const stepMs = 16;
      const n = Math.max(1, Math.round((seconds * 1000) / stepMs));
      for (let i = 1; i <= n; i++) {
        const p = path(i / n);
        await page.mouse.move(from.x + p.x, from.y + p.y);
        await page.waitForTimeout(stepMs);
      }
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
      for (let tries = 0; tries < 12; tries++) {
        // -1: the row is above the list's window, +1: below it, 0: in view.
        const where = await row.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const l = el.closest('ul').getBoundingClientRect();
          return r.top < l.top ? -1 : r.bottom > l.bottom ? 1 : 0;
        });
        if (where === 0) break;
        const list = await c.shadow('ul');
        const at = await c.centre(list);
        await c.moveTo(at.x, at.y, { steps: 6 });
        await page.mouse.wheel(0, where * 220);
        await page.waitForTimeout(260); // let the list stop moving: a row clicked mid-scroll is missed
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
      const SLOT = 2.6;
      const FIRST = 1.3;
      c.log('start on quiet');
      for (let i = 0; i < order.length; i++) {
        const late = await c.until(FIRST + i * SLOT);
        c.log(`slot ${i + 1} (${order[i]}) ${late > 0.05 ? `began ${late.toFixed(2)}s late` : 'on time'}`);
        await c.openList();
        await c.pause(0.25);
        await c.pickSchool(order[i]);
        await c.landed(order[i]);
      }
    },
  },

  // Swiss with the grid key held, Bauhaus with a shape dragged, both schemes.
  VP2: {
    start: '/t/swiss/',
    scheme: 'light',
    async run(c) {
      const page = c.page;
      const key = await page.$('[data-sw-grid-key]');
      if (!key) throw new Error('no grid key on /t/swiss/');
      await c.until(1.0);
      c.log('hold grid key (light)');
      await c.hold(key, 2.6);
      await c.until(4.3);
      await c.toggleScheme();
      await c.until(5.5);
      c.log('hold grid key (dark)');
      await c.hold(key, 2.4);
      await c.until(8.6);
      await c.openList();
      await c.pause(0.25);
      await c.pickSchool('bauhaus');
      await c.landed('bauhaus');
      await c.settleBuild('.loose[aria-label^="Blue circle"]');
      await c.until(11.2);
      c.log('drag circle (dark)');
      await c.drag(await page.$('.loose[aria-label^="Blue circle"]'), (u) => ({ x: 130 * ease(u), y: -150 * Math.sin(Math.PI * u * 0.9) }), { seconds: 1.1, dwell: 0.35 });
      await c.until(14.0);
      await c.toggleScheme();
      await c.until(14.9);
      c.log('drag square (light)');
      await c.drag(await page.$('.loose[aria-label^="Red square"]'), (u) => ({ x: 150 * ease(u), y: -110 * ease(u) }), { seconds: 1.0, dwell: 0.35 });
    },
  },

  // The Bark Engine: type the seed, pull the density.
  V001: {
    start: '/lab/bdl-001',
    scheme: 'dark',
    async run(c) {
      const page = c.page;
      await c.until(1.8);
      const seed = await page.$('input[type="text"]');
      if (!seed) throw new Error('no seed field on /lab/bdl-001');
      await c.click(seed);
      await page.keyboard.press('Control+A');
      await c.pause(0.25);
      c.log('typing seed');
      await page.keyboard.type('birch', { delay: 230 });
      await c.until(6.2);
      const slider = await page.$('input[type="range"]');
      if (!slider) throw new Error('no density slider on /lab/bdl-001');
      const box = await slider.boundingBox();
      const thumb = (v) => box.x + 10 + ((box.width - 20) * (v - 30)) / 570;
      const y = box.y + box.height / 2;
      await c.moveTo(thumb(180), y);
      await c.pause(0.2);
      c.log('pull density');
      await page.mouse.down();
      const n = 90;
      for (let i = 1; i <= n; i++) {
        await page.mouse.move(thumb(180 + (440 - 180) * ease(i / n)), y);
        await page.waitForTimeout(16);
      }
      await c.pause(0.3);
      await page.mouse.up();
    },
  },
};
