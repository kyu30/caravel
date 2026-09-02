# Setup — Sanity project

Do this once. It creates the CMS project under **your** Sanity account and wires
both workspaces to it.

## 1. Create the project

```bash
cd studio
npx sanity login                 # opens browser; use the account that should OWN the project
npx sanity init --env
```

When prompted:

- **Create new project** → name it `The Caravel`
- **Use the default dataset configuration** → yes (`production`, public)
- **Output path** → current directory (`.`), do **not** let it overwrite `sanity.config.ts`
- It writes `studio/.env` with `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`

Copy the project ID it prints — you'll need it in step 3.

> If `init` tries to scaffold schema files, decline / delete them. The schema in
> `studio/schemaTypes/` is authoritative.

## 2. Seed the taxonomy

```bash
# still in studio/
npx sanity dataset import seed/taxonomy.ndjson production
```

Creates the 6 regions, 3 editorial sections, and 6 Compass verticals.

## 3. Point the web app at it

```bash
cd ../web
cp .env.example .env
```

Edit `web/.env`:

```
PUBLIC_SANITY_PROJECT_ID=<the project ID from step 1>
PUBLIC_SANITY_DATASET=production
```

Restart `npm run dev`. The warning about sample content should be gone; the
homepage now reads live data (it'll be sparse until you add articles).

## 4. CORS — let the site read the API

In <https://www.sanity.io/manage> → your project → **API** → **CORS origins**, add:

- `http://localhost:4321` (no credentials)
- your Vercel preview + production URLs (add after first deploy)

## 5. Optional: read token for drafts

Only needed if you want the site to preview unpublished drafts or you hit
anonymous rate limits. API → **Tokens** → add token, **Viewer** role → put it in
`web/.env` as `SANITY_API_READ_TOKEN`. Never commit it.

## 6. First content

In the Studio (`npm run studio`):

1. **Authors** — add yourself and any editors. Set *Staff group* for the Staff /
   Editorial Board pages.
2. **Articles** — New article → fill headline, body, pick a **Primary section**
   (a region, editorial section, or Compass vertical), add authors, set **Status
   = Published**, save.
3. The article appears at `/<primary-section-slug>/<article-slug>`.

## Where things live

| | |
|---|---|
| Schema | `studio/schemaTypes/` |
| Sidebar layout | `studio/deskStructure.ts` |
| Studio deploy target | set `studioHost` in `studio/sanity.cli.ts` |
| Site data layer | `web/src/lib/queries.ts` |
| Sample content | `web/src/lib/sampleData.ts` |
