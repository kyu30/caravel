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

mkdirSync(OUT_DIR, {recursive: true})

for (const {slug, file} of REGIONS) {
  const buf = await sharp(`${SRC_DIR}/${file}`).resize({width: TARGET_W}).png({palette: true, effort: 10}).toBuffer()
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
const base = await sharp(`${SRC_DIR}/${first.file}`).toBuffer()
const layers = await Promise.all(rest.map((r) => sharp(`${SRC_DIR}/${r.file}`).toBuffer()))
const fullComposite = await sharp(base)
  .composite(layers.map((input) => ({input, blend: 'lighten'})))
  .png()
  .toBuffer()
const out = await sharp(fullComposite).resize({width: TARGET_W}).png({palette: true, effort: 10}).toBuffer()
await sharp(out).toFile(`${OUT_DIR}/default.png`)
console.log('default', (out.length / 1024).toFixed(0) + 'KB')
