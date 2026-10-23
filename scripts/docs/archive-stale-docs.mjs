/**
 * Docs cleanup, 10-22-26: move dated handoffs and finished/superseded
 * specs and plans into docs/archive/, stamp each with a "historical" banner,
 * and rewrite path references to them across the repo's docs.
 *
 * Why: the repo is public and a newcomer (PR #96's author) read retired
 * material (the credo, the 3-dash mark, Pages hosting, GA4-in-code) as
 * current. Archiving keeps the record without presenting it as the reference.
 *
 * Deliberately NOT moved:
 *  - docs/superpowers/specs/theme-schools-research/**: Stage 5 is in flight on
 *    feat/theme-schools-tier3-stage5 and links into it. Archive its finished
 *    stages after Stage 5 merges.
 *  - docs/birch-design-lab-founding-record.md: the brand's origin document,
 *    linked from the README. Banner in place instead of moved.
 *
 * Idempotent: a second run finds nothing to move and no stale paths.
 * Usage: node scripts/docs/archive-stale-docs.mjs   (from the repo root)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DATE = '10-22-26';

// [from, to] — paths relative to the repo root.
const ROOT = [
  'handoff-2026-07-16.md',
  'handoff-2026-08-04.md',
  'handoff-2026-08-13.md',
  'handoff-8-18-26.md',
  'handoff-8-19-26.md',
  'handoff-8-19-26-bdl007.md',
  'handoff-8-23-26.md',
  'design-handoff-07-16.md',
  'design-handoff-07-18-26.md',
  'lab-architecture-handoff.md',
  'naming-handoff.md',
].map((f) => [`docs/${f}`, `docs/archive/${f}`]);

const SP = [
  'specs/2026-07-15-birchdesignlab-website-design.md',
  'specs/2026-07-16-bark-og-images-design.md',
  'specs/2026-07-16-bdl-004-the-loom-design.md',
  'specs/2026-08-08-bdl-brand-lockup-sponsor-card-design.md',
  'plans/2026-07-15-website-core.md',
  'plans/2026-07-16-bark-og-images.md',
  'plans/2026-07-16-bdl-003-novgorod-letters.md',
  'plans/2026-07-16-bdl-004-the-loom.md',
  'plans/2026-07-16-wall-labels.md',
  'plans/2026-07-29-lab-studies-bdl-005.md',
  'plans/2026-08-03-seo-configuration-pass.md',
  'plans/2026-08-08-bdl-brand-assets.md',
  'plans/2026-08-13-lab-accent-pass.md',
  'plans/2026-08-18-bdl-007-shining-tree.md',
  'plans/2026-08-23-contact-bark-and-trust.md',
  'plans/09-22-26-theme-schools.md',
].map((f) => [`docs/superpowers/${f}`, `docs/archive/superpowers/${f}`]);

const MOVES = [...ROOT, ...SP];

const BANNER_MOVED =
  `> **Archived ${DATE}: historical record.** This describes the project as of its own date and is not a current reference. ` +
  'Current sources: `docs/lab-backlog.md` (work and decisions), `docs/deploy.md` (hosting), `docs/analytics.md` (analytics and consent), ' +
  '`assets/brand/README.md` (brand), and the live code.';

const BANNER_FOUNDING =
  `> **Historical record (${DATE}).** The founding record as written on 2026-07-15. Since then the credo has been retired as site copy ` +
  '(birch copy belongs only on About), and the lenticel-dash mark concept was superseded by the stem-and-chevron mark locked 2026-08-13 ' +
  '(see `assets/brand/README.md`). The name and its reasoning stand.';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

function stamp(path, banner) {
  const raw = readFileSync(path, 'utf8');
  if (raw.includes(banner.slice(0, 40))) return false;
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(eol);
  const at = lines[0].startsWith('#') ? 1 : 0;
  lines.splice(at, 0, ...(at ? ['', banner] : [banner, '']));
  writeFileSync(path, lines.join(eol));
  return true;
}

let moved = 0;
for (const [from, to] of MOVES) {
  if (!existsSync(from)) continue;
  mkdirSync(dirname(to), { recursive: true });
  git('mv', from, to);
  stamp(to, BANNER_MOVED);
  moved++;
}
const founding = 'docs/birch-design-lab-founding-record.md';
const stampedFounding = existsSync(founding) && stamp(founding, BANNER_FOUNDING);

// Rewrite references in tracked text docs (not code: nothing in src/tests/scripts links these).
const targets = git('ls-files', '--', '*.md', '*.json', '.claude/**')
  .split('\n')
  .filter((p) => p && existsSync(p));
let rewritten = 0;
for (const p of targets) {
  const raw = readFileSync(p, 'utf8');
  let out = raw;
  for (const [from, to] of MOVES) out = out.split(from).join(to);
  if (out !== raw) {
    writeFileSync(p, out);
    rewritten++;
  }
}

console.log(`[archive] moved ${moved}, founding banner ${stampedFounding ? 'added' : 'present'}, rewrote refs in ${rewritten} files`);
