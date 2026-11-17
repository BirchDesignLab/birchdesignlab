"""Pin a variable font to one instance (every axis at its default unless named),
subset it to the glyphs in a text file, and write it as woff2 plus ttf (the ttf
is only for measuring text in Node with opentype.js).

  python subset_font.py <in font> <text file> <out.woff2> <out.ttf> '<{"wght":700}>'

Deterministic: the head table's modified stamp is left alone.
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
    limits = {a.axisTag: pins.get(a.axisTag) for a in font['fvar'].axes}
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
font.flavor = None
font.save(out_ttf)
font.flavor = 'woff2'
font.save(out_woff2)
