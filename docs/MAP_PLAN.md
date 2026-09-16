# Interactive regional map

Status: **done**. Supersedes the old "ship placeholder now, add
`react-simple-maps` later" plan in `docs/DEPENDENCIES.md`/`CLAUDE.md`. Origin:
design discussion in a separate Claude session (transcript
`cse_01W2ZJL5goHca9qxnvY6sjB4`), continued here once real assets existed.

## What it is

Six PNGs from mapchart.net — full world-map copies, each with one region
recolored navy against a neutral-gray base, all identical canvas size
(6460×3403) — used as **hover-swap frames**: one image sits visible as the
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
| `web/public/images/map/{slug}.png` | Web-optimized per-region highlight frames (1600px wide, palette PNG, ~165KB each) |
| `web/public/images/map/default.png` | Synthesized unhighlighted composite — the resting/default view |
| `web/src/lib/mapShapes.ts` | Traced hit-area polygons per region, `[x%, y%][]` per landmass/island |
| `web/src/components/RegionalMap.astro` | The component — stacks the images, builds the SVG `clipPath`s, wires hover/focus, shows a region-name tag on hover/focus |
| `scripts/build-map-assets.mjs` | Regenerates the `public/images/map/` PNGs + default composite from the source files |
| `scripts/trace-map-regions.mjs` | Regenerates `mapShapes.ts` by auto-detecting the highlight color and tracing hit-area polygons from pixels |

## Regenerating after a source image changes

```bash
cd web
node ../scripts/build-map-assets.mjs     # rebuilds public/images/map/*.png + default.png
node ../scripts/trace-map-regions.mjs    # re-traces web/src/lib/mapShapes.ts
```
Both scripts auto-detect the highlight color and re-derive everything from
pixels — no manual coordinate editing needed even after a source PNG changes.
They also read the source dimensions at runtime (not hardcoded), but if a new
export batch changes the canvas aspect ratio, update the `width`/`height`
attributes and `aspect-ratio` in `RegionalMap.astro` to match (currently
1600×843, i.e. the 6460×3403 sources scaled down).

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
Regions light up only on hover/focus, and a small dark tag in the corner of
the map names the region you're on.

## The Pacific-square artifact

All six mapchart.net exports (both the original and the corrected re-export)
carry a stray ~74×74px navy square in open Pacific ocean at the same spot in
every file — a perfect square, so almost certainly a leftover legend/UI swatch
baked into the export rather than a real territory. It's navy in *every*
source, so it survives both the darken- and lighten-blend tricks and would
otherwise show up as a permanently "selected" dot on every region's frame and
the default view. Both build scripts patch it to white (via `ARTIFACT_RECT_PCT`,
a percentage rect so it still lines up if a future export's resolution
changes) before doing anything else with the source images. If a future
mapchart.net batch doesn't have this artifact, the patch is harmless — it just
paints over open ocean that was already white.

## `USA.png`

No longer part of the source set (removed). Was a different export resolution
than the other six (1024×552) and never used in any output — the paper doesn't
cover domestic US news, and there's no corresponding region in the site's
taxonomy.

## Still open

- Touch-device behavior: currently a tap on a region navigates immediately
  (hover/focus styles are irrelevant on touch — there's no highlight step).
  Revisit if you'd rather have a highlight-then-navigate two-tap pattern.
- The traced polygons are a close approximation (silhouette tracing), not
  pixel-perfect at every coastline detail — fine for click-target purposes:
  reasonably-generous is preferable to too-tight here.
