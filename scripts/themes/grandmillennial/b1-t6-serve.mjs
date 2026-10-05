/**
 * B1 task 6 helper: serves dist/ on one port until killed (the controller's
 * assigned port for the fix task is 4460).
 *   node scripts/themes/grandmillennial/b1-t6-serve.mjs [port=4460]
 */
import { serveDist } from '../lib/serve-dist.mjs';
const port = +(process.argv[2] || 4460);
await serveDist(port);
console.log(`serving dist/ on http://127.0.0.1:${port}`);
