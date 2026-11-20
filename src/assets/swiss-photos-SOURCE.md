# Swiss photographs: sources and processing

Stage 6, wave 1, task 6 (swiss P4, "typophoto"). Two photographs, approved by
the founder on 11-19-26. Both are by W.carter, dedicated to the public domain
(CC0 1.0), and neither shows a person.

| Derivatives | Original | Used |
|---|---|---|
| `swiss-lab-band-1200.*`, `swiss-lab-band-2000.*` | `Part_of_birch_trunk_in_Norrkila.jpg`, 4774x2686, https://commons.wikimedia.org/wiki/File:Part_of_birch_trunk_in_Norrkila.jpg | Home's lab band (`src/themes/swiss/pages/Home.astro`) |
| `swiss-field-720.*`, `swiss-field-1200.*`, `swiss-field-1800.*` | `Birch_trunk_in_Norrkila_1.jpg`, 4824x3216, https://commons.wikimedia.org/wiki/File:Birch_trunk_in_Norrkila_1.jpg | About's red field (`src/themes/swiss/pages/About.astro`) |

Author: W.carter. Licence: CC0 1.0 Universal (public domain dedication),
https://creativecommons.org/publicdomain/zero/1.0/. No attribution is required;
it is recorded here anyway.

The untouched originals are not in the repository (about 20 MB). They are staged
in the gitignored `scripts/themes/.out/stage6/photos/`; download them again from
the two Commons pages above.

## Processing

All of it is `scripts/themes/stage6/w1-t6-photos.mjs`; rerun it to regenerate
every file here (`node scripts/themes/stage6/w1-t6-photos.mjs`). Each file is
written as AVIF and as WebP; the page serves AVIF and falls back to WebP.

**Lab band, a hard threshold.** The original is resized to 1200 and 2000 px
wide, taken to grey, blurred (sigma 2.2) so grain does not become speckle, and
cut at grey 150 of 255: at or below is a mark, above is clear. The result is
one colour carried by the alpha channel (black marks on transparent), about
27 percent marked. The page shows it as it is, black marks, on a white band:
in light a white field at the head of the black sheet, in dark the sheet itself
(a white field). One file serves both schemes, with no CSS inversion.

**About's field, a red duotone.** The original is cropped 4 percent off the
left, resized to 720, 1200 and 1800 px wide, and its red channel run through
a smoothstep from 145 to 225 (of 255) into an alpha value; every pixel is the
paper colour (#fafaf7). Over the field's own red (#da0016) the mix of the two
is a red-to-paper duotone, and because the sky and the branches fall to alpha
0 there is no rectangle edge where the image ends. The red channel is used,
not luminance, because it separates the blue sky from the white bark. The
image is not flipped, recoloured otherwise or retouched.

## Weight

Re-measured in Stage 6 wave 2 (task 10), in Chromium at DPR 1 on frozen builds
(`scripts/themes/stage6/w2-t10-weights.mjs`), summing what the page fetched.

**About's field image.** Before (`stage6-base`: the Shining Tree, served by
Astro's image service as WebP in four widths): 45,246 B at 480w, 85,750 B at
760w, 142,226 B at 1120w, 190,726 B at 1477w. The 190,250 B this note first
quoted as the "before" was the source file's size, not what any visitor was sent. After:
AVIF 34,461 B (720w), 74,603 B (1200w), 132,395 B (1800w), with WebP fallbacks
52,110 / 137,042 / 284,764 B.

| What a visitor fetches | Before | After |
|---|---|---|
| About at 1440, DPR 1 | 85,750 B (760w WebP) | 74,603 B (1200w AVIF), 13 percent less |
| About at 1024 and 820, DPR 1 | 45,246 B (480w WebP) | 74,603 B (1200w AVIF), 29,357 B more |
| About at 390, DPR 1 | 45,246 B (480w WebP) | 34,461 B (720w AVIF), 24 percent less |
| Home's lab band at 1440 / 1024, 820 and 390 | none | 12,939 B (2000w AVIF) / 6,343 B (1200w AVIF) |

So the change per visitor is 85.7 KB to 74.6 KB at a desktop, a little more at
a tablet and less on a phone, and Home gains a 6 to 13 KB picture. WebP
fallbacks (browsers without AVIF) are 52 to 285 KB for About and 9 to 21 KB
for Home's band. `src/assets/swiss-field.webp` is gone;
`scripts/themes/swiss/make-field-image.mjs` and `tree-still-large.png` (the
Shining Tree duotone it made) are kept as the record of the retired image and
are no longer part of the build.

**`sizes` on About** (Stage 6 wave 2): the field image renders min(125vw,
900px) wide below 640, min(100vw, 820px) from 640 to 1023, and from 1024 it
runs the field's height (clamp(640px, 54vw, 1000px)) at 1800:1250, so
clamp(922px, 77.8vw, 1440px) wide. The attribute says exactly that. Home's
band is `100vw`.
