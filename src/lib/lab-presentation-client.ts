/**
 * The DOM half of the Lab's presentation (see lab-presentation.ts): puts a
 * setting on the page, keeps the bench's try-on in this browser, and plays
 * the row entrances.
 *
 * GSAP is the Lab's motion library (founder, 08-13-26 and 11-22-26) and stays
 * out of the business pages. It is fetched only when an entrance actually
 * runs, so a Lab at motion 0 never downloads it.
 */
import {
  LAB_PRESENTATION, STORAGE_KEY, barkTile, motionTiming, normalise, textureOpacity,
  type LabPresentation,
} from './lab-presentation';

/** Texture: an attribute and two custom properties on <html>, drawn by
    src/styles/lab-texture.css. */
export function applyPresentation(p: LabPresentation, root: HTMLElement = document.documentElement) {
  const opacity = textureOpacity(p);
  if (opacity === 0) {
    delete root.dataset.labTexture;
    root.style.removeProperty('--lab-texture-opacity');
    return;
  }
  root.dataset.labTexture = p.texture;
  root.style.setProperty('--lab-texture-opacity', String(opacity));
  if (p.texture === 'bark' && !root.style.getPropertyValue('--lab-bark-tile')) {
    root.style.setProperty('--lab-bark-tile', barkTile());
  }
}

/** The setting the bench left on in this browser, if any. */
export function readWorn(): LabPresentation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalise(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Keep a setting on in this browser (null takes it off). Nobody else sees it. */
export function wear(p: LabPresentation | null) {
  try {
    if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the bench still tunes its own page */
  }
}

/** What this visitor gets: the bench's try-on if there is one, else what ships. */
export function currentPresentation(): LabPresentation {
  return readWorn() ?? LAB_PRESENTATION;
}

const TEXT = ':scope > .text > *, :scope [data-lab-text] > *';
const PICTURE = '.thumb, .portal-thumb, [data-lab-thumb]';

let refresh: (() => void) | undefined;

/**
 * Play the entrance on some rows. With `scroll`, each row waits until it is
 * on screen (rows already there go at once); without, they all go now, which
 * is the bench's Replay.
 *
 * A row is any element; its words are the children of `.text` (or of
 * `[data-lab-text]`) and its picture is `.thumb` (or `[data-lab-thumb]`).
 */
export async function playEntrance(rows: HTMLElement[], p: LabPresentation, { scroll = false } = {}) {
  const timing = motionTiming(p.motion);
  if (!timing || !rows.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { gsap } = await import('gsap');
  const { duration, distance, stagger } = timing;

  const build = (row: HTMLElement) => {
    const words = [...row.querySelectorAll<HTMLElement>(TEXT)];
    const picture = row.querySelector<HTMLElement>(PICTURE);
    gsap.killTweensOf([row, ...words, ...(picture ? [picture] : [])]);
    const tl = gsap.timeline({ paused: true });
    const now = { immediateRender: true };
    if (p.entrance === 'rise') {
      const parts = picture ? [...words, picture] : words;
      tl.fromTo(parts, { autoAlpha: 0, y: distance }, { ...now, autoAlpha: 1, y: 0, duration, stagger, ease: 'power3.out', clearProps: 'opacity,visibility,transform' });
    } else if (p.entrance === 'draw') {
      const parts = picture ? [...words, picture] : words;
      tl.fromTo(row, { clipPath: 'inset(0% 100% 0% 0%)' }, { ...now, clipPath: 'inset(0% 0% 0% 0%)', duration: duration * 1.25, ease: 'power2.inOut', clearProps: 'clipPath' });
      tl.fromTo(parts, { autoAlpha: 0, x: -distance / 2 }, { ...now, autoAlpha: 1, x: 0, duration, stagger: stagger / 2, ease: 'power2.out', clearProps: 'opacity,visibility,transform' }, duration * 0.3);
    } else {
      tl.fromTo(words, { autoAlpha: 0 }, { ...now, autoAlpha: 1, duration, stagger, ease: 'power1.out', clearProps: 'opacity,visibility' });
      if (picture) {
        tl.fromTo(picture, { autoAlpha: 0, filter: 'blur(14px) saturate(0) contrast(0.6)' }, { ...now, autoAlpha: 1, filter: 'blur(0px) saturate(1) contrast(1)', duration: duration * 1.7, ease: 'power2.out', clearProps: 'opacity,visibility,filter' }, 0);
      }
    }
    return tl;
  };

  if (!scroll) {
    rows.forEach((row, i) => build(row).delay(i * stagger * 2).play());
    return;
  }
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  const waiting = new Map(rows.map((row) => [row, build(row)]));
  ScrollTrigger.batch(rows, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => batch.forEach((row, i) => waiting.get(row as HTMLElement)?.delay(i * stagger * 2).play()),
  });
  refresh = () => ScrollTrigger.refresh();
}

/** Rows moved without a scroll (the catalog filter): look again at which are
    on screen. Does nothing until an entrance has been set up. */
export function refreshEntrances() {
  refresh?.();
}

/** A Lab listing page: wear the current setting and bring the rows in. */
export function initLabPresentation(rowSelector: string) {
  const p = currentPresentation();
  applyPresentation(p);
  void playEntrance([...document.querySelectorAll<HTMLElement>(rowSelector)], p, { scroll: true });
}
