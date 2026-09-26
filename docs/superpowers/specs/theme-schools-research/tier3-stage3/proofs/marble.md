# Tier A proof: vaporwave marble (F3)

Written 09-25-26 for Tier 3 stage 3, pair B, Tier A (proofs). Seat "marble",
port 4467. Binding: `stage3-decisions.md` Answers item 6 (F3 as proposed:
rendered, pristine, tinted and glossy; stills dress the rooms; About's bust
is live and draggable; CC0 mesh, downloaded only after the founder's yes with
file, source and size). Nothing was downloaded. Nothing merges from this
seat; git was left alone.

## What was built

Three committed-to-be files under `scripts/themes/vaporwave/` plus two
measuring scripts:

- `marble-scene.html` and `marble-scene.js`: the scene. three r186 from
  node_modules through an import map. Procedural polished marble on
  `MeshPhysicalMaterial` (clearcoat 1, clearcoat roughness 0.02, base
  roughness 0.3, 0.18 for black), with the veining written in through
  `onBeforeCompile`: world-space fbm warps a banded sine into thin primary
  veins with a soft halo that break in and out, a finer second set, and a
  cloudy two-tone base; veins are a touch rougher than the stone. No
  textures and no UVs, so any prop or scan gets continuous veins. Tints:
  white (lavender-grey veins), pink (rose veins), lavender (violet veins),
  black (white veins). Chrome accents are metal with iridescence (thin film
  260 to 820 nm, film IOR 1.8). The holographic form adds a pastel
  rainbow emission keyed to each facet's angle to the eye, so it reads as
  foil rather than tinted plastic. Light: a PMREM of three's
  `RoomEnvironment` with added pink and cyan softboxes on the back wall, a
  lavender one overhead, a peach one at the side and a white key softbox
  front left; a white key light with a soft VSM shadow; pink and cyan
  directional rim lights; a lavender and pink hemisphere fill; Khronos
  Neutral tone mapping so the pastels keep their hue. Contact shadow: the
  key's VSM shadow on an invisible `ShadowMaterial` catcher plus a radial
  occlusion blob under the prop. Framing walks the camera until the box
  and its shadow footprint fill the frame.
- `render-marble.mjs`: serves the folder and three on 127.0.0.1:4467,
  launches Chromium with `--use-angle=d3d11 --enable-gpu
  --ignore-gpu-blocklist`, logs `WEBGL_debug_renderer_info` and aborts on
  SwiftShader, renders each prop at 2048 px with MSAA, downsamples by
  halving to 1024 and 512 with @napi-rs/canvas, and encodes. Also writes a
  tints sheet, composites on vaporwave's light and dark tokens (read live
  from `src/themes/vaporwave/theme.css`, so a palette change in Tier B
  flows through), and a codec check sheet.
- `measure-bust-bundle.mjs`: esbuild (already installed with Vite) bundles
  the three.js surface a live bust needs, tree-shaken and minified.
- `measure-bust-mesh.mjs`: a scan-like stand-in mesh at four triangle
  counts, quantized and compressed with meshoptimizer's glTF encoder, with
  decode timings.

Run: `BDL_GPU=1 node scripts/themes/vaporwave/render-marble.mjs` (about 3 s
of GPU time plus encoding; `--only <prop>` for one prop).

GPU, every run: `ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU
(0x000024DD) Direct3D11 vs_5_0 ps_5_0, D3D11)`, three r186. Recorded in
`scripts/themes/.out/stage3-proofs/marble/gpu.txt`.

## Outputs

All under `scripts/themes/.out/stage3-proofs/marble/` (gitignored):

- `tints-sheet.png`: all eleven renders on a checker.
- `composite-light.png`, `composite-dark.png`: the props on vaporwave's
  field gradient (`--field-top`, `--field`) with a flattened lobby tile
  floor (`--field-raised` to `--field-foot`, lines in `--rule`) and a
  sheen band.
- `codec-check.png`: decoded WebP beside decoded AVIF at 512, and 1:1
  crops of 1024 stills.
- `png/<prop>-<tint>@2048.png`, `stills/<prop>-<tint>-<size>.{webp,avif}`,
  `sizes.json`.

Props and tints: the marble sphere on a chrome ring (white, pink, black);
the fluted Doric column with an Attic base, an iridescent chrome necking
ring and an abacus, on a three-step plinth in a contrasting marble (white
on black, pink on white, lavender on pink); the faceted holographic form on
a black marble drum (pearl, pink, lavender); a chrome orb (chrome, pink
chrome).

