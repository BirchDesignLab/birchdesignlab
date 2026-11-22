"""Pin a variable font to one instance (every axis at its default unless named),
subset it to the glyphs in a text file, and write it as woff2 plus ttf (the ttf
is only for measuring text in Node with opentype.js).

  python subset_font.py <in font> <text file> <out.woff2> <out.ttf> '<{"wght":700}>'

Deterministic: the head table's modified stamp is left alone. Exits non-zero when the
subset's cmap lacks any non-space character of the text file.
"""
import json
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src, text_file, out_woff2, out_ttf, pins = sys.argv[1:6]
pins = json.loads(pins)
font = TTFont(src, recalcTimestamp=False)
if 'fvar' in font:
    # a pin outside the axis range (an opsz of 13 on an axis that starts at 14) is clamped to it
    limits = {a.axisTag: (None if a.axisTag not in pins else max(a.minValue, min(a.maxValue, pins[a.axisTag]))) for a in font['fvar'].axes}
    font = instancer.instantiateVariableFont(font, limits, inplace=False)
opts = subset.Options()
opts.layout_features = ['kern', 'liga', 'calt']
opts.hinting = False
opts.desubroutinize = True
opts.recalc_timestamp = False
opts.notdef_outline = True
with open(text_file, encoding='utf8') as fh:
    text = fh.read()
sub = subset.Subsetter(opts)
sub.populate(text=text)
sub.subset(font)
# every requested character must survive the subset: a missing one would fall back to a system font
cmap = font.getBestCmap()
missing = sorted({c for c in text if not c.isspace() and ord(c) not in cmap})
if missing:
    sys.stderr.write('subset_font: %s has no glyph for %s\n' % (src, ' '.join('U+%04X %s' % (ord(c), c) for c in missing)))
    sys.exit(3)
font.flavor = None
font.save(out_ttf)
font.flavor = 'woff2'
font.save(out_woff2)
