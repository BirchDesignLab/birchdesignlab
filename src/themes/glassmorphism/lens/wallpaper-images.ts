/**
 * The wallpaper image manifest for the production lens: the exact same files
 * `theme.css`'s `main::before` shows (painted once by
 * `scripts/themes/glassmorphism/paint-wallpaper.mjs`), imported here as
 * hashed asset URLs so the lens's WebGL texture can never drift from what the
 * CSS background paints (proofs/lens.md, "For Tier B: one wallpaper
 * source"). Two Vite imports of the same source file hash to the same
 * content either way; this file exists so the lens has one place to ask
 * "which file for this scheme and time of day", matching theme.css's own
 * scheme/tod selection exactly.
 */
import lightDawnAvif from '../wallpaper/light-dawn.avif?url';
import lightDawnWebp from '../wallpaper/light-dawn.webp?url';
import lightDayAvif from '../wallpaper/light-day.avif?url';
import lightDayWebp from '../wallpaper/light-day.webp?url';
import lightDuskAvif from '../wallpaper/light-dusk.avif?url';
import lightDuskWebp from '../wallpaper/light-dusk.webp?url';
import darkDawnAvif from '../wallpaper/dark-dawn.avif?url';
import darkDawnWebp from '../wallpaper/dark-dawn.webp?url';
import darkDayAvif from '../wallpaper/dark-day.avif?url';
import darkDayWebp from '../wallpaper/dark-day.webp?url';
import darkDuskAvif from '../wallpaper/dark-dusk.avif?url';
import darkDuskWebp from '../wallpaper/dark-dusk.webp?url';
import type { TimeOfDay } from './settings';

/** The canvas the wallpaper was painted at (paint-wallpaper.mjs's W x H):
    the lens's cover-rect math must use these, not the loaded image's own
    natural size, so a texture that is still decoding reports the right
    aspect ratio immediately. */
export const WALL_W = 2560;
export const WALL_H = 1600;

export type Scheme = 'light' | 'dark';

const MANIFEST: Record<Scheme, Record<TimeOfDay, { avif: string; webp: string }>> = {
  light: {
    dawn: { avif: lightDawnAvif, webp: lightDawnWebp },
    day: { avif: lightDayAvif, webp: lightDayWebp },
    dusk: { avif: lightDuskAvif, webp: lightDuskWebp },
  },
  dark: {
    dawn: { avif: darkDawnAvif, webp: darkDawnWebp },
    day: { avif: darkDayAvif, webp: darkDayWebp },
    dusk: { avif: darkDuskAvif, webp: darkDuskWebp },
  },
};

let avifOk: boolean | null = null;

/** Cached across calls: decodes a 1x1 AVIF once. Chromium, Safari 16+ and
    Firefox 93+ all decode canvas-usable AVIF, but the check costs nothing and
    keeps the lens working on anything that does not. */
async function supportsAvif(): Promise<boolean> {
  if (avifOk !== null) return avifOk;
  try {
    const img = new Image();
    img.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    await img.decode();
    avifOk = true;
  } catch {
    avifOk = false;
  }
  return avifOk;
}

/** The URL of the wallpaper file for a scheme and time of day, in the same
    format the browser would pick for the CSS `image-set()` (AVIF where the
    browser can decode it into a canvas, WebP otherwise). */
export async function wallpaperUrl(scheme: Scheme, tod: TimeOfDay): Promise<string> {
  const entry = MANIFEST[scheme][tod];
  return (await supportsAvif()) ? entry.avif : entry.webp;
}

/** Loads and decodes a wallpaper image, ready to hand to
    `gl.texImage2D`/`gl.texSubImage2D`. Callers own caching: the lens keeps
    one `HTMLImageElement` per scheme/tod pair it has shown so a repeat swap
    (returning to a time of day) needs no network round trip. */
export async function loadWallpaperImage(scheme: Scheme, tod: TimeOfDay): Promise<HTMLImageElement> {
  const url = await wallpaperUrl(scheme, tod);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