## Honest read of the look

Judged against the references (glossy, over-stylised, rendered; not clay,
not plastic):

- The marble spheres and the black marble are the strongest: wet clearcoat,
  crisp softbox highlights, pink and cyan catching the rims, veins that sit
  under the gloss. They read as Marbloid-style rendered stone.
- The holographic forms read as holographic foil after adding the rainbow
  emission. Before it, with thin-film iridescence alone, they read as flat
  pastel plastic; that version was thrown away.
- The chrome orbs read as polished chrome, but soft: at a 1:1 crop the
  reflections of the studio room are blurry rather than mirror-sharp. A
  larger PMREM (1024) did not change it; the softness comes from the
  RoomEnvironment's own soft lighting plus roughness 0.05.
- The columns are the weakest. They read as tinted marble with gloss, not
  clay, but long surfaces at this camera angle catch few softbox
  reflections, so they look paler and more diffuse than the spheres. The
  fluting reads as grooves with hard fillet lines. Acceptable for a lobby
  prop.
- The composites are proofs of palette fit, not layouts: the props' shadows
  were rendered from a low camera and fall right and back, which does not
  match the composites' higher floor perspective exactly. On dark, the
  shadows almost vanish into the floor, which is fine.

## Tier A fix round (09-25-26)

Four findings from the critic, addressed in `marble-scene.js`; everything
re-rendered.

1. **The centred play-button facet (holo form).** The faceted form's
   icosahedron jitter (a fixed integer seed) happened to leave one large,
   nearly flat-on facet dead centre, catching the key light as a bright
   white triangle that read as a video play button. Re-seeded the jitter
   (7 to 17) and rotated the form (`0.15, 0.6, -0.1` to `0.52, 1.94, 0.37`)
   so no single facet sits centred and flat to the camera. Confirmed by eye
   on all three holo tints: the largest lit facets now sit off-centre and
   the shape reads as a cut gem, not an icon. Re-rendered: the tints sheet,
   the codec-check sheet (`holo-pink`), and both composites.
2. **Marble-look nits, one setting each:**
   - *Vertical softbox streak on the columns.* Tried a narrow bright panel
     twice (left-of-centre, then on the camera axis) to give the fluted
     shaft a glossy streak the way the spheres get one. Neither showed a
     visible band in the render: the shaft's own curvature spreads the
     highlight too wide for one more panel to carve a streak out of it, and
     the second attempt only added an ambient wash. Reverted; the column
     stays as before (paler and more diffuse than the spheres, a known
     limit of this camera angle and light rig, not fixed this round).
   - *Sharper emitters for the chrome.* Added one small, bright panel
     (`scale [1.4, 1.0, 0.1]`, intensity 55) as a hot kicker in front of the
     room rig, alongside the existing soft key. The chrome orb's 1:1 crop
     now shows a crisp thin cross-shaped hit next to the room's soft blob
     reflections, a real (if modest) gain in specular sharpness. The room's
     other soft shapes still read as a boxy room; a full re-light is a
     Tier B job, not a one-setting fix.
   - *Smaller halo on the black marble veins.* Halo width and strength
     turned down (`0.45`/`0.22` to `0.28`/`0.13` in the vein shader). The
     veins are visibly thinner and less glowing at 2048 and in the 1:1
     codec crop, but the branching path of the noise function is unchanged,
     so at large sizes it still reads more like a crack or a lightning
     bolt than a mineral vein. The halo was the one constant asked for;
     changing the vein path itself (frequency, warp) is a further step, not
     taken this round.
   - *Hard pink/white split on the white column's abacus.* The cloud-base
     mix used a narrow smoothstep (`0.35, 0.75`) against a noise scale that,
     at the abacus's small size and height offset, put most of the surface
     hard on one side or the other of the threshold. Widened the transition
     to `0.18, 0.92`. The abacus top now grades from pink to white instead
     of splitting on a hard line (compare the crop against the before
     image). Fixed.
3. **Sizes recorded again below**, from the post-fix render (all four
   settings applied; the reverted column panel is not in these numbers).
   Byte counts moved by under 1 KB across the board; nothing regressed.

## Sizes (current renders, post-fix)

