import { describe, expect, it } from 'vitest';
import { extractStrokes, formatLetterBlock } from '../scripts/trace-to-strokes.mjs';

const svg = (body: string, box = 'viewBox="0 0 400 240"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${box}>${body}</svg>`;

describe('extractStrokes', () => {
  it('pulls path d strings straight through when untransformed', () => {
    const out = extractStrokes(svg('<path d="M10 20 L30 40"/>'));
    expect(out.strokes).toEqual(['M10 20 L30 40']);
    expect(out.viewBox).toBe('0 0 400 240');
    expect(out.warnings).toEqual([]);
  });

  it('reads the viewBox and rounds it to integers', () => {
    const out = extractStrokes(svg('<path d="M0 0 L1 1"/>', 'viewBox="0 0 399.6 240.2"'));
    expect(out.viewBox).toBe('0 0 400 241');
  });

  it('shifts a nonzero viewBox origin back to 0 0', () => {
    const out = extractStrokes(svg('<path d="M60 60 L110 60"/>', 'viewBox="50 50 300 200"'));
    // origin shifts by (-50,-50): 60->10
    expect(out.strokes).toEqual(['M10 10 L60 10']);
    expect(out.viewBox).toBe('0 0 300 200');
  });

  it('flattens a group translate into absolute coordinates', () => {
    const out = extractStrokes(svg('<g transform="translate(100,50)"><path d="M0 0 L10 0"/></g>'));
    expect(out.strokes).toEqual(['M100 50 L110 50']);
  });

  it('composes nested group transforms', () => {
    const out = extractStrokes(
      svg('<g transform="translate(10,10)"><g transform="translate(5,0)"><path d="M0 0 L2 0"/></g></g>'),
    );
    expect(out.strokes).toEqual(['M15 10 L17 10']);
  });

  it('converts relative commands and H/V to absolute L', () => {
    const out = extractStrokes(svg('<path d="M10 10 h20 v10 l5 5"/>'));
    expect(out.strokes).toEqual(['M10 10 L30 10 L30 20 L35 25']);
  });

  it('applies a scale transform to bezier control points', () => {
    const out = extractStrokes(svg('<g transform="scale(2)"><path d="M1 1 C2 2 3 3 4 4"/></g>'));
    expect(out.strokes).toEqual(['M2 2 C4 4 6 6 8 8']);
  });

  it('keeps multiple subpaths in one stroke entry', () => {
    const out = extractStrokes(svg('<path d="M0 0 L5 0 M10 0 L15 0"/>'));
    expect(out.strokes).toEqual(['M0 0 L5 0 M10 0 L15 0']);
  });

  it('warns when the SVG has no size and no paths', () => {
    const out = extractStrokes('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(out.warnings).toContain('no <path> elements found');
    expect(out.warnings.some((w: string) => w.includes('no viewBox'))).toBe(true);
  });

  it('formats a pasteable letter block', () => {
    const block = formatLetterBlock({ viewBox: '0 0 400 240', strokes: ['M10 10 L20 20'] });
    expect(block).toBe("  viewBox: '0 0 400 240',\n  strokes: [\n    'M10 10 L20 20',\n  ],");
  });
});
