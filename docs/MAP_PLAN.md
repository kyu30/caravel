# Interactive regional map

Status: **built**, first pass. Supersedes the old "ship placeholder now, add
`react-simple-maps` later" plan in `docs/DEPENDENCIES.md`/`CLAUDE.md`. Origin:
design discussion in a separate Claude session (transcript
`cse_01W2ZJL5goHca9qxnvY6sjB4`), continued here once real assets existed.

## What it is

Six PNGs from mapchart.net — full world-map copies, each with one region
recolored navy against a neutral-gray base, all identical canvas size
(6460×3480) — used as **hover-swap frames**: one image sits visible as the
default/resting state, and crossfades to the region-specific highlight on
hover/focus. No live geographic rendering, no `react-simple-maps`/d3-geo/
topojson — zero new dependencies.

Click targets are real `<a>` elements, one per region, shaped with an SVG
`clipPath` **traced from the actual highlighted pixels** in each source PNG
(not hand-drawn) — see "How the hit-areas are generated" below. Real anchors
clip-tested this way are natively focusable/readable, unlike the classic
`<img usemap>` + `<area>` pattern, which has patchy screen-reader/keyboard
support.

## Files

| File | Role |
|---|---|
| `web/src/maps/*.png` | Source exports from mapchart.net (not web-served; input to the build scripts) |
| `web/public/images/map/{slug}.png` | Web-optimized per-region highlight frames (1600px wide, palette PNG, ~150KB each) |
| `web/public/images/map/default.png` | Synthesized "all regions" composite — the resting/default view |
| `web/src/lib/mapShapes.ts` | Traced hit-area polygons per region, `[x%, y%][]` per landmass/island |
| `web/src/components/RegionalMap.astro` | The component — stacks the images, builds the SVG `clipPath`s, wires hover/focus |
| `scripts/build-map-assets.mjs` | Regenerates the `public/images/map/` PNGs + composite from the source files |
| `scripts/trace-map-regions.mjs` | Regenerates `mapShapes.ts` by auto-detecting the highlight color and tracing hit-area polygons from pixels |

## Known issue — fix before calling this final

The `swana` and `eeca` source PNGs (currently `MECA.png` / `EER.png`) don't
match those regions' actual coverage:
- **North Africa is orphaned** — not highlighted in either the Africa file or
  the SWANA file, even though the region is named "Southwest Asia & **North
  Africa**."
- **Central Asia is in the wrong file** — it's highlighted in the
  Middle-East file, but the region is named "Eastern Europe & **Central
  Asia**."

Fix: regenerate those two exports on mapchart.net —
- `swana` → Southwest Asia (Saudi Arabia, Yemen, Oman, UAE, Qatar, Bahrain,
  Kuwait, Iraq, Iran, Jordan, Israel/Palestine, Lebanon, Syria) **+** North
  Africa (Morocco, Algeria, Tunisia, Libya, Egypt) — **without** Central Asia
- `eeca` → keep the existing Eastern Europe/Russia/Caucasus fill, **add**
  Central Asia (Kazakhstan, Uzbekistan, Turkmenistan, Kyrgyzstan, Tajikistan)

Keep the same map framing/zoom/projection when re-exporting — the six source
files must stay pixel-aligned (identical canvas size) for the hover-swap and
the traced hit-areas to line up. Drop the two replacements into
`web/src/maps/` (same filenames), then re-run both scripts (below).

## Regenerating after a source image changes

```bash
cd web
node ../scripts/build-map-assets.mjs     # rebuilds public/images/map/*.png + default.png
node ../scripts/trace-map-regions.mjs    # re-traces web/src/lib/mapShapes.ts
```
Both scripts auto-detect the highlight color and re-derive everything from
pixels — no manual coordinate editing needed even after a source PNG changes.

## How the hit-areas are generated (for future reference)

`scripts/trace-map-regions.mjs`, per region:
1. Auto-detects the "highlighted" navy color via a color-frequency histogram
   (picks the dominant dark, blue-dominant color).
2. Builds a binary pixel mask (highlighted vs. not) at a downscaled resolution.
3. Splits the mask into connected components via flood fill — this is what lets
   disconnected landmasses (e.g. Madagascar vs. mainland Africa, Indonesia vs.
   mainland Asia) become separate polygons instead of one shape bridging open
   ocean.
4. Traces a silhouette per component (row-band min/max x — a "vertical slice"
   polygon), decimates to ~45 points, and converts to percentage coordinates.
5. Writes everything to `mapShapes.ts`. `RegionalMap.astro` turns each
   region's polygon list into an SVG `<clipPath>` (one `<polygon>` child per
   landmass/island) applied to that region's invisible `<a>` hit-area via
   `clip-path: url(#rmap-clip-<slug>)`.

This gave noticeably better results than hand-drawn polygon approximations —
verified by rendering the traced shapes back over the composite image as a
colored overlay and checking they track each coastline.

## Default/resting view

Unhighlighted — plain gray/white base map, nothing colored in. Synthesized by
lighten-blending all 6 region sources together: for any pixel, at most one of
the six files has it navy and the other five have it gray, and since gray has
higher channel values than navy, a per-pixel max/lighten blend always picks
gray — pixel-accurate, no separate "blank" export needed from mapchart.net.
Regions light up only on hover/focus.

## `USA.png`

Not used. Different export resolution than the other six (1024×552 vs.
6460×3480), though verified to be the same map framing/projection (resized up
and overlaid on another region file — borders lined up pixel-for-pixel) in
case it's useful later. Not a clickable region — the paper doesn't cover
domestic US news, and it's not in the site's taxonomy. Left in `web/src/maps/`;
delete it if it's not going to be used for anything.

## Still open

- Regenerate `swana`/`eeca` (above) — the one thing blocking this from being
  "done" rather than a preview.
- Touch-device behavior: currently a tap on a region navigates immediately
  (hover/focus styles are irrelevant on touch — there's no highlight step).
  Revisit if you'd rather have a highlight-then-navigate two-tap pattern.
- The traced polygons are a close approximation (silhouette tracing), not
  pixel-perfect at every coastline detail — fine for click-target purposes:
  reasonably-generous is preferable to too-tight here.