| still | 1024 WebP | 1024 AVIF | 512 WebP | 512 AVIF |
|---|---|---|---|---|
| sphere-white | 38.0 KB | 9.5 KB | 15.7 KB | 4.7 KB |
| sphere-pink | 38.4 KB | 9.7 KB | 15.9 KB | 4.8 KB |
| sphere-black | 46.8 KB | 14.9 KB | 19.3 KB | 6.8 KB |
| column-white | 34.8 KB | 15.5 KB | 14.9 KB | 7.2 KB |
| column-pink | 29.9 KB | 14.4 KB | 12.7 KB | 6.6 KB |
| column-lavender | 30.3 KB | 14.6 KB | 12.9 KB | 6.8 KB |
| holo-pearl | 42.1 KB | 12.8 KB | 17.7 KB | 6.3 KB |
| holo-pink | 42.4 KB | 13.1 KB | 17.8 KB | 6.4 KB |
| holo-lavender | 42.6 KB | 13.1 KB | 17.9 KB | 6.4 KB |
| orb-chrome | 45.1 KB | 13.4 KB | 19.1 KB | 7.0 KB |
| orb-pink | 44.5 KB | 12.9 KB | 18.8 KB | 6.9 KB |

WebP q82 (@napi-rs/canvas); AVIF q55, effort 6, 4:4:4 (sharp). All with
alpha. The codec sheet shows no visible difference between the two at
either size. A room dressed with three 1024 stills costs about 40 KB as
AVIF, about 120 KB as WebP.

**Encoder finding.** @napi-rs/canvas 1.0.9's AVIF encoder is unusable
here. Its quality runs backwards against its own typings (for the same
1024 still: q5 gives 5.8 KB, q50 2.4 KB, q100 1.1 KB, where 100 is meant
to be lossless), and every setting came out visibly smeared. AVIF is
encoded with sharp instead, which Astro's image service already installs
(0.35.4 in node_modules; nothing downloaded). WebP stays on
@napi-rs/canvas as briefed.

## The mesh search (F3), no downloads

Checked through Sketchfab's public API (`api.sketchfab.com/v3/models/<uid>`,
metadata only: licence label, triangle and vertex count) and the museums'
own pages. Sketchfab offers every downloadable model as an auto-converted
glTF/GLB plus the original upload; the archive sizes are only shown to a
signed-in account, so the sizes below are estimates from the geometry
(about 32 bytes per vertex plus 12 per triangle for positions, normals, UVs
and indices) plus textures. The download dialog shows the exact figure; that
is what goes to the founder with the yes request. The textures would be
discarded anyway: the marble is procedural.

Smithsonian Open Access 3D was searched first: its CC0 busts on Sketchfab
are American portraits (Washington, Garfield, Jackson), no classical heads
turned up. Cleveland Museum of Art (CMA) and the Musée Saint-Raymond in
Toulouse are the rich CC0 sources. Several CMA heads carry **CC BY, not
CC0**, on Sketchfab despite the museum's open-access wording (Head of
Aphrodite 1926.53, Head of Trajan 1925.468, Idealized Head 1924.125,
Portrait Head of a Youth 1947.188, Portrait Head of a Man 1925.944), so they
are out.

