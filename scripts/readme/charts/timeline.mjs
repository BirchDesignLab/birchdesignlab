// Chart 7, the Timeline showpiece: a birch trunk with every dated event hung off
// it as a bark mark, drawn downward once. The founding, the first live day, Portal
// day and today are picked out. Content is data/timeline.json, which must agree
// with the README's Mermaid timeline (tests/readme-charts.test.ts).
import { fontCss } from './fonts.mjs';
import { esc, f1, rng } from './geometry.mjs';
import { KEYFRAMES, RING_CSS, anim } from './motion.mjs';
import { shell } from './shell.mjs';
import { CAP_SIZE, MARGIN_BOTTOM, MARGIN_TOP } from './render.mjs';
import { FONT_STACK, contrast, palette } from './theme.mjs';
import { width, wrap } from './textmetrics.mjs';

const DATE = 15;
const ITEM = 15.5;
const CHIP = 13.5;

export function buildTimeline(chart, data, scheme, variant, { sourceHash }) {
  const phone = variant === 'phone';
  const t = palette(scheme);
  const glyphs = { display: '', body: '', italic: '' };
  const pairs = [];
  const W = phone ? 430 : 880;
  const trunkW = phone ? 30 : 46;
  const trunkX = phone ? 44 : W / 2;
  const textW = phone ? 430 - 44 - trunkW / 2 - 28 - 20 : 328;
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
  let body = '';
  body +=
    `<g id="trunk"><path class="tk-o" pathLength="1" d="M${f1(x0)} ${f1(trunkTop)}V${f1(trunkBottom)}" stroke="${mark}" stroke-width="${trunkW + 3.6}"/>` +
    `<path class="tk-f" pathLength="1" d="M${f1(x0)} ${f1(trunkTop)}V${f1(trunkBottom)}" stroke="${fill}" stroke-width="${trunkW}"/></g>`;
  // lenticels: the faint dashes of birch bark between the event marks
  const rnd = rng(7007);
  let len = '';
  const n = Math.round((trunkBottom - trunkTop) / 12);
  for (let k = 0; k < n; k++) {
    const l = 6 + rnd() * (trunkW * 0.55);
    const x = x0 - trunkW / 2 + 5 + rnd() * (trunkW - 10 - l);
    const y = trunkTop + 12 + rnd() * (trunkBottom - trunkTop - 24);
    len += `M${f1(x)} ${f1(y)}h${f1(l)}`;
  }
  body += `<path id="lent" d="${len}" stroke="${mark}" stroke-opacity=".34" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;

  // ---- entries ----
  let css = KEYFRAMES + RING_CSS(t.glow);
  const growStart = 0.15;
  const growDur = 2.5;
  css += `#trunk .tk-o,#trunk .tk-f{fill:none;stroke-dasharray:1;stroke-linecap:round;animation:bdl-draw ${growDur}s cubic-bezier(.45,.05,.3,1) ${growStart}s both}`;
  css += anim('#lent', 'fade', 1.6, 0.5);
  let end = growStart + growDur;
  entries.forEach((e, i) => {
    const toLeft = e.side === 'L';
    const dir = toLeft ? -1 : 1;
    const edge = x0 + dir * (trunkW / 2);
    const tx = x0 + dir * (trunkW / 2 + 30);
    const anchor = toLeft ? 'end' : 'start';
    const y = e.y;
    const markY = y + 9;
    const hot = !!e.pick;
    const frac = (markY - trunkTop) / (trunkBottom - trunkTop);
    const at = growStart + growDur * frac * 0.92 + 0.12;
    glyphs.display += e.ev.date;
    let g = `<g class="ev" id="ev${i}">`;
    // bark mark across the trunk, and the twig out to the text
    const mw = hot ? trunkW + 14 : trunkW * 0.62;
    g += `<path d="M${f1(x0 - mw / 2)} ${f1(markY)}h${f1(mw)}" stroke="${hot ? t.accent : mark}" stroke-width="${hot ? 6 : 4.4}" stroke-linecap="round"/>`;
    g += `<path d="M${f1(edge)} ${f1(markY)}h${f1(dir * 22)}" stroke="${t.edge}" stroke-width="1.6" stroke-linecap="round"/>`;
    g += `<circle cx="${f1(edge + dir * 22)}" cy="${f1(markY)}" r="3" fill="${hot ? t.accent : t.edge}"/>`;
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
