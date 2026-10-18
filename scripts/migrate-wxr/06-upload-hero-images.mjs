#!/usr/bin/env node
/**
 * Downloads each migrated article's original hero image from the old
 * Squarespace CDN (captured earlier to .out/hero-image-urls.csv) and
 * uploads it as a real Sanity image asset, skipping any article that
 * already has a hero image set. See docs/ARCHIVE_MIGRATION.md.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/06-upload-hero-images.mjs --with-user-token -- [flags]
 *
 * Flags:
 *   --dry-run           Report what would happen, download/upload nothing.
 *   --sample=id1,id2,…  Only process these wp:post_ids (e.g. 27,5801).
 *   --concurrency=N     Parallel downloads (default 5).
 */
import {readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {makeClient} from './lib/sanity-context.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '.out')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const sampleArg = args.find((a) => a.startsWith('--sample='))
const SAMPLE_IDS = sampleArg ? new Set(sampleArg.slice('--sample='.length).split(',')) : null
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))
const CONCURRENCY = concurrencyArg ? Number(concurrencyArg.slice('--concurrency='.length)) : 5

function parseCsv(text) {
  const [header, ...lines] = text.trim().split('\n')
  const cols = header.split(',')
  return lines.map((line) => {
    // url is the last field and may itself contain no commas (Squarespace
    // URLs don't), so a plain split is safe here.
    const parts = line.split(',')
    const row = {}
    cols.forEach((c, i) => (row[c] = i === cols.length - 1 ? parts.slice(i).join(',') : parts[i]))
    return row
  })
}

async function chunked(items, size, fn) {
  const results = []
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
    console.log(`  ${Math.min(i + size, items.length)}/${items.length}`)
  }
  return results
}

async function main() {
  const rows = parseCsv(readFileSync(path.join(OUT_DIR, 'hero-image-urls.csv'), 'utf-8'))
  let candidates = SAMPLE_IDS ? rows.filter((r) => SAMPLE_IDS.has(r.postId)) : rows
  console.log(`${candidates.length} row(s) from hero-image-urls.csv${SAMPLE_IDS ? ' (--sample)' : ''}`)

  const client = makeClient()

  // Only articles that still exist (some were deleted as duplicates) and
  // don't already have a hero image (set by an editor, or a prior run).
  const articleIds = candidates.map((r) => `article.wp-${r.postId}`)
  const existing = await client.fetch(
    `*[_id in $ids]{_id, title, "hasHero": defined(heroImage.asset)}`,
    {ids: articleIds},
  )
  const byId = new Map(existing.map((a) => [a._id, a]))

  const toProcess = candidates
    .map((r) => ({...r, articleId: `article.wp-${r.postId}`}))
    .filter((r) => {
      const a = byId.get(r.articleId)
      return a && !a.hasHero
    })

  const skippedMissing = candidates.length - existing.length
  const skippedHasHero = existing.filter((a) => a.hasHero).length
  console.log(
    `${toProcess.length} need a hero image (skipping ${skippedMissing} deleted/missing, ${skippedHasHero} already have one)`,
  )

  if (DRY_RUN) {
    console.log('\nDry run -- no downloads or writes. First 20:')
    toProcess.slice(0, 20).forEach((r) => console.log(`  ${r.articleId} <- ${r.url}`))
    return
  }

  const failures = []
  let uploaded = 0

  await chunked(toProcess, CONCURRENCY, async (r) => {
    try {
      const res = await fetch(r.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const filename = decodeURIComponent(r.url.split('/').pop().split('?')[0]) || `${r.postId}.jpg`
      const asset = await client.assets.upload('image', buf, {filename})
      const title = byId.get(r.articleId)?.title ?? r.slug
      await client.patch(r.articleId).set({
        heroImage: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: title},
      }).commit()
      uploaded++
    } catch (err) {
      failures.push({articleId: r.articleId, url: r.url, error: err.message})
    }
  })

  writeFileSync(
    path.join(OUT_DIR, 'hero-image-failures.csv'),
    ['articleId,url,error']
      .concat(failures.map((f) => [f.articleId, f.url, JSON.stringify(f.error)].join(',')))
      .join('\n') + '\n',
  )

  console.log(`\nUploaded ${uploaded}, failed ${failures.length}.`)
  if (failures.length) console.log(`Failures written to ${path.relative(process.cwd(), OUT_DIR)}/hero-image-failures.csv`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
