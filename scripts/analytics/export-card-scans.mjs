#!/usr/bin/env node
// Export card-scan beacon rows from Analytics Engine before they age out.
//
// Why: POST /api/beacon (worker/index.ts) writes {channel, ts} to the
// `ar_card_scans` dataset and nowhere else. Analytics Engine keeps about three
// months, so the first scans (live 08-25-26) start expiring around 11-25-26.
// Run this every month or two until a durable store exists; each run merges
// into the existing CSV, so nothing already exported is lost.
//
// Output (default docs/private/card-scans/, gitignored: the repo is public):
//   scans.csv          one row per data point, merged and de-duplicated
//   daily-totals.csv   scans per UTC day per channel, rebuilt from scans.csv
//
// Usage (PowerShell):
//   $env:CF_ACCOUNT_ID = '<account id>'  # the one holding the birchdesignlab Worker:
//                                        # same as account_id in share/wrangler.jsonc
//   $env:CF_API_TOKEN  = '<token with Account Analytics: Read>'
//   node scripts/analytics/export-card-scans.mjs [outDir]
//
// Rows carry no PII by design: channel name, client timestamp, server time.
// `_sample_interval` is kept so counts stay correct if AE ever samples.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DATASET = 'ar_card_scans';
const LOOKBACK_DAYS = 120; // longer than retention, so a run grabs everything left

const account = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_API_TOKEN;
if (!account || !token) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN (Account Analytics: Read).');
  process.exit(2);
}
const outDir = process.argv[2] ?? join('docs', 'private', 'card-scans');

const sql = `
  SELECT timestamp, index1 AS channel, double1 AS client_ts, _sample_interval AS sample_interval
  FROM ${DATASET}
  WHERE timestamp > NOW() - INTERVAL '${LOOKBACK_DAYS}' DAY
  ORDER BY timestamp
  FORMAT JSON`;

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
  { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: sql },
);
const body = await res.text();
if (!res.ok) {
  console.error(`Analytics Engine SQL API ${res.status}: ${body.slice(0, 500)}`);
  process.exit(1);
}
const fresh = JSON.parse(body).data ?? [];

const HEADER = 'timestamp,channel,client_ts,sample_interval';
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rowLine = (r) =>
  [r.timestamp, r.channel, r.client_ts, r.sample_interval].map(csvCell).join(',');

await mkdir(outDir, { recursive: true });
const scansPath = join(outDir, 'scans.csv');

// Merge with what earlier runs saved. Key on the whole row: two scans in the
// same second on the same card are indistinguishable anyway.
const lines = new Set();
if (existsSync(scansPath)) {
  const prior = (await readFile(scansPath, 'utf8')).split(/\r?\n/).slice(1);
  for (const l of prior) if (l.trim()) lines.add(l);
}
const before = lines.size;
for (const r of fresh) lines.add(rowLine(r));
const merged = [...lines].sort();
await writeFile(scansPath, [HEADER, ...merged].join('\n') + '\n');

// Daily totals, weighted by sample interval.
const totals = new Map();
for (const l of merged) {
  const [ts, channel, , interval] = l.split(',');
  const key = `${ts.slice(0, 10)},${channel}`;
  totals.set(key, (totals.get(key) ?? 0) + (Number(interval) || 1));
}
const totalLines = [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => `${k},${n}`);
await writeFile(join(outDir, 'daily-totals.csv'), ['day,channel,scans', ...totalLines].join('\n') + '\n');

const oldest = merged[0]?.slice(0, 19) ?? 'none';
console.log(
  `${fresh.length} rows from AE, ${merged.length - before} new, ${merged.length} total (oldest ${oldest}). Wrote ${outDir}`,
);
