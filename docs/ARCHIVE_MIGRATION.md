# Squarespace archive migration

Status: **planned, not yet run**. See also `docs/ARCHIVE_MIGRATION_FOR_STAFF.md`
for a plain-language version of this plan to circulate for staff sign-off
before anything executes. This is the "archive content migration" item that's
been on `CLAUDE.md`'s deferred list since the project was scaffolded.

## What it is

The old Squarespace site exports as a 40MB WordPress-format WXR file,
`Squarespace-Wordpress-Export-09-23-2026.xml` (repo root — untracked; see
`.gitignore` note below). It contains 10,467 `<item>`s: 5,632 `post`s, 4,803
`attachment`s (Squarespace-CDN image records, unused by this migration), 32
legacy `page`s (also unused — those are raw Squarespace page-builder markup,
not blog content).

Two ordered steps:
1. **Authors** — every legacy byline not already matched to a current Sanity
   `author` becomes a new inactive/alumni author record.
2. **Articles** — the legacy posts land as **draft** `article` documents (an
   editor reviews and publishes each one by hand — nothing goes live
   automatically), correctly attributed, categorized, and tagged.

## Scope, precisely

Derived by parsing the file directly, not estimated:

- 5,574 `post`-type items have `wp:status == publish`.
- Of those, **2,930** have an individually-identifiable byline. The other
  **2,644** are bylined to bucket/pseudo accounts — `TheCaravelArchives`
  (4,533 across all statuses), `TheEditorialBoard` (66), a shared
  `thecaravel@georgetown.edu` login (61) — and are **excluded from this
  migration entirely**: real authorship can't be recovered for these, so
  they're left for a future pass rather than mis-attributed or dumped under a
  fake collective byline.
- Those 2,930 posts carry **464 distinct individual bylines**, resolved
  against 491 `<wp:author>` records in the file.
- **72 `author` docs and 90 `article` docs (6 already `draft`) already exist**
  live in `otbaazov`/`production` — the migration must see and not collide
  with any of this.
- 45 of the 2,930 posts have **zero** category, and a handful have only the
  unmappable legacy `science-technology` category — these are routed to a
  manual-review file rather than guessed at or silently dropped.
- **Images are skipped entirely this pass** — no hero, no inline. `heroImage`
  is a real Sanity asset type with no URL-string fallback, and downloading/
  uploading ~2,900+ images is a separate, heavier effort better done once the
  text migration is trusted. A plain hero-image URL is still captured to a
  CSV as a breadcrumb for that later pass.

## Confirmed decisions

1. **Import status: `draft`**, always — safety rail, no exceptions. Nothing
   from this pipeline is ever live without a human hitting Publish.
2. **Generic/bucket bylines excluded** — only individually-bylined posts are
   imported this pass.
3. **Revive 3 Compass sections** — `World` (`world`), `Gender` (`gender`),
   `Coin` (`coin`, canonical name for the legacy "Money" vertical) — trimmed
   earlier this project, needed to correctly house ~380 legacy posts instead
   of forcing them into an unrelated region/section.
4. **Images skipped**, URLs only logged to a CSV for a later pass.

## Legacy category → taxonomy mapping

Every `<category domain="category">` on a post is its old site-section tag;
`domain="post_tag"` entries are freeform and map straight onto the existing
`tags[]` field (the feature at `web/src/pages/tag/[tag].astro`). All 21
distinct legacy values found in the file:

**Direct, high-confidence:**

| Legacy category | → |
|---|---|
| `western-europe-canada` | region `western-europe-canada` |
| `latin-america-caribbean` | region `latin-america-caribbean` |
| `indo-asia-pacific` | region `indo-asia-pacific` |
| `africa` | region `africa` |
| `united-states-of-america` | region `usa` |
| `opinion`, `satire` | section `opinion-satire` |
| `compass-elections` | section `elections` |
| `compass-planet` | section `planet` |
| `travel` | section `travel` |
| `crows-nest` (both CDATA casing variants) | section `crows-nest` |
| `compass-world` | section `world` (new) |
| `compass-money` | section `coin` (new) |
| `bunn-award-winner` | **not** a primarySection candidate — becomes the freeform tag `Bunn Award Winner` instead |

**Lossy/approximate** — mapped to the closest real target, plus an audit tag
like `Legacy: Middle East & Cent. Asia` so an editor can find and re-bucket
these later via `/tag/[tag]`:

