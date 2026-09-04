/**
 * Parse the content calendar into a machine-readable manifest.
 *
 * calendar.html is the human artifact — the thing the founder edits. The
 * pipeline never reads it directly at render time; it reads manifest.json,
 * which this script regenerates. That keeps "what got built" traceable to a
 * committed snapshot rather than to whatever the HTML happened to say.
 *
 * Usage:
 *   node scripts/manifest.mjs          # write manifest.json, print the table
 *   node scripts/manifest.mjs --check  # print only, do not write
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const CALENDAR = path.join(SOCIAL_DIR, 'calendar.html');
const OUT = path.join(SOCIAL_DIR, 'manifest.json');

const MANIFEST_RE =
  /<script[^>]*\bid=["']asset-manifest["'][^>]*>([\s\S]*?)<\/script>/i;

/** Pull the embedded JSON block out of calendar.html and parse it. */
export async function readManifest(calendarPath = CALENDAR) {
  const html = await readFile(calendarPath, 'utf8');
  const match = html.match(MANIFEST_RE);
  if (!match) {
    throw new Error(
      `No <script type="application/json" id="asset-manifest"> block found in ${calendarPath}`
    );
  }
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`asset-manifest block is not valid JSON: ${err.message}`);
  }
}

/**
 * Flatten the manifest into one row per buildable asset.
 *
 * An "asset" here is an id plus a single format — V007-SQ and V007-VT are two
 * rows, because they are two files with two different framings. Carousels are
 * the exception: a carousel is one row whose format count is its slide count,
 * since the slides ship as a set.
 */
export function flatten(m) {
  const rows = [];

  for (const l of m.loops ?? []) {
    rows.push({
      id: l.id,
      kind: l.kind ?? 'webgl-loop',
      formats: l.framings ?? [],
      source: l.source ?? null,
      duration_s: l.duration_s ?? null,
      slides: null,
      note: l.framing_note ?? l.note ?? null,
      use: l.use ?? [],
    });
  }

  for (const s of m.stills ?? []) {
    rows.push({
      id: s.id,
      kind: 'still',
      formats: s.formats ?? [],
      source: s.from ? `frame of ${s.from}` : null,
      duration_s: null,
      slides: null,
      note: s.frame ?? null,
      use: s.use ?? [],
    });
  }

  for (const c of m.cards ?? []) {
    rows.push({
      id: c.id,
      kind: `card:${c.kind}`,
      formats: c.formats ?? [],
      source: null,
      duration_s: null,
      slides: null,
      note: c.title ?? c.quote ?? (c.lines ? c.lines[0] : null),
      use: c.use ?? [],
    });
  }

  for (const k of m.carousels ?? []) {
    rows.push({
      id: k.id,
      kind: 'carousel',
      formats: k.format ? [k.format] : [],
      source: null,
      duration_s: null,
      slides: (k.slides ?? []).length,
      note: (k.slides ?? [])[0] ?? null,
      use: k.use ?? [],
    });
  }

  for (const r of m.slideshow_reels ?? []) {
    const from = (m.carousels ?? []).find((c) => c.id === r.from);
    const slideCount = (from?.slides ?? []).length;
    rows.push({
      id: r.id,
      kind: 'slideshow-reel',
      formats: r.format ? [r.format] : [],
      source: r.from ? `slides of ${r.from}` : null,
      duration_s: slideCount ? +(slideCount * r.seconds_per_slide).toFixed(2) : null,
      slides: slideCount || null,
      note: `${r.seconds_per_slide}s/slide, ${r.crossfade_s}s crossfade`,
      use: r.use ?? [],
    });
  }

  return rows;
}

/** Render rows as a fixed-width table. Cheaper to eyeball than JSON. */
export function table(rows) {
  const head = ['ID', 'KIND', 'FORMATS', 'DUR', 'SLIDES', 'SOURCE / NOTE'];
  const body = rows.map((r) => [
    r.id,
    r.kind,
    r.formats.join(' '),
    r.duration_s == null ? '' : `${r.duration_s}s`,
    r.slides == null ? '' : String(r.slides),
    r.source ?? (r.note ? truncate(r.note, 44) : ''),
  ]);

  const all = [head, ...body];
  const widths = head.map((_, i) => Math.max(...all.map((row) => row[i].length)));
  const line = (row) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd();
  const rule = widths.map((w) => '-'.repeat(w)).join('  ');

  return [line(head), rule, ...body.map(line)].join('\n');
}

function truncate(s, n) {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/** Every video file this run is expected to produce, as <id>-<FMT>. */
export function videoTargets(rows) {
  const videoKinds = new Set(['webgl-loop', 'scroll-capture', 'kinetic-type', 'slideshow-reel']);
  return rows
    .filter((r) => videoKinds.has(r.kind))
    .flatMap((r) => r.formats.map((f) => `${r.id}-${f}`));
}

// --- CLI -----------------------------------------------------------------
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const manifest = await readManifest();
  const rows = flatten(manifest);

  console.log(table(rows));
  console.log(
    `\n${rows.length} asset rows  |  ${videoTargets(rows).length} video files  |  ` +
      `${(manifest.schedule ?? []).length} scheduled dates`
  );

  if (!process.argv.includes('--check')) {
    const payload = {
      generated_from: 'social/calendar.html#asset-manifest',
      generated_at: new Date().toISOString(),
      ...manifest,
      _rows: rows,
    };
    await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`\nwrote ${path.relative(SOCIAL_DIR, OUT)}`);
  }
}
