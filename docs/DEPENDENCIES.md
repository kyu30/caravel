# Dependency decisions — needs your sign-off

Nothing here is installed yet. Current `package.json` deps are only the essentials
(Astro, Sanity client, image-url, sitemap, RSS).

## Interactive regional map

**Where:** `web/src/components/RegionalMap.astro` — currently a dependency-free
placeholder (six clickable schematic zones → region pages). Works now; it just
isn't a real world map.

### Option A — `react-simple-maps` *(recommended)*

- Adds: `react-simple-maps`, `d3-geo`, `topojson-client`, `@astrojs/react`,
  `react`, `react-dom`
- ~150 KB JS on pages that use it (loaded as an island, `client:visible`)
- Mature, declarative, easy to color/label regions and attach click handlers
- Needs a world TopoJSON in `public/` and a mapping from geography → region `mapId`

### Option B — `svg-world-map`

- Adds: one small library, no React
- ~40 KB, lighter, but less flexible styling and a more manual API

### Option C — keep the schematic

- Zero deps. A stylized "pick your region" grid, not a geographic map.
- Fine for launch; revisit later.

**Recommendation:** ship Option C for v1, move to **Option A** in a follow-up —
it's the most maintainable and the React island stays isolated to the map.

## Portable Text rendering

Currently hand-rolled (`web/src/components/portable/`). If editors start needing
footnotes, tables, embeds, or custom blocks, swap in **`astro-portabletext`**
(adds one dep). Not needed yet.

## Sanity typegen (optional, recommended soon)

`studio` has a `typegen` script. Running `npx sanity schema extract` +
`npx sanity typegen generate` produces real types to replace the hand-written
ones in `web/src/lib/types.ts`. Do this once the schema stops changing.