| Legacy category | → | Audit tag |
|---|---|---|
| `middle-east-cent-asia` (881, no reliable region/EECA-vs-SWANA signal in the data) | region `southwest-asia-north-africa` | `Legacy: Middle East & Cent. Asia` |
| `eastern-europe-russia` | region `eastern-europe-central-asia` | `Legacy: Eastern Europe & Russia` |
| `gender` | section `gender` (new) | `Legacy: Gender` |
| `business-economics` + encoding variant `business-amp-economics` | section `coin` (new) | `Legacy: Business & Economics` |

**Unmapped by design:** `science-technology` (47) has no confident target —
never guessed. A post whose *only* category is this (or which has none at
all) is routed to manual review and **not** turned into an article this pass;
a post where it appears *alongside* a resolvable category still gets created
normally, with a non-blocking note logged.

**Multi-category posts:** all resolvable categories are kept, not just the
primary — first resolved `region` wins as `primarySection`, else first
`editorial` section, else first `compass` section (source-XML order as
tiebreak); every resolved region/compass hit (including the primary) also
populates `regions[]`/`compassTopics[]` so cross-listing isn't lost.

*Note: 10 ad hoc country-level `region` docs and 4 duplicate-named `section`
docs (Russia/BRICS/Kazakhstan/Uzbekistan existing as both types) already sit
in production from earlier work — a pre-existing data-quality wrinkle,
unrelated to this migration. None of the legacy categories map to them, so
the resolver never has to disambiguate between a same-named region vs.
section; out of scope to fix here.*

## Author resolution

For each of the 464 distinct bylines: look up its `wp:author_display_name`,
case-insensitively match against the 72 existing authors by name. Match →
reuse that author's real `_id`. No match → create `name` = display name,
`staffGroup: 'alumni'`, `active: false`, no bio/headshot (an editor fills
those in later, same as any other alum record).

**Slug convention: `[first initial][lastname]`**, matching the existing 72
authors exactly (`emoscovitch`, `kshepelev`, `bfijol`, …) — this is a manual
house style, not Sanity's own auto-slugify (which would produce
`eitan-moscovitch`), so the script replicates it explicitly. Collision (two
different legacy authors reducing to the same initial+lastname) falls back to
`[first two letters of first name][lastname]`, then a numeric suffix if that
still collides — logged to `manual-review.csv` either way so a human can
confirm it's genuinely two different people. New authors get a deterministic
`_id` (`author.wp-<slug>`) so the whole pipeline is safely re-runnable.

## Script architecture

```
scripts/migrate-wxr/
  lib/
    wxr-parse.mjs              # fast-xml-parser: XML -> {authors[], items[]}
    category-map.mjs           # the lookup table above + resolveTaxonomy()
    author-resolve.mjs         # login -> existing-or-new author id+slug
    html-to-portable-text.mjs  # cheerio: content:encoded -> Portable Text blocks
    sanity-context.mjs         # getCliClient() + loads existing authors/regions/sections/articles
  01-seed-compass-sections.mjs # creates World/Gender/Coin section docs
  02-build-migration-plan.mjs  # dry run: XML + live context -> .out/* files, zero writes
  03-write-authors.mjs         # flushes new authors to Sanity (createIfNotExists)
  04-write-articles.mjs        # flushes articles; --dry-run and --sample=<ids> flags
  .out/                        # generated, gitignored: articles.ndjson, authors-to-create.ndjson,
                                # manual-review.csv, hero-image-urls.csv, conversion-log.txt, summary.json
```

