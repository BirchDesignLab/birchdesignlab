/**
 * The school list the portal's client code needs (switcher, font preloads),
 * serialized once into every portal page by PortalLayout as
 * <script type="application/json" id="bdl-schools">. Same bytes on every
 * portal page, so it never differs between the documents the router swaps.
 */
import type { Scheme } from '../../lib/scheme';

export interface SchoolSummary {
  id: string;
  name: string;
  era: string;
  signature: string;
  /** The room's wall label: what the school teaches. The switcher's placard shows it. */
  lesson: string;
  nativeScheme: Scheme;
  preload: string[];
}

export interface PortalData {
  schools: SchoolSummary[];
  /** BDL-011's page, when it is live; otherwise the switcher omits the link. */
  aboutHref: string | null;
}

export const PORTAL_DATA_ID = 'bdl-schools';

let cached: PortalData | null = null;

export function readPortalData(): PortalData {
  if (cached) return cached;
  const el = document.getElementById(PORTAL_DATA_ID);
  try {
    cached = el ? (JSON.parse(el.textContent || '') as PortalData) : { schools: [], aboutHref: null };
  } catch {
    cached = { schools: [], aboutHref: null };
  }
  return cached;
}

export function readSchools(): SchoolSummary[] {
  return readPortalData().schools;
}

/** JSON safe to inline in a <script>: '<' is escaped so no string can close the tag. */
export function serializePortalData(data: PortalData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