| # | Model | Source and URL | Licence evidence | Format | Est. size | Triangles | What it is |
|---|---|---|---|---|---|---|---|
| 1 | **2023.108 Head of Apollo** | CMA, https://sketchfab.com/3d-models/2023108-head-of-apollo-8ac05adbe3de41a3bde5c5cbee296b50 | Sketchfab label "CC0 Public Domain"; CMA: "You can copy, modify, and distribute this work, even for commercial purposes" | glTF/GLB (auto), original; 1 material, 4 textures | about 3 MB geometry; likely 10 to 40 MB with textures | 94,564 (47,284 verts) | Roman marble head of Apollo, 1 to 200 CE, 21 cm. Head only, no shoulders. CMA's page notes only a chipped nose tip. |
| 2 | Buste d'Auguste couronné de chêne | Musée Saint-Raymond, https://sketchfab.com/3d-models/buste-dauguste-couronne-de-chene-6ccc01ad1cda47f3b2511ef6fbf07e0b | Sketchfab label "CC0 Public Domain" | glTF/GLB (auto), original; 3 textures | about 10 MB geometry plus textures | 238,472 | White marble bust of Augustus with an oak crown, 19 to 18 BCE, 51 cm, from the Chiragan villa. A true bust with shoulders; condition not checked. |
| 3 | Memnon of Ethiopia | SMK National Gallery of Denmark, https://sketchfab.com/3d-models/memnon-of-ethiopia-55dad8f5a12544f0b2f40183ef919932 | Sketchfab label "CC0 Public Domain"; page: "This is a downscaled (ca. 10 mb) version" | glTF/GLB (auto), original; no textures | about 10 MB (stated) | 506,865 | Scan of a plaster cast (KAS969) of the Roman portrait bust of Memnon, a pupil of Herodes Atticus. Bust with shoulders; heavy to decimate. |
| 4 | The head of "Doryphoros", a plaster cast | Virtual Museums of Małopolska (Academy of Fine Arts, Kraków), https://sketchfab.com/3d-models/the-head-of-doryphoros-a-plaster-cast-59c2a8477e0945d7817b61d5088a97fd | Sketchfab label "CC0 Public Domain" | glTF/GLB (auto), original; 3 textures | about 7 MB geometry plus textures | 252,368 | Plaster cast of the Doryphoros head (Polykleitos). Idealised Greek youth; casts are often complete, but its condition was not verified. |
| 5 | Buste de Tranquillina | Musée Saint-Raymond, https://sketchfab.com/3d-models/buste-de-tranquillina-99885917df7f4008ad8a7eedbf52041d | Sketchfab label "CC0 Public Domain" | glTF/GLB (auto), original; 2 materials | about 2.5 MB geometry plus textures | 80,145 | Marble bust of the empress Tranquillina, 241 to 244 CE. Roman portrait bust; condition not checked. |
| 6 | 1929.998 Portrait Head of Emperor Vespasian | CMA, https://sketchfab.com/3d-models/1929998-portrait-head-of-emperor-vespasian-359e48ed821544fe8cf22c3c5dbbff9d | Sketchfab label "CC0 Public Domain" | glTF/GLB (auto), original | about 2 MB geometry plus textures | 64,654 | Roman marble portrait head, recut from a head of Nero, 64 to 79 CE. Realistic older man; reads Roman more than dreamy. |

Also CC0 but set aside: CMA 1927.209 Head of Alexander the Great (80,000
triangles, but the nose and part of an eyebrow are broken away), CMA
1925.943 Portrait of the Empress Claudia Octavia (80,000, nose broken), and
the Smithsonian's George Washington bust (300,000, neoclassical, but a
recognisable American founder reads as politics, not vaporwave).

