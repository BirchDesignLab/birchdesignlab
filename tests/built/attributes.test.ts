import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DIST } from './helpers';

/**
 * The <html> attribute contract (src/lib/scheme.ts, spec §4): light/dark is
 * data-scheme and nothing else. data-face was retired on 09-22-26 and
 * data-theme now names a design school, so neither may drive light/dark
 * anywhere in the shipped site.
 */
function files(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full, ext));
    else if (ext.test(name)) out.push(full);
  }
  return out;
}

const shipped = files(DIST, /\.(html|css|js)$/).filter((f) => !/[\\/](draco|ar)[\\/]/.test(f));

describe('scheme attribute contract in the build', () => {
  it('nothing ships data-face', () => {
    const offenders = shipped.filter((f) => /data-face|dataset\.face/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('no stylesheet keys light or dark on data-theme', () => {
    const offenders = files(DIST, /\.css$/).filter((f) =>
      /\[data-theme=["']?(light|dark)/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('the token blocks key on data-scheme', () => {
    const css = files(DIST, /\.css$/).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(css).toMatch(/\[data-scheme=["']?light["']?\]/);
    expect(css).toMatch(/\[data-scheme=["']?dark["']?\]/);
  });
});
