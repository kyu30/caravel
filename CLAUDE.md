# CLAUDE.md

Working guide for this repo. Read `README.md` for the human overview; this file is
the fast path for making changes.

## What this is

The Caravel — Georgetown's student-run international affairs newspaper. Self-hosted
replacement for a Squarespace site. Monorepo, npm workspaces:

- `web/` — Astro static site → Vercel (Root Directory = `web`)
- `studio/` — Sanity Studio (CMS) → deployed separately to `*.sanity.studio`

## Commands

```bash
npm run dev            # web dev server :4321 (from repo root)
npm run build          # build web → web/dist
npm run check          # astro check (type-check) — keep this at 0 errors
npm run studio         # Studio dev :3333
npm run studio:build   # build Studio
npm run studio:deploy  # deploy Studio to sanity.studio
```

CI (`.github/workflows/ci.yml`) runs `npm run build` + `npm run studio:build` on push/PR.

## Architecture rules

- **`web/src/lib/queries.ts` is the only data-access layer.** Pages/components
  never import `@sanity/client` directly. Every function there branches on
  `USE_SAMPLE_DATA` (true when `PUBLIC_SANITY_PROJECT_ID` is unset) and returns
  either bundled fixtures from `sampleData.ts` or a GROQ result **in the same
  shape**. If you add a query, add both paths.
- **Projected types, not raw documents.** `web/src/lib/types.ts` describes what
  the GROQ projections return (slugs are strings, articles carry a resolved
  `url`). Sample data must match these, not the Sanity schema. Replace with
  `sanity typegen` output once the schema settles.
- **Schema lives in `studio/schemaTypes/`** and is authoritative. `index.ts`
  registers types; `deskStructure.ts` controls the Studio sidebar.

## The `primarySection` / URL model

Article URLs are `/<primary-section-slug>/<article-slug>`. Every `article` has a
required **`primarySection`** reference to *either* a `region` **or** a `section`
document — that resolved slug is the path segment. `regions[]` and
`compassTopics[]` are extra multi-tags for cross-listing (homepage rows, section
pages, related articles), not part of the URL.

- `/[section]/index.astro` — landing page for ANY region, editorial section, or
  Compass vertical. `getStaticPaths` from `getAllTaxonomies()`.
- `/[section]/[slug].astro` — the article. `getStaticPaths` from
  `getAllArticleRoutes()`.
- `/latest`, `/regions`, `/compass`, `/authors`, `/search`, and the static pages
  are real routes and win over `[section]` in Astro's priority. `section.ts` has a
  `RESERVED_SLUGS` guard so a section can't shadow them.

## Content types

`article` · `author` · `region` · `section` (`kind: 'editorial' | 'compass'`) ·
`submission` (editorial queue — NOT public, nothing on the site reads it).

Taxonomy is seeded, not authored: `studio/seed/taxonomy.ndjson` (6 regions, 3
editorial sections, 6 Compass verticals) → `npx sanity dataset import`.

## Writer workflow (context for `submission`)

Writers get NO Sanity account. They pitch via Google Form → an editor reads the
Google Doc → editor hand-builds an `article` in the Studio. `submission` tracks
the queue. Form→Sanity sync is NOT built — see `docs/GOOGLE_FORM.md`. Don't
build the automation without being asked.

## Conventions

- Astro components, scoped `<style>` blocks, no CSS framework. Design tokens in
  `web/src/styles/tokens.css` (palette + type scale — change here, not in
  components).
- Portable Text is hand-rendered in `web/src/components/portable/`. Keep it
  minimal; swap for `astro-portabletext` only if editors need
  footnotes/tables/embeds.
- Sample content must stay in sync when query shapes change, or `dev`/CI breaks.
- Sanity client uses `apiVersion: '2024-10-01'`, `perspective: 'published'`.

## Open decisions (confirmed so far)

- Nav: **Option 1** single dropdown bar (built).
- Type: **traditional broadsheet**, Spectral (current baseline).
- Map: **placeholder now**, `react-simple-maps` later — do NOT add the dep
  without a green light. `RegionalMap.astro` is a dependency-free schematic.

## Still open / not started

- Deep styling pass — blocked on `docs/DESIGN.md` questions (wordmark/logo,
  brand colors, homepage density, self-hosting fonts).
- GitHub repo creation + Vercel + Studio deploy — steps in `DEPLOY.md`, user does
  this (their choice of repo name/org).
- Sanity project — user creates it (`SETUP.md`); until then everything runs on
  sample data.
- `react-simple-maps` map, Google Form sync, archive content migration,
  Buttondown embed beyond the link.

## Gotchas

- No `.env` yet → the build prints a sample-content warning. That's expected, not
  an error.
- `web/src/lib/site.js` is `.js` on purpose (imported by `astro.config.mjs`).
  `SITE.url` must match the production host before launch.
- Studio is pinned to Sanity v4; `sanity.cli.ts` uses `deployment.autoUpdates`.