**Pick: #1, CMA 2023.108 Head of Apollo.** It is a named classical god
(the brief's Helios and Apollo lineage), CC0 on both the museum and
Sketchfab, an ancient original rather than a cast, only 94,564 triangles
(so decimation to web budgets keeps its detail), and nearly pristine (a
chipped nose tip, which the tint and gloss will swallow at display size;
the founder chose pristine, and this is the closest CC0 scan found). It is
a head without shoulders, which suits the vaporwave staging: it sits on the
same stepped plinth or marble drum as the stand-ins. If the founder wants
shoulders, #2 (Augustus) is the bust; if even a chipped nose tip is too
much, #4 (the Doryphoros cast) is the likeliest complete head, to be
confirmed by looking at it before asking.

**The yes request, when it goes to the founder:** file "2023.108 Head of
Apollo", the glTF download from the Sketchfab URL above (signed in), size
as the download dialog shows it (estimate 10 to 40 MB with textures;
about 3 MB of geometry). The raw download would live in a gitignored folder
(for example `scripts/themes/.out/meshes/`); only the processed web mesh
(about 100 to 250 KB) would be committed.

## The live-bust plan (About's one WebGL canvas)

**Where three.js ships today.** Only on BDL-007 (the Shining Tree): its
`stage` chunk in the frozen base build is 626 KB raw, 157 KB gzip, and
includes three, GLTFLoader and DRACOLoader. The AR card vendors its own
three 0.160 separately. The vaporwave horizon (`fx.ts`) is raw WebGL, not
three. About has no WebGL canvas today, so the bust is its one.

**Estimated script cost** (`measure-bust-bundle.mjs`, esbuild, minified;
Rollup will differ by a few per cent):

| bundle | raw | gzip | brotli |
|---|---|---|---|
| bust stage, glTF + meshopt | 631 KB | 161 KB | 132 KB |
| bust stage, glTF + Draco (JS only) | 612 KB | 156 KB | 128 KB |
| Draco decoder wasm + wrapper (public/draco/) | 245 KB | 73 KB | 57 KB |
| three core alone (renderer and material) | 523 KB | 131 KB | 108 KB |

Meshopt wins: its decoder is a few KB inside the chunk, while Draco adds
73 KB gzip of wasm and wrapper plus a second request. Load the stage with a
dynamic `import()` so three stays a page chunk; Rollup will likely share one
three chunk between BDL-007 and About, so a visitor who has seen one has
cached it for the other.

**Mesh cost** (`measure-bust-mesh.mjs`, scan-like stand-in, 16-bit
positions, 8-bit octahedral normals, no UVs, meshopt glTF encoding; a real
scan is noisier, so allow about 30% more):

| triangles | meshopt | + brotli | decode (desktop, Node) |
|---|---|---|---|
| 20,480 | 103 KB | 60 KB | 0.36 ms |
| 40,500 | 204 KB | 110 KB | 0.44 ms |
| 79,380 | 397 KB | 203 KB | 0.84 ms |
| 95,220 | 475 KB | 239 KB | 0.95 ms |

Decode is negligible even at 4 to 6 times slower on a phone. **Budget:** one
mesh at about 30,000 triangles for every device (about 110 KB with brotli
after the scan noise allowance), or two LODs, 20,000 for coarse pointers or
narrow viewports and 40,000 for desktop. At the canvas size About can give a
centrepiece (roughly 360 to 480 CSS px), 30,000 triangles already outruns
the pixels. The real cost on phones is the fragment shader, not the mesh:
the live stage should run the marble at 4 fbm octaves instead of 6 and
measure in Tier B.

**Processing without new downloads.** meshoptimizer 1.1.1 (encoder,
simplifier) is already on disk, arriving with `@types/three`. Leaning on a
types package's dependency is fragile, so Tier B should either add
meshoptimizer as an explicit devDependency at that same version (no new
bytes, but a package.json change: the orchestrator's or founder's call) or
use gltf-transform/gltfpack (a real install, needs a yes). The processing
script (`scripts/themes/vaporwave/`): read the scan's positions and
indices, drop textures and UVs, centre and orient, simplify to the budget,
reorder, quantize, meshopt-encode, and write a GLB with
`EXT_meshopt_compression` and `KHR_mesh_quantization`.

**Poster to canvas.** The still is the poster: a `<picture>` (AVIF, WebP
fallback) in About's HTML at the centrepiece, so the drawn-ahead copy (which
strips scripts) and a blank or lost canvas both show it. The poster is
rendered by the same scene module, camera, yaw and lights the live stage
uses, which is the point of keeping one module: in Tier B move the scene
into `src/themes/vaporwave/marble/` and have `render-marble.mjs` import it,
so the offline stills and the live bust can never drift. The stage loads
when the centrepiece nears the viewport (IntersectionObserver with a
margin) and the main thread is idle; the canvas sits transparent under the
poster, renders its first frame in the poster's exact pose, then the poster
fades out over about 200 ms and stays in the DOM for a context loss. No
visible jump, because the first live frame and the poster are the same
picture.

