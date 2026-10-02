#!/usr/bin/env node
/**
 * Flushes .out/articles.ndjson (from 02-build-migration-plan.mjs) to Sanity
 * via createIfNotExists, batched into transactions. See
 * docs/ARCHIVE_MIGRATION.md.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/04-write-articles.mjs --with-user-token -- [flags]
 *
 * Flags:
 *   --dry-run           Check what would happen (existence check only), write nothing.
 *   --sample=id1,id2,…  Only process these article _ids (e.g. article.wp-41).
 *   --overwrite         Use createOrReplace instead of createIfNotExists
 *                        (only for iterating on an already-written test batch).
 */
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {makeClient} from './lib/sanity-context.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '.out')
const BATCH_SIZE = 50

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const OVERWRITE = args.includes('--overwrite')
const sampleArg = args.find((a) => a.startsWith('--sample='))
const SAMPLE_IDS = sampleArg ? new Set(sampleArg.slice('--sample='.length).split(',')) : null

function chunks(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  const lines = readFileSync(path.join(OUT_DIR, 'articles.ndjson'), 'utf-8')
    .split('\n')
    .filter((l) => l.trim())
  let docs = lines.map((l) => JSON.parse(l))
  if (SAMPLE_IDS) docs = docs.filter((d) => SAMPLE_IDS.has(d._id))

  console.log(`${docs.length} article(s) selected${SAMPLE_IDS ? ` (--sample, ${SAMPLE_IDS.size} requested)` : ''}.`)
  if (SAMPLE_IDS && docs.length !== SAMPLE_IDS.size) {
    const found = new Set(docs.map((d) => d._id))
    const missing = [...SAMPLE_IDS].filter((id) => !found.has(id))
    console.warn(`  WARNING: ${missing.length} requested id(s) not found in articles.ndjson: ${missing.join(', ')}`)
  }

  const client = makeClient()
  const existing = await client.fetch('*[_type=="article" && _id in $ids]._id', {
    ids: docs.map((d) => d._id),
  })
  const existingSet = new Set(existing)

  console.log(`  already live: ${existingSet.size}`)
  console.log(`  will ${OVERWRITE ? 'overwrite' : 'create'}: ${docs.length - (OVERWRITE ? 0 : existingSet.size)}`)

  if (DRY_RUN) {
    for (const d of docs) {
      const status = existingSet.has(d._id) ? (OVERWRITE ? 'WILL OVERWRITE' : 'SKIP (exists)') : 'WILL CREATE'
      console.log(
        `  [${status}] ${d._id} -- "${d.title}" -- authors:${d.authors.length} regions:${d.regions.length} compass:${d.compassTopics.length} tags:${d.tags.length} blocks:${d.body.length}`,
      )
    }
    console.log('\nDry run -- no Sanity writes made.')
    return
  }

  let written = 0
  for (const batch of chunks(docs, BATCH_SIZE)) {
    let tx = client.transaction()
    for (const doc of batch) {
      // strip our own bookkeeping field before writing
      const {_meta, ...clean} = doc
      tx = OVERWRITE ? tx.createOrReplace(clean) : tx.createIfNotExists(clean)
    }
    await tx.commit()
    written += batch.length
    console.log(`  ${written}/${docs.length}`)
  }
  console.log(`\nDone. ${written} article(s) processed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
