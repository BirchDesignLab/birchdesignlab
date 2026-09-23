/**
 * The theme package contract (spec §2). Every school lives in
 * src/themes/<id>/ with a meta.ts exporting `meta: ThemeMeta`; the registry
 * reads only those files, so a school's components and CSS never ship to
 * another school's pages.
 */
import type { Scheme } from '../lib/scheme';
export type { PageId } from './paths';
export type { Scheme };

export interface FontSpec {
  family: string;
  role: 'heading' | 'body' | 'accent' | 'mono' | 'wordmark';
  /** Hashed woff2 URLs (import '...woff2?url') to preload before entering the
      school. Two at most across the whole school: preloads compete for the
      same early bandwidth. */
  preload?: string[];
}

/** A text/background pair the contrast checker must hold (src/lib/contrast).
    `bg` lists custom properties top to bottom; translucent layers are
    composited over the ones beneath, ending on an opaque colour. */
export interface ContrastPair {
  fg: string;
  bg: string[];
  min: number;
  note?: string;
}

export interface ThemeMeta {
  /** Kebab id, equal to the directory name and the /t/<id>/ segment. */
  id: string;
  name: string;
  /** Where and when the school comes from, one short line. */
  era: string;
  /** What the school teaches, one line. */
  lesson: string;
  /** One sentence a non-designer could say in five seconds. */
  signature: string;
  /** Motifs a neighbouring school owns and this one must not use. */
  forbids: string[];
  /** The scheme the school was born in; the other is its designed variant. */
  nativeScheme: Scheme;
  fonts: FontSpec[];
  contrast?: ContrastPair[];
  assets?: { provenance: 'original-vector' | 'public-domain' | 'generated'; note: string };
  /** Drawer order. */
  order: number;
}
