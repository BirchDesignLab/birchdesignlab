import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../src/themes/cottagecore/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, ROOT), 'utf8').replace(/\r\n/g, '\n');
const fx = read('fx.ts');
const css = read('theme.css');
const meta = read('meta.ts');
const home = read('pages/Home.astro');

/* Stage 6 wave 2 task 16: CC1 to CC6. */
describe('cottagecore fireflies on phones (CC1)', () => {
  it('has about 10 motes on 2.5 to 5 s rests on a phone, the desktop count and rests unchanged', () => {
    expect(fx).toMatch(/phoneCount: 10,/);
    expect(fx).toMatch(/phoneDarkMin: 2500,/);
    expect(fx).toMatch(/phoneDarkMax: 5000,/);
    expect(fx).toMatch(/width < SEED\.phoneWidth \? FIREFLY\.phoneCount : Math\.round\(Math\.min\(18, Math\.max\(7,/);
    expect(fx).toMatch(/const restFor = \(phone: boolean\) => \(phone \? rand\(FIREFLY\.phoneDarkMin, FIREFLY\.phoneDarkMax\) : rand\(FIREFLY\.darkMin, FIREFLY\.darkMax\)\)/);
  });

  it('re-seats a mote nobody can see onto open cloth, after the fonts have settled', () => {
    const place = fx.slice(fx.indexOf('const fireflyPlaceOk'), fx.indexOf('const seatFirefly'));
    // on the screen, clear of text by its pad, off every sheet
    expect(place).toMatch(/m\.x >= 0 && m\.x <= width && m\.y >= 0 && m\.y <= height/);
    expect(place).toMatch(/inAnyBox\(m\.x, m\.y \+ sy, textBoxes, fireflyPad\(m\.r, phone\)\)/);
    expect(place).toMatch(/inAnyBox\(m\.x, m\.y \+ sy, coverBoxes/);
    const keep = fx.slice(fx.indexOf('const keepFireflies'), fx.indexOf('const answerTap'));
    expect(keep).toMatch(/if \(!fireflyPlaceOk\(m, sy, phone\)\) seatFirefly\(m, t, sy, phone\)/);
    expect(fx).toMatch(/if \(fontsSettled && \(switched \|\| t - lastFireflyKeepT > FIREFLY\.keepEvery\)\)/);
    // the sheets include the hoop, an opaque disc
    expect(fx).toMatch(/querySelectorAll\('\.cc-paper, \.cc-torn, \.cc-gingham, \.hoop'\)/);
  });

  it('keeps a burst showing on a phone by calling the soonest mote early', () => {
    const keep = fx.slice(fx.indexOf('const keepFireflies'), fx.indexOf('const answerTap'));
    expect(keep).toMatch(/if \(!phone\) return;/);
    expect(keep).toMatch(/m\.rest <= t \+ FIREFLY\.paceAhead/);
    expect(keep).toMatch(/soonest\.rest = t \+ rand\(FIREFLY\.paceWait\[0\], FIREFLY\.paceWait\[1\]\)/);
  });
});

describe('cottagecore the tap (CC2)', () => {
  it('works out on the tap whether it landed on clear cloth', () => {
    const fn = fx.slice(fx.indexOf('const tapIsClear'), fx.indexOf('const onPointerMove'));
    expect(fn).toMatch(/closest\('a, button, input, textarea, select, label, summary, \[role="button"\], \.cc-paper, \.cc-torn, \.cc-gingham'\)/);
    expect(fn).toMatch(/inAnyBox\(e\.clientX, e\.clientY \+ sy, textBoxes, fireflyPad\(2\.4,/);
    expect(fn).toMatch(/!onSheet\(/);
    // set on both routes to a tap: a mouse press and a touch release
    expect(fx.match(/tap\.clear = tapIsClear\(e\);/g)?.length).toBe(2);
  });

  it('calls the nearest mote within 160 px to drift there and burst twice, or lights a new one', () => {
    expect(fx).toMatch(/callRadius: 160,/);
    const fn = fx.slice(fx.indexOf('const answerTap'), fx.indexOf('const drawFireflies'));
    expect(fn).toMatch(/m\.call = \{ x: tap\.x, y: tap\.y, until: t \+ FIREFLY\.callMs \}/);
    expect(fn).toMatch(/nearest \?\? newFirefly\(tap\.x, tap\.y, 1\.8\)/);
    expect(fn).toMatch(/makeBurst\(t \+ \(nearest \? FIREFLY\.callLead : 100\), 2\)/);
    expect(fn).toMatch(/lit\.length > FIREFLY\.extraMax/);
    expect(fx).toMatch(/if \(tap\.pending && tap\.clear\) answerTap\(t, phone\)/);
  });

  it('keeps a finger drag a scroll, never a tap (the Stage 5 fix holds)', () => {
    expect(fx).toMatch(/addEventListener\('pointercancel', onPointerCancel/);
    const up = fx.slice(fx.indexOf('const onPointerUp'), fx.indexOf('const onPointerCancel'));
    expect(up).toMatch(/if \(!p \|\| p\.moved\) return;/);
  });
});

describe('cottagecore seeds (CC3)', () => {
  it('counts a seat only when the whole fan clears the edges, sheets and text with a margin, the stalk on screen', () => {
    expect(fx).toMatch(/seatMargin: 8,/);
    const fits = fx.slice(fx.indexOf('const seedFits'), fx.indexOf('const seatClear'));
    expect(fits).toMatch(/drawnPoints\(x, y, k, turn, angle\)\.slice\(0, 3\)/);
    expect(fits).toMatch(/px < m \|\| px > width - m \|\| py < m \|\| py > height - m/);
    // the stalk points are tested as the fan's are: inside by the margin and off every sheet
    expect(fits).toMatch(/at\(0, 35 \* k\), at\(0, 70 \* k\)/);
    expect(fits).toMatch(/inAnyBox\(px, py \+ sy, coverBoxes, m \/ 2\)/);
    expect(fx).toMatch(/seedHitsText\(x, y \+ sy, k, textBoxes, angle, SEED\.seatMargin\)/);
  });

  it('has no looser seat tier: a view with no strict seat gets fewer seeds, not a wedged one', () => {
    expect(fx).not.toMatch(/fanWhole|stalkOnScreen|strict: boolean/);
    expect(fx).toMatch(/for \(const size of sizes\)/);
    const clear = fx.slice(fx.indexOf('const seatClear'), fx.indexOf('const seatLife'));
    expect(clear).toMatch(/seedFits\(x, y, k, sy, turn, angle\) && !seedHitsText/);
    // a seat must last, so a seed is not seated on a patch it slides off in a second
    expect(fx).toMatch(/seatMinLife: 2,/);
    expect(fx).toMatch(/if \(clear < SEED\.seatMinLife\) continue;/);
  });

  it('holds every seed unseen from mount until a strict seat is found: none fades in where it was thrown', () => {
    expect(fx).toMatch(/spawnSeed\(s, true\);\s*s\.held = true;/);
    expect(fx).toMatch(/s\.held = false;/);
    const draw = fx.slice(fx.indexOf('const drawDandelions'), fx.indexOf('const draw = '));
    // a held seed is neither moved nor drawn, and is seated in the still frame too
    expect(draw).toMatch(/if \(s\.held\) continue;\s*if \(!still\) \{/);
    expect(draw).toMatch(/else if \(fontsSettled\) seatHeld\(sy, t, 0, true\);/);
    expect(draw).toMatch(/seatHeld\(sy, t, shown, false\)/);
  });

  it('prefers the side gutters, counts a fresh seat as there, and lets minShown fall to what fits', () => {
    // the breeze runs right, so only the upwind gutter earns the bonus (a right-edge seat is out in seconds)
    expect(fx).toMatch(/x < width \* SEED\.gutterShare \? SEED\.gutterBonus : 0/);
    expect(fx).toMatch(/t - o\.seatedAt < SEED\.seatSettleMs/);
    expect(fx).toMatch(/if \(!seatSeed\(s, sy, t\)\) break;/);
  });
});

describe('cottagecore hover rules are a pointer\'s (CC4)', () => {
  /** The source with every `@media ... (hover: hover) and (pointer: fine) ... { }` block removed. */
  const ungated = (src: string) => {
    let out = '';
    let i = 0;
    const re = /@media[^{]*\(hover: hover\) and \(pointer: fine\)[^{]*\{/g;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      out += src.slice(i, m.index);
      let depth = 1;
      let j = m.index + m[0].length;
      for (; j < src.length && depth; j++) depth += src[j] === '{' ? 1 : src[j] === '}' ? -1 : 0;
      i = j;
      re.lastIndex = j;
    }
    return out + src.slice(i);
  };
  const files = ['theme.css', 'Header.astro', 'Footer.astro', 'pages/Home.astro', 'pages/About.astro', 'pages/Services.astro', 'pages/Contact.astro', 'pages/Sent.astro'];
  for (const f of files) {
    it(`${f} has no :hover outside (hover: hover) and (pointer: fine)`, () => {
      expect(ungated(read(f))).not.toMatch(/:hover/);
    });
  }
  it('splits .des so its focus style is ungated', () => {
    const rest = ungated(home);
    expect(rest).toMatch(/\.des:focus-visible \{/);
    expect(home).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.des:hover \{/);
  });
});

describe('cottagecore dark About hoop (CC5)', () => {
  it('lifts the linen to the board and gives it the board inks and a deepened thread palette', () => {
    expect(css).toMatch(/--hoop-cloth: var\(--board\);/);
    const rule = css.slice(css.indexOf("[data-scheme='dark'] .hoop .cloth {"));
    expect(rule).toMatch(/--mark: var\(--board-ink\);/);
    expect(rule).toMatch(/--accent: var\(--board-accent\);/);
    expect(rule).toMatch(/--cc-stem: #56704a;/);
    expect(rule).toMatch(/--cc-rose-edge: #7a3440;/);
  });
  it('checks the manifesto and the maker\'s line against the board inks', () => {
    expect(meta).toMatch(/fg: '--board-ink', bg: \['--hoop-cloth'\]/);
    expect(meta).toMatch(/fg: '--board-accent', bg: \['--hoop-cloth'\]/);
  });
});

describe('cottagecore Home at tablet (CC6)', () => {
  it('slides the sheet right beside the name from 641 to 820 and leaves phones stacked', () => {
    const block = home.slice(home.indexOf('@media (min-width: 641px) and (max-width: 820px)'));
    expect(block).toMatch(/\.hero-copy \{ display: contents; \}/);
    expect(block).toMatch(/\.specimen \{ grid-column: 2; grid-row: 1 \/ 4; justify-self: end;/);
    expect(block).toMatch(/\.subline \{ grid-column: 1 \/ -1; grid-row: 4; \}/);
  });
});
