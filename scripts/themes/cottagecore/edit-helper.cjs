/* Exact-string edit helper that keeps a file's CRLF line endings. Used by the
   Stage 5 B2 task 1 edits. Usage: require('./edit-helper.cjs')(file, [[from, to], ...]) */
const fs = require('fs');
module.exports = function edit(file, pairs) {
  let s = fs.readFileSync(file, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, got ${n} for: ${a.slice(0, 70)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
};
