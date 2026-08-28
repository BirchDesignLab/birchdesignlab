#!/usr/bin/env python3
"""Blur a rectangle out of a screenshot, hard enough that it stays blurred.

Why this exists: live-app screenshots for the BDL-005 case study carry things
that should not be published, chiefly the TV pairing code in the host console
header (`cheerandchatter.com/tv/CODE`). The TV side takes no auth and pairs by
exactly that code, so a legible one in a portfolio image is a live handle on
somebody's event screen.

Why blur and not a black bar: founder preference, and a bar is uglier on a page
that is otherwise trying to look considered. The catch is that a soft blur is
not redaction. Gaussian blur is a convolution, so it is partially invertible,
and a 5-character code in a known font has a search space small enough to brute
force by rendering candidates and comparing them to the blurred pixels. A bar
is crude but honest; a weak blur looks safe and is not.

So the default is not a cosmetic blur. The radius scales with the height of the
region (`--strength`, default 0.55 of it), which destroys stroke-level detail
rather than smearing it, and the region is downsampled to a few pixels and
re-enlarged first, which is a genuine one-way loss of information. The blur
after that is only there to stop the mosaic reading as a redaction box.

Coordinates are fractions of width/height, not pixels, so the same call works
across the phone and desktop captures.

  python scripts/screenshots/redact-region.py in.png out.png --box 0.18 0.17 0.72 0.22

  --box  L T R B as fractions of the image (0-1)
  --strength  blur radius as a fraction of region height (default 0.55)
  --cells     mosaic width in cells before blurring (default 6)
  --inspect   write out.png with the region outlined instead of redacted,
              to check the box before committing to it
"""
import argparse
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--box", nargs=4, type=float, required=True, metavar=("L", "T", "R", "B"))
ap.add_argument("--strength", type=float, default=0.55)
ap.add_argument("--cells", type=int, default=6)
ap.add_argument("--inspect", action="store_true")
a = ap.parse_args()

im = Image.open(a.src).convert("RGB")
W, H = im.size
l, t, r, b = a.box
box = (round(l * W), round(t * H), round(r * W), round(b * H))
bw, bh = box[2] - box[0], box[3] - box[1]
if bw < 2 or bh < 2:
    raise SystemExit(f"box resolves to {bw}x{bh}px, which is nothing; check the fractions")

if a.inspect:
    d = ImageDraw.Draw(im)
    d.rectangle(box, outline=(255, 0, 0), width=4)
    im.save(a.dst)
    print(f"{a.dst}  {W}x{H}, region {bw}x{bh}px outlined")
    raise SystemExit(0)

region = im.crop(box)
# Mosaic first. This is the part that actually destroys the glyphs; everything
# after it is cosmetic.
cells = max(1, a.cells)
region = region.resize((cells, max(1, round(cells * bh / bw))), Image.BILINEAR)
region = region.resize((bw, bh), Image.NEAREST)
region = region.filter(ImageFilter.GaussianBlur(max(2.0, bh * a.strength)))
im.paste(region, box)
im.save(a.dst)
print(f"{a.dst}  {W}x{H}, redacted {bw}x{bh}px at {box}")
