// BDL-013 o5b: real per-site file counts for the framework mockup.
//
//   node scripts/lab/count-o5b-sites.mjs
//
// Generates three sites with bdlBase's own generator, read-only against
// C:/git/bdlBase, into the gitignored docs/bdl-013/mockups/shots/gen/:
//   bayou-kitchen   fixtures/bayou-kitchen.client.json (menu, ordering, booking)
//   bayou-no-order  same fixture with modules.ordering = false (the ch2 flip)
//   salon           fixtures/salon.client.json (menu off, ordering off)
// Prints tracked-file counts (git ls-files in each generated repo), page
// counts (src/pages files), and the grep -r "modules/ordering" hit count.
// Numbers feed the COUNTS constant in o5b-framework.html.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = 'C:/git/bdlBase';
const gen = join(root, 'docs', 'bdl-013', 'mockups', 'shots', 'gen');
rmSync(gen, { recursive: true, force: true });
mkdirSync(gen, { recursive: true });

const fx = (n) => join(base, 'scripts', 'create-client-site', 'fixtures', n + '.client.json');
const variant = JSON.parse(readFileSync(fx('bayou-kitchen'), 'utf8'));
variant.modules.ordering = false;
const variantPath = join(gen, 'bayou-no-order.client.json');
writeFileSync(variantPath, JSON.stringify(variant, null, 2));

const jobs = [
  ['bayou-kitchen', fx('bayou-kitchen')],
  ['bayou-no-order', variantPath],
  ['salon', fx('salon')],
];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const hits = (d) => walk(d).filter((p) => !p.split(/[\\/]/).includes('.git') && /modules[\\/]ordering/.test(readFileSync(p, 'latin1'))).length;
const out = {};
for (const [name, cfg] of jobs) {
  const dir = join(gen, name);
  execFileSync('node', [join(base, 'scripts', 'create-client-site', 'core.mjs'), '--config', cfg, '--out', dir, '--allow-dirty'], { stdio: 'ignore' });
  const tracked = execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  out[name] = {
    files: tracked.length,
    pages: tracked.filter((f) => f.startsWith('src/pages/')).length,
    orderingPaths: tracked.filter((f) => /ordering/i.test(f)).length,
    modulesOrderingHits: hits(dir),
  };
}
console.log(JSON.stringify(out, null, 2));
