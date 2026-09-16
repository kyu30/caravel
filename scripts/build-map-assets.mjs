// Regenerates the web-optimized map PNGs in web/public/images/map/ from the
// source exports in web/src/maps/, plus a synthesized unhighlighted "default"
// view for the map's resting state.
//
// Run this after replacing any source image (e.g. corrected swana/eeca
// exports), then also run scripts/trace-map-regions.mjs to re-trace hit-areas.
//
// Usage (from repo root):
//   cd web && node ../scripts/build-map-assets.mjs
import sharp from 'sharp'
import {mkdirSync} from 'fs'

const SRC_DIR = new URL('../web/src/maps', import.meta.url).pathname
const OUT_DIR = new URL('../web/public/images/map', import.meta.url).pathname
const TARGET_W = 1600 // source is 6460px wide; plenty of headroom for 2x retina at typical display sizes

const REGIONS = [
  {slug: 'africa', file: 'Africa.png'},
  {slug: 'eeca', file: 'EER.png'},
  {slug: 'iap', file: 'IAP.png'},
  {slug: 'lac', file: 'LAC.png'},
  {slug: 'swana', file: 'MECA.png'},
  {slug: 'wec', file: 'WEUC.png'},
]

// All six mapchart.net exports carry a stray ~74x74px navy square in open
// Pacific ocean at the same spot — a perfect square, so almost certainly a
// leftover legend/UI swatch baked into the export rather than a real
// territory. It's navy in every source, so it survives both the darken and
// lighten composite tricks and would otherwise show up as a permanently
// "selected" dot on every region's frame. Expressed as a % rect (not fixed
// pixels) so it still lines up if a future export batch changes resolution.
const ARTIFACT_RECT_PCT = {left: 8.0, top: 60.9, width: 1.9, height: 3.1}

async function loadPatchedSource(file) {
  const img = sharp(`${SRC_DIR}/${file}`)
  const {width, height} = await img.metadata()
  const rect = {
    left: Math.round((ARTIFACT_RECT_PCT.left / 100) * width),
    top: Math.round((ARTIFACT_RECT_PCT.top / 100) * height),
    width: Math.round((ARTIFACT_RECT_PCT.width / 100) * width),
    height: Math.round((ARTIFACT_RECT_PCT.height / 100) * height),
  }
  const patch = await sharp({
    create: {width: rect.width, height: rect.height, channels: 4, background: '#ffffff'},
  })
    .png()
    .toBuffer()
  return sharp(`${SRC_DIR}/${file}`).composite([{input: patch, left: rect.left, top: rect.top}]).png().toBuffer()
}

mkdirSync(OUT_DIR, {recursive: true})

for (const {slug, file} of REGIONS) {
  const patched = await loadPatchedSource(file)
  const buf = await sharp(patched).resize({width: TARGET_W}).png({palette: true, effort: 10}).toBuffer()
  await sharp(buf).toFile(`${OUT_DIR}/${slug}.png`)
  console.log(slug, (buf.length / 1024).toFixed(0) + 'KB')
}

// Unhighlighted default/resting view: lighten-blend all 6 full-res sources
// together. Each source has exactly one region navy and everywhere else the
// same neutral gray/white. For any given pixel, at most one of the six layers
// is navy there — the other five are gray — and since gray has HIGHER channel
// values than navy, a per-pixel max/lighten blend picks gray every time,
// erasing every highlight and leaving the plain base map (pixel-accurate, no
// separate "blank" export needed from mapchart.net). Composite and resize must
// be two separate sharp pipelines — chaining them lets sharp hoist the resize
// before the composite, shrinking the base out from under the full-res overlay
// layers.
const [first, ...rest] = REGIONS
const base = await loadPatchedSource(first.file)
const layers = await Promise.all(rest.map((r) => loadPatchedSource(r.file)))
const fullComposite = await sharp(base)
  .composite(layers.map((input) => ({input, blend: 'lighten'})))
  .png()
  .toBuffer()
const out = await sharp(fullComposite).resize({width: TARGET_W}).png({palette: true, effort: 10}).toBuffer()
await sharp(out).toFile(`${OUT_DIR}/default.png`)
console.log('default', (out.length / 1024).toFixed(0) + 'KB')
