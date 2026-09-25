/**
 * Archived one-off probe (Tier 3 Stage 2, 09-23-26): Tally a label folder's wordmark verdicts
 * Kept as a record; see README.md in this folder for what superseded it.
 * Paths inside may point at a scratchpad; fix them before running it again.
 */
const fs=require('fs');
for (const d of process.argv.slice(2)) {
  const m=JSON.parse(fs.readFileSync(d+'/manifest.json','utf8'));
  let c={ov:[0,0],bl:[0,0],uns:0,probs:0,replay:0,gap:0,files:new Set()};
  const rows=[];
  for (const e of m.made) {
    if (!(e.school==='cottagecore'||e.school==='quiet')) continue;
    if (e.school==='quiet' && e.scenario==='arrive' && !/from-(cottagecore|vaporwave)/.test(e.file)) continue;
    if (e.school==='cottagecore' && e.scenario==='arrive' && /from-/.test(e.file) && !/from-(vaporwave|swiss)/.test(e.file)) continue;
    const v=e.wordmarkOverlap||e.wordmarkBlink; const k=e.wordmarkOverlap?'ov':'bl';
    if(!v) continue;
    c[k][v.pass?0:1]++; if(v.unsampled)c.uns++; c.probs+=(e.problems||[]).length;
    c.replay=Math.max(c.replay,e.judge?.replayVsLive?.worst?.diff??-1);
    rows.push(`${e.file.padEnd(72)} ${k} ${v.pass?'pass':'FAIL'} worst=${JSON.stringify(v.worst)} fiow=${e.dense?.framesInOverlapWindow} maxGap=${e.dense?.maxGapMs} imgDur=${e.judge?.resolved?.old?.css?.animationDuration}/${e.judge?.resolved?.new?.css?.animationDuration}`);
  }
  console.log('==',d,`overlap pass/fail ${c.ov} blink pass/fail ${c.bl} unsampled ${c.uns} problems ${c.probs} replayWorst ${c.replay} strips ${rows.length}`);
  if(process.env.V) console.log(rows.join('\n'));
}
