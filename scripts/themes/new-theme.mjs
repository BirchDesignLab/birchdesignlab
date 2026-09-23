/**
 * Stamp a new design school from scripts/themes/template/.
 *
 * Written 09-22-26 for the theme-schools build. The template is deliberately
 * plain and complete: every copy field rendered, the contact contract in
 * place, tokens for both schemes. A freshly stamped school passes every
 * built-site guard before a line of design is written, so a school's author
 * starts from correct and only has to make it beautiful.
 *
 * The route is created DISABLED, as src/pages/t/<id>/_[...page].astro (Astro
 * ignores underscored files), so a half-built school never breaks anyone
 * else's build. scripts/themes/render.mjs enables it for its own builds;
 * `--enable` here, or renaming the file, turns it on for good.
 *
 * Usage: node scripts/themes/new-theme.mjs <id> "<Name>" [--enable]
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE = join(REPO, 'scripts', 'themes', 'template');
const [id, name] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const enable = process.argv.includes('--enable');

if (!id || !name || !/^[a-z][a-z0-9-]{0,31}$/.test(id)) {
  console.error('usage: node scripts/themes/new-theme.mjs <id> "<Name>" [--enable]   (id: lowercase, digits, hyphens)');
  process.exit(1);
}
const themeDir = join(REPO, 'src', 'themes', id);
if (existsSync(themeDir)) {
  console.error(`src/themes/${id}/ already exists`);
  process.exit(1);
}

const fill = (text) => text.replaceAll('__ID__', id).replaceAll('__NAME__', name);

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    if (entry === 'route.astro') continue;
    const src = join(from, entry);
    const dest = join(to, entry);
    if (statSync(src).isDirectory()) copyTree(src, dest);
    else writeFileSync(dest, fill(readFileSync(src, 'utf8')));
  }
}

copyTree(TEMPLATE, themeDir);
const routeDir = join(REPO, 'src', 'pages', 't', id);
mkdirSync(routeDir, { recursive: true });
const routeFile = join(routeDir, enable ? '[...page].astro' : '_[...page].astro');
writeFileSync(routeFile, fill(readFileSync(join(TEMPLATE, 'route.astro'), 'utf8')));

console.log(`stamped src/themes/${id}/ and ${routeFile.replace(REPO, '').replace(/\\/g, '/')}`);
console.log('next: fill meta.ts, design theme.css and the components, then');
console.log(`      node scripts/themes/render.mjs --theme ${id}`);
