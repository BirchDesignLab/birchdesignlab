/**
 * A one-shot local drop box for bytes coming out of a browser page.
 *
 * Written to re-shoot BDL-007's still. The stage only exists inside a real
 * compositing browser, so the pixels have to start life in the page: the
 * capture is taken from the live WebGL canvas with toDataURL. Getting a few
 * hundred KB of base64 back out through an automation channel is miserable
 * and expensive, so the page POSTs it here instead and it lands on disk in
 * one hop.
 *
 * Listens once, writes the first upload it receives, and exits. CORS is wide
 * open because it is alive for a few seconds on localhost and is never a
 * thing that ships.
 *
 * Usage:
 *   node scripts/lab/receive-capture.mjs <outfile> [port]
 *
 * Then from the page:
 *   fetch('http://localhost:8787/', { method: 'POST', body: dataUrl })
 */
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const port = Number(process.argv[3] ?? 8787);
if (!out) {
  console.error('usage: node scripts/lab/receive-capture.mjs <outfile> [port]');
  process.exit(1);
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405).end('post a data url');
    return;
  }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    // Accept either a full data: URL or bare base64.
    const base64 = body.startsWith('data:') ? body.slice(body.indexOf(',') + 1) : body;
    const bytes = Buffer.from(base64, 'base64');
    writeFileSync(out, bytes);
    res.writeHead(200).end('ok');
    console.log(`wrote ${out} (${bytes.length} bytes)`);
    server.close(() => process.exit(0));
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`waiting for one upload on http://localhost:${port}/ -> ${out}`);
});