**Drag to turn, rigid (the founder's glass note applies here too).** The
founder dislikes rubbery motion, so the bust handles like stone on a
turntable:
- While dragging, yaw follows the pointer one to one, with no smoothing lag
  and no spring.
- Pitch, if allowed at all, is clamped to about 10 degrees and stops hard
  at the limit, no overshoot.
- On release, a glide that decays exponentially to a stop (time constant
  about 350 ms, release velocity capped), with no bounce and no settle-back.
- The slow idle turn (one turn per 60 s, as BDL-007) resumes after about 4 s
  without input, easing in over about 1.2 s.
- `touch-action: pan-y` so a vertical swipe still scrolls the page on a
  phone and a horizontal drag turns the bust; `grab`/`grabbing` cursors.
- Keyboard: the canvas is focusable with an `aria-label`, and the arrow keys
  turn it in fixed steps, following the README's rule that live controls
  are real, labelled elements.

**README rules.** One WebGL canvas on the page (About has none today).
Mount through `onMount` from `src/lib/lifecycle.ts`, returning at once
unless `document.documentElement.dataset.theme` is vaporwave. Cap
`devicePixelRatio` at 1.5, and 1.25 on coarse pointers or narrow viewports
(the E11 precedent). Render on demand: only while dragging, gliding or idle
turning, at 30 fps for the idle turn as BDL-007 does. Pause when the tab is
hidden or the canvas is off-screen. `webglcontextlost`: prevent default,
bring the poster back; `webglcontextrestored`: rebuild and fade the poster
out again. Teardown disposes geometry, materials and the PMREM target and
releases the context with `WEBGL_lose_context`. The page reads fine with the
canvas blank because the poster is real HTML. The live stage drops the VSM
shadow map and keeps the baked occlusion blob, and builds the PMREM once at
256 px.

**Provenance.** `assets.provenance: 'public-domain'` already exists in
`src/themes/types.ts`. When the mesh lands, vaporwave's `meta.ts` moves from
`original-vector` with a note along the lines of: the head is a CC0 3D scan
of the Head of Apollo (Roman, 1 to 200 CE, Cleveland Museum of Art
2023.108); palms, columns, the rune and the meander are drawn; the marble is
rendered. (Another seat has `meta.ts` open in the working tree today; this
seat did not touch it.)

## The Tier B sweep and the pick (09-25-26)

A second search at the start of Tier B (workflow `marble-head-sources`: four
Sonnet finders over Sketchfab's CC0 search, threedscans.com, other museum
sources and the six picks above; an Opus shortlist; a Sonnet licence
refuter). Nothing was downloaded. The candidates, thumbnails hotlinked from
each source's own page, are in `scripts/themes/vaporwave/marble-candidates.json`
and on the sheet `scripts/themes/.out/stage3-proofs/marble/candidates.jpg`
(`marble-candidates-sheet.mjs`).

- **SMK's Royal Cast Collection is the richest free source.** Its plaster
  cast scans are CC0 on Sketchfab and Public Domain Mark or CC0 on
  MyMiniFactory (the refuter checked the David page: CC0, remixable, no
  commercial restriction; SMK's own licence page agrees). Other MyMiniFactory
  uploads are often CC BY-NC-SA, so each object must be checked on its own
  page. New pristine options from it: the head of Michelangelo's David, a
  bust of Antinous as Dionysus, the Apollo Belvedere (whole statue), the
  Lycean Apollo (whole statue), and a Venus de Milo (whole statue).
- **threedscans.com no longer states a licence.** Its info page said "All
  scans can be downloaded and used without copyright restrictions" in every
  Wayback snapshot from 2017 to 12-16-24, and the line is gone from
  07-30-25 on, with no replacement. Its scans (a pristine Aphrodite bust, a
  Napoleon in a laurel wreath) rank below every CC0 option.
- No CC0 scan of the Helios bust turned up. Smithsonian's CC0 busts are
  American portraits; Paris Musées' CC0 open content has no 3D.

**Founder's pick: Venus (Tête d'Aphrodite-Vénus), Musée Saint-Raymond,
https://sketchfab.com/3d-models/venus-dd50296725c54dc6a7dc68f2b9acc9d0.**
Parian marble, 1st century, from the Chiragan villa excavations (1826); a
replica of Praxiteles' Knidian Aphrodite; 40 cm; inventory Ra 52; scanned
with an Artec Eva or Spider by IMA Solutions. Sketchfab API: licence "CC0
Public Domain", 199,994 triangles, 99,999 vertices, downloadable. Viewed at
1920 px: nose, lips and chin intact, a smooth idealised face under a banded
coiffure with a chignon; an old break line runs round the neck above the
bust cut, which the plinth hides. Its triangle count decimates comfortably to
the 30,000 budget above.

The download (the founder's, signed in): the glTF option in Sketchfab's
download dialog, unzipped into `scripts/themes/.out/meshes/venus/`
(gitignored). Its size shows in the dialog; estimate about 5 to 30 MB with
textures, which the pipeline discards. Provenance for `meta.ts` when it
lands: the head is a CC0 3D scan of a Roman marble head of Aphrodite
(Knidian type, 1st century, from the Chiragan villa, Musée Saint-Raymond,
Toulouse, Ra 52).

## Open for the founder

- Yes or no to downloading the pick (Head of Apollo, CMA 2023.108, from the
  Sketchfab URL above, size as the dialog shows), or one of the alternates.
- Whether the chipped nose tip on the Apollo is within "pristine".
- Whether the chrome's now-modest sharpening and the black marble's now-thinner
  veins go far enough, or whether Tier B should re-light the chrome fully and
  rework the vein path itself rather than just its halo.
