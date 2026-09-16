// Regenerates web/src/lib/mapShapes.ts from the source PNGs in web/src/maps/.
// Run this after replacing any of those source images (e.g. once the
// corrected swana/eeca exports come back from mapchart.net).
//
// Usage (from repo root):
//   cd web && node ../scripts/trace-map-regions.mjs
//
// What it does: for each region PNG, auto-detects the "highlighted" navy
// color, builds a pixel mask, splits it into connected components (so
// disconnected islands/landmasses become separate polygons), traces a
// silhouette per component (row-band min/max x), and writes the result as
// percentage-coordinate polygons to web/src/lib/mapShapes.ts.
import sharp from 'sharp'
import {writeFileSync} from 'fs'

const SRC_DIR = new URL('../web/src/maps', import.meta.url).pathname
const OUT_FILE = new URL('../web/src/lib/mapShapes.ts', import.meta.url).pathname

// Update filenames here if you rename the source exports.
const REGIONS = [
  {slug: 'africa', file: 'Africa.png'},
  {slug: 'eeca', file: 'EER.png'},
  {slug: 'iap', file: 'IAP.png'},
  {slug: 'lac', file: 'LAC.png'},
  {slug: 'swana', file: 'MECA.png'},
  {slug: 'wec', file: 'WEUC.png'},
]

const SAMPLE_W = 400 // downscaled analysis width — polygons are % based, so this only affects trace fidelity

// All six mapchart.net exports carry a stray ~74x74px navy square in open
// Pacific ocean at the same spot — a perfect square, so almost certainly a
// leftover legend/UI swatch baked into the export rather than a real
// territory. Patch it to white before tracing so it never becomes a spurious
// tiny polygon. Kept in sync with the same constant in build-map-assets.mjs.
const ARTIFACT_RECT_PCT = {left: 8.0, top: 60.9, width: 1.9, height: 3.1}

async function loadPatchedSource(file) {
  const path = `${SRC_DIR}/${file}`
  const {width, height} = await sharp(path).metadata()
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
  return sharp(path).composite([{input: patch, left: rect.left, top: rect.top}]).png().toBuffer()
}

function quantize(r, g, b) {
  return `${Math.round(r / 12) * 12},${Math.round(g / 12) * 12},${Math.round(b / 12) * 12}`
}

async function detectNavy(input) {
  const {data, info} = await sharp(input).resize({width: 200}).raw().ensureAlpha().toBuffer({resolveWithObject: true})
  const {width, height, channels} = info
  const counts = new Map()
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels],
      g = data[i * channels + 1],
      b = data[i * channels + 2]
    const key = quantize(r, g, b)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const candidate = sorted.find(([key]) => {
    const [r, g, b] = key.split(',').map(Number)
    const lightness = (r + g + b) / 3
    return lightness < 100 && b >= r && b >= g
  })
  const [r, g, b] = candidate[0].split(',').map(Number)
  return {r, g, b}
}

function floodFillComponents(mask, width, height) {
  const visited = new Uint8Array(width * height)
  const components = []
  const stack = new Int32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x
      if (!mask[start] || visited[start]) continue
      let sp = 0
      stack[sp++] = start
      visited[start] = 1
      const pixels = []
      while (sp > 0) {
        const p = stack[--sp]
        pixels.push(p)
        const px = p % width,
          py = (p / width) | 0
        if (px > 0) {
          const n = p - 1
          if (mask[n] && !visited[n]) {
            visited[n] = 1
            stack[sp++] = n
          }
        }
        if (px < width - 1) {
          const n = p + 1
          if (mask[n] && !visited[n]) {
            visited[n] = 1
            stack[sp++] = n
          }
        }
        if (py > 0) {
          const n = p - width
          if (mask[n] && !visited[n]) {
            visited[n] = 1
            stack[sp++] = n
          }
        }
        if (py < height - 1) {
          const n = p + width
          if (mask[n] && !visited[n]) {
            visited[n] = 1
            stack[sp++] = n
          }
        }
      }
      components.push(pixels)
    }
  }
  return components
}

function silhouette(pixels, width, height) {
  const rows = new Map()
  for (const p of pixels) {
    const x = p % width,
      y = (p / width) | 0
    const r = rows.get(y)
    if (!r) rows.set(y, [x, x])
    else {
      if (x < r[0]) r[0] = x
      if (x > r[1]) r[1] = x
    }
  }
  const ys = [...rows.keys()].sort((a, b) => a - b)
  const left = ys.map((y) => [rows.get(y)[0], y])
  const right = ys.map((y) => [rows.get(y)[1], y]).reverse()
  return [...left, ...right]
}

function decimate(poly, target = 45) {
  if (poly.length <= target) return poly
  const step = poly.length / target
  const out = []
  for (let i = 0; i < target; i++) out.push(poly[Math.floor(i * step)])
  return out
}

function toPercent(poly, width, height) {
  return poly.map(([x, y]) => [+((x / width) * 100).toFixed(2), +((y / height) * 100).toFixed(2)])
}

const result = {}
for (const {slug, file} of REGIONS) {
  const patched = await loadPatchedSource(file)
  const navy = await detectNavy(patched)

  const {data, info} = await sharp(patched).resize({width: SAMPLE_W}).raw().ensureAlpha().toBuffer({resolveWithObject: true})
  const {width, height, channels} = info
  const mask = new Uint8Array(width * height)
  const TOL = 30
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels],
      g = data[i * channels + 1],
      b = data[i * channels + 2]
    if (Math.abs(r - navy.r) < TOL && Math.abs(g - navy.g) < TOL && Math.abs(b - navy.b) < TOL) mask[i] = 1
  }

  const components = floodFillComponents(mask, width, height)
    .filter((c) => c.length > (width * height) / 4000) // drop noise/tiny islands under ~0.025% of canvas
    .sort((a, b) => b.length - a.length)

  console.log(slug, 'navy=', navy, 'components kept:', components.length)

  result[slug] = components.map((c) => toPercent(decimate(silhouette(c, width, height)), width, height))
}

const lines = []
lines.push('// Auto-generated by scripts/trace-map-regions.mjs from the mapchart.net PNGs in')
lines.push('// web/src/maps/. Each region maps to one or more polygons (islands / disconnected')
lines.push('// landmasses), as [x%, y%] coordinate pairs relative to the map image. Regenerate')
lines.push('// with: cd web && node ../scripts/trace-map-regions.mjs')
lines.push('export const MAP_SHAPES: Record<string, [number, number][][]> = {')
for (const [slug, polys] of Object.entries(result)) {
  lines.push(`  ${slug}: [`)
  for (const poly of polys) {
    lines.push(`    [${poly.map(([x, y]) => `[${x},${y}]`).join(', ')}],`)
  }
  lines.push('  ],')
}
lines.push('}')
writeFileSync(OUT_FILE, lines.join('\n') + '\n')
console.log('wrote', OUT_FILE)
