// Chart 7, the Timeline showpiece: a birch trunk with every dated event hung off
// it as a bark mark, drawn downward once. The founding, the first live day, Portal
// day and today are picked out. Content is data/timeline.json, which must agree
// with the README's Mermaid timeline (tests/readme-charts.test.ts).
import { fontCss } from './fonts.mjs';
import { esc, f1, rng } from './geometry.mjs';
import { KEYFRAMES, RING_CSS, anim } from './motion.mjs';
import { eye, growClip, lenticels, trunkOutline } from './birch.mjs';
import { shell } from './shell.mjs';
import { CAP_SIZE, MARGIN_BOTTOM, MARGIN_TOP } from './render.mjs';
import { FONT_STACK, contrast, palette } from './theme.mjs';
import { width, wrapBalanced as wrap } from './textmetrics.mjs';

const DATE = 15;
const ITEM = 15.5;
const CHIP = 13.5;

export function buildTimeline(chart, data, scheme, variant, { sourceHash }) {
  const phone = variant === 'phone';
  const t = palette(scheme);
  const glyphs = { display: '', body: '', italic: '' };
  const pairs = [];
  const W = phone ? 430 : 880;
  const trunkW = phone ? 34 : 54;
  const trunkX = phone ? 44 : W / 2;
  const textW = phone ? 430 - 44 - trunkW / 2 - 34 - 20 : 318;
  const pickedBy = new Map(data.picked.map((p) => [p.date, p]));

  // ---- lay the entries out ----
  const entries = [];
  const bottoms = { L: 0, R: 0 };
  let prevY = MARGIN_TOP + 34;
  data.events.forEach((ev, i) => {
    const side = phone ? 'R' : i % 2 === 0 ? 'L' : 'R';
    const lines = ev.items.map((it) => wrap('body', ITEM, it, textW));
    const h = 24 + lines.reduce((s, l) => s + l.length * 19.5 + 5, 0);
    const y = Math.max(i === 0 ? prevY : prevY + 44, bottoms[side] + 16);
    bottoms[side] = y + h;
    prevY = y;
    entries.push({ ev, side, lines, y, h, pick: pickedBy.get(ev.date) });
  });
  const lastBottom = Math.max(bottoms.L, bottoms.R);
  const trunkTop = MARGIN_TOP + 10;
  const trunkBottom = lastBottom + 18;
  const H = Math.ceil(trunkBottom + MARGIN_BOTTOM + 14);

  // ---- trunk ----
  const fill = scheme === 'light' ? t.paper : t.ink;
  const mark = scheme === 'light' ? t.ink : t.field;
  const x0 = trunkX;
  const markYs = entries.map((e) => e.y + 9);
  const growStart = 0;
  const growDur = 2.4;
  const len = lenticels({ cx: x0, top: trunkTop, bottom: trunkBottom, w: trunkW, junctions: markYs, seed: 7007 });
  let body =
    growClip('grow', { x: x0 - trunkW / 2 - 30, y: trunkTop - 12, w: trunkW + 60, h: trunkBottom - trunkTop + 26, up: false, dur: growDur, begin: growStart }) +
    `<g clip-path="url(#grow)"><path d="${trunkOutline({ cx: x0, top: trunkTop, bottom: trunkBottom, w: trunkW, seed: 911, taper: 0.12 })}" fill="${fill}" stroke="${mark}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path class="lent" d="${len.thin}" style="stroke:${mark}"/><path class="lent" d="${len.heavy}" style="stroke:${mark};stroke-width:3.8"/></g>`;

  // ---- entries ----
  let css = KEYFRAMES + RING_CSS(t.glow);
  css += `.lent{fill:none;stroke-width:2.2;stroke-linecap:round;stroke-opacity:.78}`;
  let end = growStart + growDur;
  entries.forEach((e, i) => {
    const toLeft = e.side === 'L';
    const dir = toLeft ? -1 : 1;
    const edge = x0 + dir * (trunkW / 2);
    const tx = x0 + dir * (trunkW / 2 + 34);
    const anchor = toLeft ? 'end' : 'start';
    const y = e.y;
    const markY = y + 9;
    const hot = !!e.pick;
    const frac = (markY - trunkTop) / (trunkBottom - trunkTop);
    const at = growStart + growDur * frac * 0.92 + 0.12;
    glyphs.display += e.ev.date;
    let g = `<g class="ev" id="ev${i}">`;
    // bark mark across the trunk, and the twig out to the text
    // the event is a lenticel pair on the trunk (the long dash points to its side), and a
    // knot with the brand chevron where the twig leaves
    const mc = hot ? t.accent : mark;
    const long = trunkW * (hot ? 0.74 : 0.6);
    const short = long * 0.5;
    g += `<path d="M${f1(x0 + dir * 2 - long / 2)} ${f1(markY)}h${f1(long)}M${f1(x0 - dir * 5 - short / 2)} ${f1(markY + 6.5)}h${f1(short)}" stroke="${mc}" stroke-width="${hot ? 5 : 4}" stroke-linecap="round" fill="none"/>`;
    g += `<path d="M${f1(edge)} ${f1(markY)}h${f1(dir * 24)}" stroke="${t.edge}" stroke-width="1.6" stroke-linecap="round"/>`;
    g += eye(edge, markY, dir, hot ? t.accent : mark, hot ? t.onAccent : fill, hot ? 1.15 : 0.8);
    g += `<circle cx="${f1(edge + dir * 24)}" cy="${f1(markY)}" r="3" fill="${hot ? t.accent : t.edge}"/>`;
    // date line (with the picked-out chip)
    let dateX = tx;
    const dw = width('display', DATE, e.ev.date, 0.08);
    let dateSvg = `<text class="dt${hot ? ' hot' : ''}" x="${f1(toLeft ? tx : dateX)}" y="${f1(y + 14)}" text-anchor="${anchor}">${esc(e.ev.date)}</text>`;
    if (hot) {
      const label = e.pick.label.toUpperCase();
      glyphs.display += label;
      const cw = width('display', CHIP, label, 0.14) + 20;
      const cx = toLeft ? tx - dw - 14 - cw : tx + dw + 14;
      dateSvg += `<rect x="${f1(cx)}" y="${f1(y - 3)}" width="${f1(cw)}" height="21" rx="10.5" fill="${t.accent}"/>`;
      dateSvg += `<text class="chip" x="${f1(cx + cw / 2)}" y="${f1(y + 11.5)}" text-anchor="middle">${esc(label)}</text>`;
    }
    g += dateSvg;
    let yy = y + 24 + 4;
    for (const ls of e.lines) {
      g += `<text class="it" x="${f1(tx)}" y="${f1(yy + 12)}" text-anchor="${anchor}">`;
      ls.forEach((l, j) => {
        glyphs.body += l;
        g += `<tspan x="${f1(tx)}" y="${f1(yy + 12 + j * 19.5)}">${esc(l)}</tspan>`;
      });
      g += '</text>';
      yy += ls.length * 19.5 + 5;
    }
    g += '</g>';
    body += g;
    css += anim(`#ev${i}`, 'rise', 0.5, at);
    if (hot) {
      const ring = `<circle class="ring" id="r-ev${i}" cx="${f1(x0)}" cy="${f1(markY)}" r="${f1(trunkW / 2 + 12)}"/>`;
      body += ring;
      css += anim(`#r-ev${i}`, 'ring', 1.0, at + 0.2, 'ease-out');
      end = Math.max(end, at + 1.2);
    }
    end = Math.max(end, at + 0.5);
  });
  pairs.push({ where: 'date on field', fg: t.accentStrong, bg: t.field });
  pairs.push({ where: 'event text on field', fg: t.ink, bg: t.field });
  pairs.push({ where: 'chip label on accent', fg: t.onAccent, bg: t.accent });
  pairs.push({ where: 'picked-out date on field', fg: t.accent, bg: t.field });
  pairs.push({ where: 'trunk against field (non-text, 3:1)', fg: scheme === 'light' ? t.ink : t.ink, bg: t.field });

  glyphs.display += 'x';
  css =
    fontCss(glyphs) +
    '\n' +
    css +
    `\n.dt{font:${DATE}px ${FONT_STACK.display};letter-spacing:.08em;fill:${t.accentStrong}}.dt.hot{fill:${t.accent}}` +
    `.chip{font:${CHIP}px ${FONT_STACK.display};letter-spacing:.14em;fill:${t.onAccent}}` +
    `.it{font:${ITEM}px ${FONT_STACK.body};fill:${t.ink}}`;

  const out = shell({ chart, scheme, t, W, H, css, body, sourceHash, duration: end, variant });
  const scale = (phone ? 360 : 830) / W;
  return {
    svg: out.svg,
    W,
    H,
    pairs: pairs.map((p) => ({ ...p, ratio: contrast(p.fg, p.bg) })),
    minRendered: Math.min(DATE, ITEM, CHIP, CAP_SIZE) * scale,
    fit: [],
    scheme,
  };
}
