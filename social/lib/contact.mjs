/**
 * Contact sheets: N frames tiled into one image for eyeballing.
 *
 * A clip cannot be judged in a terminal and a single frame does not show
 * motion. A row of evenly-spaced frames does both, and it is the cheapest thing
 * to hand someone who has to make a framing call.
 */
import { mkdir, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run } from './ffmpeg.mjs';
import { frameName } from './frames.mjs';

/**
 * Tile chosen frames from a frames directory into one PNG.
 *
 * @param {object} opts
 * @param {string}   opts.framesDir
 * @param {number[]} opts.indices     which frames, in order
 * @param {string}   opts.outFile
 * @param {number}  [opts.cellWidth=540]
 * @param {number}  [opts.columns]    defaults to indices.length (one row)
 * @param {string[]}[opts.labels]     drawn under each cell when supplied
 */
export async function contactSheet(opts) {
  const {
    framesDir,
    indices,
    outFile,
    cellWidth = 540,
    columns = indices.length,
    labels,
  } = opts;

  if (!indices.length) throw new Error('contactSheet: no indices');

  const staging = await mkdtemp(path.join(tmpdir(), 'bdl-sheet-'));
  await mkdir(path.dirname(outFile), { recursive: true });

  try {
    // ffmpeg's tile filter wants a contiguous sequence, so stage the chosen
    // frames under fresh consecutive numbers rather than trying to select
    // sparse indices out of the original directory.
    const { copyFile } = await import('node:fs/promises');
    for (let i = 0; i < indices.length; i++) {
      await copyFile(path.join(framesDir, frameName(indices[i])), path.join(staging, frameName(i)));
    }

    const rows = Math.ceil(indices.length / columns);
    const filters = [`scale=${cellWidth}:-1`];
    if (labels?.length) {
      // Burned-in labels are for the contact sheet only; they never touch a
      // deliverable. drawtext with no fontfile uses ffmpeg's built-in.
      filters.push('pad=iw:ih+34:0:0:color=black');
    }
    filters.push(`tile=${columns}x${rows}:margin=8:padding=8:color=black`);

    await run('ffmpeg', [
      '-hide_banner',
      '-y',
      '-framerate', '1',
      '-start_number', '0',
      '-i', path.join(staging, '%06d.png'),
      '-frames:v', '1',
      '-vf', filters.join(','),
      outFile,
    ]);

    return outFile;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/** `count` evenly spaced indices across [0, total-1], endpoints included. */
export function evenIndices(total, count) {
  if (count >= total) return Array.from({ length: total }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (total - 1)) / (count - 1)));
}
