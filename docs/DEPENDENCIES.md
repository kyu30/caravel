# Dependency decisions — needs your sign-off

Nothing here is installed yet. Current `package.json` deps are only the essentials
(Astro, Sanity client, image-url, sitemap, RSS).

## Interactive regional map — resolved, no new dependency

**Where:** `web/src/components/RegionalMap.astro`. Built using hover-swap PNG
frames (mapchart.net exports) with hit-areas traced from the actual pixels —
zero new dependencies. Full writeup, source files, and the one remaining
follow-up (two source images need regenerating) in `docs/MAP_PLAN.md`.

`react-simple-maps` (the option below, previously recommended) turned out to
be unnecessary once real map assets existed — keeping the option documented in
case the PNG approach is ever outgrown (e.g. wanting zoom/pan or per-country
tooltips within a region).

<details>
<summary>Superseded: react-simple-maps / svg-world-map options</summary>

### Option A — `react-simple-maps`

- Adds: `react-simple-maps`, `d3-geo`, `topojson-client`, `@astrojs/react`,
  `react`, `react-dom`
- ~150 KB JS on pages that use it (loaded as an island, `client:visible`)
- Mature, declarative, easy to color/label regions and attach click handlers
- Needs a world TopoJSON in `public/` and a mapping from geography → region `mapId`

### Option B — `svg-world-map`

- Adds: one small library, no React
- ~40 KB, lighter, but less flexible styling and a more manual API

</details>

## Portable Text rendering

Currently hand-rolled (`web/src/components/portable/`). If editors start needing
footnotes, tables, embeds, or custom blocks, swap in **`astro-portabletext`**
(adds one dep). Not needed yet.

## Sanity typegen (optional, recommended soon)

`studio` has a `typegen` script. Running `npx sanity schema extract` +
`npx sanity typegen generate` produces real types to replace the hand-written
ones in `web/src/lib/types.ts`. Do this once the schema stops changing.
