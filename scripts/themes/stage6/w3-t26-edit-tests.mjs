/** Stage 6 wave 3, task 26: one-off edit of tests/gm-stage6-w3-t26.test.ts adding the cap and warm-up pins. Kept for the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('../../../tests/gm-stage6-w3-t26.test.ts', import.meta.url);
let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
s = s.replace("  DAMP, LAG_MS, OMEGA, PEAK_DEG,", "  CAP_DEG, DAMP, LAG_MS, OMEGA, PEAK_DEG,");
const a = "  it('keeps a neighbour a slight tilt, a beat behind', () => {";
if (!s.includes(a)) throw new Error('anchor');
s = s.replace(a, `  it('is capped just above the peak however much room a plate has', () => {
    expect(CAP_DEG).toBeCloseTo(PEAK_DEG * 1.1, 6);
    // a restart in phase from the cap itself can add nothing: the bound holds for every start angle inside it
    for (let th0 = -CAP_DEG; th0 <= CAP_DEG; th0 += 1.1) {
      for (const dir of [1, -1] as const) {
        const { samples } = fitSwing(th0, PEAK_DEG, dir, 0, CAP_DEG, CAP_DEG);
        expect(Math.max(...samples.map(Math.abs)), \`\${th0} \${dir}\`).toBeLessThanOrEqual(CAP_DEG + 1e-6);
      }
    }
  });

` + a);
const b = "  it('hits the painted plate only, and leaves touch scrolling to the page', () => {";
s = s.replace(b, `  it('pays the first animated frame once, invisibly, in view and quiet or on the pointer\'s arrival', () => {
    expect(plates).toContain("rotate(0.01deg)");
    expect(plates).toContain('{ duration: 80 }');
    expect(plates).toContain("hero.addEventListener('pointerenter', warm)");
    expect(plates).toContain('window.setTimeout(warm, 900)');
    expect(plates).toContain('for (const a of warmAnims) a.cancel()');
  });

` + b);
writeFileSync(f, s);
