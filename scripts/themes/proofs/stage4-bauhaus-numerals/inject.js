/* Stage 4 proof a4: the markup pattern, as an injection script.
 *
 * window.bdlBuildNumerals(symbols, opts) turns every .num into the pattern
 * Tier B's Numeral.astro will render:
 *
 *   <span class="num" aria-hidden="true">          (aria-hidden stays as the page has it)
 *     <span class="num-t">01</span>                (the real digits, clipped out of sight)
 *     <svg class="nm" viewBox="0 0 60 100" aria-hidden="true">  one per digit
 *       <path class="el ...">                      one per element
 *     </svg>
 *   </span>
 *
 * symbols: { "0": "<path .../>...", ... } the inner markup of each <symbol>
 * in numerals.svg. opts.asm: give each element the existing .asm machinery
 * (bars grow on their axis, bowls turn in), staggered by --d.
 */
window.bdlBuildNumerals = function (symbols, opts) {
  opts = opts || {};
  const NS = 'http://www.w3.org/2000/svg';
  let built = 0;
  for (const el of document.querySelectorAll('.num')) {
    if (el.dataset.nmBuilt) continue;
    const text = el.textContent.trim();
    el.dataset.nmBuilt = '1';
    el.textContent = '';
    const t = document.createElement('span');
    t.className = 'num-t';
    t.textContent = text;
    el.appendChild(t);
    let idx = 0;
    for (const ch of text) {
      if (!symbols[ch]) continue;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'nm');
      svg.setAttribute('viewBox', '0 0 60 100');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.innerHTML = symbols[ch];
      if (opts.asm) {
        for (const p of svg.querySelectorAll('.el')) {
          const bar = p.classList.contains('el-bar');
          const from = bar
            ? (p.getAttribute('data-axis') === 'v' ? 'scaleY(0)' : 'scaleX(0)')
            : 'rotate(-90deg) scale(0)';
          p.classList.add('asm');
          p.setAttribute('style', `--from: ${from}; --d: ${idx * (opts.step || 70)}ms`);
          idx++;
        }
      }
      el.appendChild(svg);
    }
    built++;
  }
  return built;
};
