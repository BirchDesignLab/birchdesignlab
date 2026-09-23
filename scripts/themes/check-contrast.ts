/**
 * Token contrast report for every design school (spec §6.3).
 *
 *   npx tsx scripts/themes/check-contrast.ts               every school, drafts included
 *   npx tsx scripts/themes/check-contrast.ts --theme quiet one school
 *
 * Prints theme / scheme / pair / ratio / ok and exits 1 on any failure.
 * tests/theme-contrast.test.ts runs the same check inside `npm run test`; this
 * is the readable table for tuning a palette.
 *
 * Discovery: the registry (src/themes/registry.ts) is loaded through a
 * throwaway Vite dev server's ssrLoadModule, not imported directly. The
 * registry uses import.meta.glob and each meta.ts imports its fonts with
 * '?url', and only Vite understands either; going through Vite means the CLI
 * sees exactly the schools the site and the tests see, meta.contrast included,
 * with no second list to keep in sync. It reads ALL_THEMES, so a school still
 * under construction (route disabled) can be checked too.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { checkTheme, themeCssPath, type ContrastRow } from '../../src/lib/contrast';
import type { ThemeMeta } from '../../src/themes/types';

const root = fileURLToPath(new URL('../../', import.meta.url));

function argValue(flag: string): string | undefined {
  const at = process.argv.indexOf(flag);
  return at === -1 ? undefined : process.argv[at + 1];
}

async function loadThemes(): Promise<readonly ThemeMeta[]> {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const mod = (await server.ssrLoadModule('/src/themes/registry.ts')) as { ALL_THEMES: readonly ThemeMeta[] };
    return mod.ALL_THEMES;
  } finally {
    await server.close();
  }
}

function table(rows: ContrastRow[]): string {
  const cells = rows.map((r) => [
    r.theme,
    r.scheme,
    `${r.pair.fg} on ${r.pair.bg.join(' over ')}`,
    r.error ? 'n/a' : `${r.ratio.toFixed(2)} (min ${r.pair.min})`,
    r.ok ? 'ok' : `FAIL${r.error ? `: ${r.error}` : ''}`,
  ]);
  const head = ['theme', 'scheme', 'pair', 'ratio', 'ok'];
  const widths = head.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i].length)));
  const line = (c: string[]) => c.map((v, i) => (i === c.length - 1 ? v : v.padEnd(widths[i]))).join('  ');
  return [line(head), line(widths.map((w) => '-'.repeat(w))), ...cells.map(line)].join('\n');
}

const only = argValue('--theme');
const themes = (await loadThemes()).filter((t) => !only || t.id === only);
if (themes.length === 0) {
  console.error(only ? `no school "${only}" in src/themes/` : 'no schools in src/themes/');
  process.exit(1);
}

const rows = themes.flatMap((t) => checkTheme(readFileSync(root + themeCssPath(t.id), 'utf8'), t));
console.log(table(rows));
const failed = rows.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} of ${rows.length} pairs fail.` : `\nall ${rows.length} pairs pass.`);
process.exitCode = failed ? 1 : 0;
