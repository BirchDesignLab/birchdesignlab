/**
 * Drawing helpers and the live theme for the wall's miniatures.
 * Ported from the mockup's lib.js. mulberry32 and generateBark come from the
 * site's own bark pattern core instead of a copy.
 *
 * Nothing here touches window or document at import time.
 */
import { currentScheme } from '../scheme';

export { mulberry32 } from '../bark/pattern';

export const TAU = Math.PI * 2;
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
export const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const hex = (h: string): [number, number, number] => {
  h = h.trim();
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

/** Blend two hex colours; returns an rgb() string. */
export const mix = (a: string, b: string, t: number): string => {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
};

/** A hex colour at an opacity; returns an rgba() string. */
export const alpha = (h: string, a: number): string => {
  const A = hex(h);
  return `rgba(${A[0]},${A[1]},${A[2]},${a})`;
};

/** Begin a rounded-rect path (the caller fills or strokes). */
export const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

export interface Theme {
  dark: boolean;
  field: string;
  raised: string;
  mark: string;
  muted: string;
  accent: string;
  onAccent: string;
  line: string;
  /** Bumped on every readTheme(), so a caller can tell the theme changed. */
  v: number;
}

/** The theme as read from the site's custom properties. Refresh with readTheme() on a scheme change. */
export const T: Theme = {
  dark: false,
  field: '#f5f1e8',
  raised: '#e9e1d2',
  mark: '#1f1b15',
  muted: '#5a5244',
  accent: '#2b4a37',
  onAccent: '#f5f1e8',
  line: 'rgba(31,27,21,.18)',
  v: 0,
};

/** Read the site tokens (set on <html>) and the scheme into T. Browser only. */
export function readTheme(): void {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const g = (n: string) => cs.getPropertyValue(n).trim();
  T.dark = currentScheme(root) === 'dark';
  T.field = g('--field');
  T.raised = g('--field-raised');
  T.mark = g('--mark');
  T.muted = g('--mark-muted');
  T.accent = g('--accent');
  T.onAccent = g('--on-accent');
  T.line = g('--line');
  T.v += 1;
}
