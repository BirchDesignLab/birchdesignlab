/**
 * Wave B1 glass fix round 2 (09-25-26): which backdrop-filter constructions
 * survive the build's CSS minifier with BOTH the -webkit- and the unprefixed
 * declaration intact? Vite 8 (Astro 7) minifies CSS with lightningcss, with
 * targets from build.cssTarget, default 'baseline-widely-available'
 * (chrome111 edge111 firefox114 safari16.4 ios16.4). lightningcss treats
 * -webkit-backdrop-filter and backdrop-filter as ONE property with vendor
 * prefixes, so within a rule (and across merged adjacent same-selector
 * rules) the later declaration replaces the earlier, and it only re-adds a
 * prefix it can compute itself (never for a var() value). This runs each
 * candidate through the same transform and prints what comes out.
 *
 * Usage: node scripts/themes/glassmorphism/b1-fix2-lightningcss.mjs
 */
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const req = createRequire(join(REPO, 'node_modules', 'astro', 'node_modules', 'vite', 'package.json'));
const { transform } = req('lightningcss');
const v = (M, m = 0) => (M << 16) | (m << 8);
const targets = { chrome: v(111), edge: v(111), firefox: v(114), safari: v(16, 4), ios_saf: v(16, 4) };

const cases = {
  'both in one rule (literal + var)': `.a{-webkit-backdrop-filter:blur(24px) saturate(1.7);backdrop-filter:var(--blur)}`,
  'both literal, same value': `.a{-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px)}`,
  'unprefixed literal only': `.a{backdrop-filter:blur(24px) saturate(1.7)}`,
  'unprefixed var only': `.a{backdrop-filter:var(--blur)}`,
  'none + none, adjacent same selector': `.a{-webkit-backdrop-filter:none}.a{backdrop-filter:none}`,
  'none only (unprefixed)': `.a{backdrop-filter:none}`,
  'webkit literal in @supports block': `.a{backdrop-filter:var(--blur)}@supports (-webkit-backdrop-filter:none){.a{-webkit-backdrop-filter:blur(24px)}}`,
  'webkit literal, :where() twin selector': `.a{backdrop-filter:var(--blur)}.a:where(.a){-webkit-backdrop-filter:blur(24px)}`,
  'webkit literal first, var later, different rules': `.a:where(*){-webkit-backdrop-filter:blur(24px)}.a{backdrop-filter:var(--blur)}`,
  'webkit var() via custom property': `.a{-webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur)}`,
  '@supports not (a or b)': `@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.a{color:red}}`,
  'none + none in @media, adjacent': `@media (prefers-contrast:more){.a{-webkit-backdrop-filter:none}.a{backdrop-filter:none}}`,
};
for (const [name, css] of Object.entries(cases)) {
  const out = transform({ filename: 'x.css', code: Buffer.from(css), minify: true, targets }).code.toString();
  console.log(`${name}\n  in : ${css}\n  out: ${out}\n`);
}

// Second pass: the build passes NO targets (Astro sets build.target
// 'esnext', so Vite's convertTargets returns undefined). Without targets
// lightningcss drops every prefixed twin of an unprefixed declaration in the
// same (or merged) rule. The candidates the fix uses, run the build's way:
const noTargets = {
  'build way: both in one rule': `.a{-webkit-backdrop-filter:blur(24px);backdrop-filter:var(--blur)}`,
  'build way: adjacent none rules': `.a{-webkit-backdrop-filter:none}.a{backdrop-filter:none}`,
  'build way: @supports not (a or b)': `@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.a{color:red}}`,
  'fix: nested @supports not': `@supports not (backdrop-filter:blur(1px)){@supports not (-webkit-backdrop-filter:blur(1px)){.a{color:red}}}`,
  'fix: webkit literal in @supports before base': `@supports (-webkit-backdrop-filter:none){:where(.t) .a{-webkit-backdrop-filter:blur(24px)}}:where(.t) .a{position:relative;backdrop-filter:var(--blur)}`,
  'fix: E10 none, webkit in @supports inside @media': `@media (prefers-contrast:more){@supports (-webkit-backdrop-filter:none){.t.t :is(.a,.b){-webkit-backdrop-filter:none}}.t.t :is(.a,.b){backdrop-filter:none}}`,
};
for (const [name, css] of Object.entries(noTargets)) {
  const out = transform({ filename: 'x.css', code: Buffer.from(css), minify: true }).code.toString();
  console.log(`${name}\n  in : ${css}\n  out: ${out}\n`);
}
