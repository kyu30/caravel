#!/usr/bin/env node
/**
 * Flushes .out/authors-to-create.ndjson (from 02-build-migration-plan.mjs)
 * to Sanity via createIfNotExists, batched into transactions -- idempotent,
 * safe to re-run. See docs/ARCHIVE_MIGRATION.md.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/03-write-authors.mjs --with-user-token
 */
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {makeClient} from './lib/sanity-context.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '.out')
const BATCH_SIZE = 50

function chunks(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function main() {
  const lines = readFileSync(path.join(OUT_DIR, 'authors-to-create.ndjson'), 'utf-8')
    .split('\n')
    .filter((l) => l.trim())
  const docs = lines.map((l) => JSON.parse(l))
  console.log(`${docs.length} authors to write, in batches of ${BATCH_SIZE}...`)

  const client = makeClient()
  let written = 0
  for (const batch of chunks(docs, BATCH_SIZE)) {
    let tx = client.transaction()
    for (const doc of batch) tx = tx.createIfNotExists(doc)
    await tx.commit()
    written += batch.length
    console.log(`  ${written}/${docs.length}`)
  }
  console.log(`\nDone. ${written} authors written (createIfNotExists -- already-existing ids were no-ops).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
