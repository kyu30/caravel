# The Caravel

Georgetown University's student-run international affairs newspaper — self-hosted, student-owned stack.

- **`web/`** — the public site. Astro (static), deployed to Vercel.
- **`studio/`** — Sanity Studio. The headless CMS editors log into.

Writers do **not** get Sanity accounts. They pitch via a Google Form; an editor
formats the piece into an `article` in the Studio. See
[`docs/GOOGLE_FORM.md`](docs/GOOGLE_FORM.md).

## Quick start

```bash
npm install          # installs both workspaces

npm run dev          # web at http://localhost:4321  (sample content until Sanity is wired)
npm run studio       # Studio at http://localhost:3333 (after SETUP.md)
```

Until `web/.env` has `PUBLIC_SANITY_PROJECT_ID`, the site renders from bundled
sample content in `web/src/lib/sampleData.ts`, so you can work on the front end
before the CMS exists.

## Next steps, in order

1. **Create the Sanity project** — [`SETUP.md`](SETUP.md).
2. **Seed taxonomy** — `cd studio && npx sanity dataset import seed/taxonomy.ndjson production`.
3. **Deploy** — [`DEPLOY.md`](DEPLOY.md) (GitHub repo + Vercel + Studio).
4. **Review the open design decisions** — [`docs/NAV_OPTIONS.md`](docs/NAV_OPTIONS.md),
   [`docs/DESIGN.md`](docs/DESIGN.md), [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md).

## Architecture decisions (locked)

| Decision | Choice |
|---|---|
| Repo layout | Monorepo, npm workspaces (`web`, `studio`) |
| Article URL | `/<primary-section-slug>/<article-slug>` |
| Package manager | npm |
| Hosting | Vercel (site), sanity.studio (Studio) |
| Images | Sanity asset pipeline; Cloudinary only if limits hit |
| Newsletter | Buttondown, link/embed only |

### The `primarySection` model

`/<section>/<slug>` needs one path segment, but articles cross regions and
Compass verticals. So every `article` has a **required `primarySection`
reference** that points to *either* a `region` **or** a `section` document — that
resolved slug is the canonical URL segment. `regions[]` and `compassTopics[]` are
additional multi-tag fields used for cross-listing on other section pages, the
homepage rows, and related-article matching.

- `/africa/kenya-election-2026` — primarySection is the Africa region
- `/opinion-satire/teach-the-sahel` — primarySection is an editorial section
- `/elections/swana-women-candidates` — primarySection is a Compass vertical

`/latest` is a hard-coded route (the all-articles feed), not a section document.

## Content model (Sanity)

`article` · `author` · `region` · `section` (`kind: editorial | compass`) ·
`submission` (editorial queue, not public). Full field lists in
`studio/schemaTypes/`.

## Data flow

`web/src/lib/queries.ts` is the only data-access layer. Every function either
returns sample data (`USE_SAMPLE_DATA`) or runs GROQ — pages never call the
Sanity client directly.
