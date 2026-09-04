/**
 * Frame filename convention, shared by the recorder and the encoder.
 *
 * It lives in its own module so that encode.mjs does not have to import
 * capture.mjs — and therefore Playwright — just to know how a frame is named.
 * Encoding and verifying a finished sequence should not require a browser.
 */

/** Zero-padded frame filename. ffmpeg reads the directory as `%06d.png`. */
export function frameName(i) {
  return `${String(i).padStart(6, '0')}.png`;
}

/** The glob ffmpeg is given for a directory of these. */
export const FRAME_PATTERN = '%06d.png';
