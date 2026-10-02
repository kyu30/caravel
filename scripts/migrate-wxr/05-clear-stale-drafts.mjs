#!/usr/bin/env node
/**
 * Opening an already-written migration article in the Studio (in "Drafts"
 * perspective) can auto-fork a Sanity-native `drafts.<id>` overlay that then
 * shadows any later `--overwrite` fix to the real document in the editor UI
 * -- the site itself is unaffected (it always reads the published-id doc),
 * but the Studio view looks stale. This finds and deletes any such overlay
 * for a given set of article ids, so Studio falls back to showing the
 * correct published document.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/05-clear-stale-drafts.mjs --with-user-token -- --sample=article.wp-1,article.wp-2 [--delete]
 */
import {makeClient} from './lib/sanity-context.mjs'

const args = process.argv.slice(2)
const sampleArg = args.find((a) => a.startsWith('--sample='))
const DELETE = args.includes('--delete')

async function main() {
  if (!sampleArg) {
    console.error('Usage: --sample=article.wp-1,article.wp-2 [--delete]')
    process.exit(1)
  }
  const ids = sampleArg.slice('--sample='.length).split(',')
  const draftIds = ids.map((id) => `drafts.${id}`)

  const client = makeClient()
  const existing = await client.fetch('*[_id in $ids]{_id,title}', {ids: draftIds})
  console.log(`stale draft overlays found: ${existing.length}`)
  existing.forEach((d) => console.log(` - ${d._id} -- ${d.title}`))

  if (DELETE && existing.length > 0) {
    const tx = client.transaction()
    for (const d of existing) tx.delete(d._id)
    await tx.commit()
    console.log(`deleted ${existing.length} stale draft overlay(s).`)
  } else if (existing.length > 0) {
    console.log('(pass --delete to remove these)')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
