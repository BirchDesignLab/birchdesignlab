/**
 * Preload for capture.mjs (or any Playwright script here) that makes every
 * page's Math.random a fixed seeded sequence.
 *
 * Written 09-23-26 for Tier 3 stage 2 (cottagecore item 3, the 337 KB page).
 * Its acceptance is a pixel diff of the stills before and after the HTML cut,
 * but cottagecore's dark stills are not repeatable: fx.ts scatters the
 * fireflies with Math.random, so two captures of the same build differ by
 * 0.1 to 0.7% of the page (measured). Seeding Math.random before any page
 * script runs puts the motes in the same place on every capture, so the diff
 * sees only what the build changed.
 *
 * It wraps chromium.launch so every new context gets an init script, which
 * leaves capture.mjs itself untouched.
 *
 * Usage:
 *   BDL_GPU=1 node --import ./scripts/themes/harness/seed-random.mjs \
 *     scripts/themes/capture.mjs --base http://127.0.0.1:4464 --routes ... --label ...
 */
import { chromium } from 'playwright';

const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...cargs) => {
    const context = await newContext(...cargs);
    await context.addInitScript(() => {
      // mulberry32, the generator Pressed.astro uses at build time.
      let a = 0x2f6644;
      Math.random = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    });
    return context;
  };
  return browser;
};