**New dependencies** (flagged per `docs/DEPENDENCIES.md`, added to
`studio/package.json` devDependencies since these only run via `sanity exec`
from `studio/`): **`fast-xml-parser`** (parses the WXR; present transitively
today but not declared — declare it explicitly) and **`cheerio`** (walks each
post's HTML). No `xml2js`, no `turndown`, no `jsdom`.

**XML parsing:** one full in-memory `fast-xml-parser` pass — 40MB/10K items
is comfortably within range, streaming buys nothing here. Critical config:
`ignoreAttributes:false` (need `category`'s `domain`/`nicename`), CDATA
passthrough, and `isArray` forced on for `item`/`category`/`wp:postmeta`/
`wp:comment`/`wp:author` (fast-xml-parser collapses single-occurrence
children to bare objects otherwise — the single most important gotcha, since
most posts have 1–2 categories).

**HTML → Portable Text (`cheerio`):** direct DOM walk emitting the site's
exact restricted shape (`normal`/`h2`/`h3`/`h4`/`blockquote` styles,
`bullet`/`number` lists, `strong`/`em`/`underline` marks, `link` annotation —
matching `studio/schemaTypes/objects/blockContent.ts`). `<h1>`/`<h2>`→`h2`,
`<h3>`→`h3`, `<h4>`–`<h6>`→`h4`; `<div>`/`<span>`/`<figure>` are transparent
(recurse, emit nothing); `<img>`, `<iframe>`, `<table>`, `<script>`, embeds,
etc. are dropped and logged (never crash the run over one bad element); a
broken/unsafe `href` drops the link annotation but keeps the text. `node:
crypto`'s `randomUUID()` supplies every `_key` — no new dependency needed for
that.

**Sanity write access — `sanity exec --with-user-token`, not a new API
token.** Every write script does
`import {getCliClient} from 'sanity/cli'; const client = getCliClient({apiVersion:'2024-10-01'})`
— `sanity` is already a `studio/` dependency, so this needs no new secret, no
`.env` change, no `SETUP.md` update. Must always be invoked from `studio/`:

```bash
cd studio && npx sanity exec ../scripts/migrate-wxr/0X-script.mjs --with-user-token -- --flags
```

and must **not** copy `web/src/lib/sanity.ts`'s `perspective:'published'`
client config — the migration needs to see existing drafts too.

**Idempotency:** deterministic `_id`s everywhere (`article.wp-<wp:post_id>`,
`author.wp-<slug>`, `section.compass-world` etc., matching the `_id`
convention already used in `studio/seed/taxonomy.ndjson`) plus
`createIfNotExists` on every write. Re-running any script at any time is
always safe — that *is* the resume mechanism, no separate state file needed.
`04-write-articles.mjs` gets an `--overwrite` escape hatch
(`createOrReplace`) for iterating on the converter against an already-written
test batch.

## Sequencing

1. `01-seed-compass-sections.mjs` — creates World/Gender/Coin.
2. `02-build-migration-plan.mjs` — dry run, writes nothing, asserts it
   recomputes exactly 2,930 in-scope items as a self-check against drift.
3. Human review of `.out/summary.json` + `manual-review.csv`.
4. `03-write-authors.mjs` — writes only the genuinely-new authors.
5. `04-write-articles.mjs --dry-run --sample=<ids>` then
   `04-write-articles.mjs --sample=<ids>` — a hand-picked ~15–20 item test
   batch covering every risky path (lossy category, multi-category, new
   author, existing author, the award-badge tag, rich HTML, a zero-category
   post confirming correct exclusion).
6. Studio spot-check of the test batch.
7. `04-write-articles.mjs` (no `--sample`) — full run over everything else;
   already-written test-batch items are silently skipped via
   `createIfNotExists`.
8. A `sanity documents query` count check confirming the live article total
   grew by exactly (2,930 − blocking-manual-review count).

## Files to create/change

| File | Purpose |
|---|---|
| `scripts/migrate-wxr/lib/*.mjs`, `scripts/migrate-wxr/0{1..4}-*.mjs` | The pipeline |
| `studio/package.json` | add `fast-xml-parser`, `cheerio` as devDependencies |
| `docs/DEPENDENCIES.md` | note on why these two were added |
| `.gitignore` | add `scripts/migrate-wxr/.out/` and the XML export itself (40MB, contains real names — shouldn't sit in git history) |

No changes needed to `studio/schemaTypes/` — the 3 new Compass sections are
data, not schema; `region`/`section`/`author`/`article` schemas already
support everything this migration writes.

## Verification

- `02`'s self-check (recomputed in-scope count must equal 2,930) catches
  silent drift between this doc and the real file/rules before anything is
  written.
- Hand-picked test batch (not "first N") deliberately exercises: a lossy
  category + its audit tag, a multi-category post's `regions[]`/
  `compassTopics[]`, a brand-new author, an existing-author match, the
  `bunn-award-winner` → tag-only path, rich HTML (table/list/blockquote/
  links/bold/italic) to confirm clean drops and correct marks, and one
  zero-category post confirmed as excluded — all selected by filtering the
  real `.out/articles.ndjson`/`summary.json`, not guessed.
- `--dry-run` on the article writer does a real batched existence check
  against live Sanity, so its "N will be created / M already exist" output is
  a true preview, not a static list.
- After the test batch writes, open the drafts in Studio and confirm:
  `status: 'draft'` on all of them, correct primarySection/regions/
  compassTopics/tags, correct author(s), body formatting (headings/bold/
  links/lists) survived.
- After the full run, a `sanity documents query` count check confirms the
  live `article` total grew by exactly the expected amount, and that
  `USE_SAMPLE_DATA`/live site queries (which filter `status == "published"`)
  show nothing new until an editor publishes something — the live site is
  unaffected throughout.
