// Build the two owner-facing manual DOCX deliverables from their markdown
// sources, for THE ONE SWEEP (08-18-26).
//
//   NODE_PATH=<dir with node_modules containing docx> node scripts/docs/build-manual-docx.mjs
//
// docx-js rather than pandoc: pandoc is not installed on this machine, and
// the repo deliberately does not take `docx` as a dependency — point
// NODE_PATH at any node_modules that has it (a scratch install is fine).
//
// The converter covers exactly what the two manuals use: #/##/### headings,
// paragraphs with **bold** / *italic* / `code`, - and 1. lists (with wrapped
// continuation lines), 2-column pipe tables, images, and --- rules. Images
// are sized from their PNG headers: tall phone-shaped shots render at 3in,
// everything else fills the text column. Output lands in ../documentation/,
// same filenames as the 07-28 delivery.
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
const docx = require_('docx');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  HeadingLevel, WidthType, AlignmentType, BorderStyle, LevelFormat, ShadingType,
} = docx;
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const JOBS = [
  { md: 'docs/owners-manual.md', out: '../documentation/CheerAndChatter-Owners-Manual.docx' },
  { md: 'docs/owner-guide-live-event-app.md', out: '../documentation/CheerAndChatter-LiveEventApp-Manual.docx' },
];

const pngSize = (p) => {
  const b = readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

// ---- inline markdown → TextRuns -------------------------------------------
const inline = (text, base = {}) => {
  const runs = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    if (m[2]) runs.push(new TextRun({ text: m[2], bold: true, ...base }));
    else if (m[3]) runs.push(new TextRun({ text: m[3], italics: true, ...base }));
    else runs.push(new TextRun({ text: m[4], font: 'Consolas', ...base }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  return runs;
};

// ---- block parser ----------------------------------------------------------
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
const borders = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

const convert = (mdPath) => {
  const dir = dirname(mdPath);
  const lines = readFileSync(mdPath, 'utf8').split(/\r?\n/);
  const children = [];
  let i = 0;

  const spacing = { after: 160 };
  const flushPara = (buf) => {
    if (buf.length) children.push(new Paragraph({ children: inline(buf.join(' ')), spacing }));
    buf.length = 0;
  };

  const para = [];
  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { flushPara(para); i++; continue; }

    if (line.startsWith('### ')) {
      flushPara(para);
      children.push(new Paragraph({ children: inline(line.slice(4)), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
      i++; continue;
    }
    if (line.startsWith('## ')) {
      flushPara(para);
      children.push(new Paragraph({ children: inline(line.slice(3)), heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 140 } }));
      i++; continue;
    }
    if (line.startsWith('# ')) {
      flushPara(para);
      children.push(new Paragraph({ children: inline(line.slice(2)), heading: HeadingLevel.TITLE, spacing: { after: 200 } }));
      i++; continue;
    }
    if (/^---+\s*$/.test(line)) {
      flushPara(para);
      children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } }, spacing: { before: 200, after: 200 } }));
      i++; continue;
    }

    // Leading whitespace allowed: an image indented under a bullet used to
    // fall through to the paragraph branch and ship as literal markdown text
    // in the DOCX, which is invisible in the markdown and obvious to a client.
    const img = line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img) {
      flushPara(para);
      const path = resolve(dir, img[2]);
      const { w, h } = pngSize(path);
      const width = h > w ? 280 : 620;                 // px at 96dpi
      const height = Math.round((h / w) * width);
      children.push(new Paragraph({
        children: [new ImageRun({ type: 'png', data: readFileSync(path), transformation: { width, height } })],
        alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      }));
      children.push(new Paragraph({ children: inline(img[1], { italics: true, size: 18, color: '666666' }), alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
      i++; continue;
    }

    if (line.startsWith('|')) {
      flushPara(para);
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        if (!/^[-\s|:]+$/.test(lines[i].replace(/\|/g, ''))) rows.push(cells);
        i++;
      }
      const colw = [2600, 6760];
      children.push(new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: colw,
        rows: rows.map((cells, ri) => new TableRow({
          children: cells.map((c, ci) => new TableCell({
            width: { size: colw[ci] ?? 4680, type: WidthType.DXA }, borders,
            shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'EFE9DF' } : undefined,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: inline(c, ri === 0 ? { bold: true } : {}) })],
          })),
        })),
      }));
      children.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    const bullet = line.match(/^- (.*)$/);
    const num = line.match(/^\d+\. (.*)$/);
    if (bullet || num) {
      flushPara(para);
      let text = (bullet ? bullet[1] : num[1]);
      // wrapped continuation lines are indented by 2+ spaces
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*([-|]|\d+\.)/.test(lines[i + 1])) {
        text += ' ' + lines[++i].trim();
      }
      children.push(new Paragraph({
        children: inline(text), spacing: { after: 80 },
        numbering: { reference: bullet ? 'bullets' : 'steps', level: 0 },
      }));
      i++; continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara(para);
  return children;
};

// ----------------------------------------------------------------------------
for (const { md, out } of JOBS) {
  const doc = new Document({
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
        { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', style: { paragraph: { indent: { left: 480, hanging: 240 } } } }] },
      ],
    },
    styles: {
      default: {
        document: { run: { font: 'Georgia', size: 22 }, paragraph: { spacing: { line: 300 } } },
        title: { run: { font: 'Georgia', size: 44, bold: true, color: '2B2B24' } },
        heading1: { run: { font: 'Georgia', size: 32, bold: true, color: '3A4431' } },
        heading2: { run: { font: 'Georgia', size: 26, bold: true, color: '3A4431' } },
      },
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1240, bottom: 1240, left: 1440, right: 1440 } } },
      children: convert(md),
    }],
  });
  mkdirSync(dirname(out), { recursive: true });
  // Belt and braces on the same failure: if any markdown syntax survives into
  // the document text, say so loudly rather than shipping it.
  const leaked = readFileSync(md, 'utf8').split(/\r?\n/)
    .filter(l => /!\[[^\]]*\]\(/.test(l) && !/^\s*!\[/.test(l));
  if (leaked.length) {
    console.error(`${md}: ${leaked.length} inline image(s) not on their own line; they would print as raw text:`);
    for (const l of leaked) console.error(`  ${l.trim().slice(0, 80)}`);
    process.exitCode = 1;
  }
  Packer.toBuffer(doc).then(buf => { writeFileSync(out, buf); console.log('built', out); });
}
