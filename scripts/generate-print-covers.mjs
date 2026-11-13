#!/usr/bin/env node
/**
 * Generates a cover image for each printEdition document that's missing one,
 * by rasterizing page 1 of its uploaded PDF (via macOS's built-in `sips`) and
 * uploading the result as a normal Sanity image asset. Editors just upload
 * the PDF; this fills in the cover automatically so they don't have to
 * create and upload a separate cover image by hand.
 *
 * Run from the studio/ workspace (needs the Sanity CLI's logged-in session):
 *   cd studio && npx sanity exec ../scripts/generate-print-covers.mjs --with-user-token
 *   cd studio && npx sanity exec ../scripts/generate-print-covers.mjs --with-user-token -- --dry-run
 */
import {execFileSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const DRY_RUN = process.argv.includes('--dry-run')

function makeClient() {
  return getCliClient({apiVersion: '2024-10-01'})
}

async function main() {
  const client = makeClient()
  const editions = await client.fetch(
    `*[_type=="printEdition" && !defined(coverImage) && defined(pdf.asset)]{_id, title, "pdfUrl": pdf.asset->url}`,
  )
  console.log(`${editions.length} print edition(s) missing a cover image`)
  if (editions.length === 0) return

  if (DRY_RUN) {
    editions.forEach((e) => console.log(`  would generate cover for: ${e.title} (${e._id})`))
    console.log('\n--dry-run, nothing generated')
    return
  }

  for (const edition of editions) {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'print-cover-'))
    const pdfPath = path.join(tmpDir, 'edition.pdf')
    const jpgPath = path.join(tmpDir, 'cover.jpg')
    try {
      console.log(`${edition.title}: downloading PDF...`)
      const res = await fetch(edition.pdfUrl)
      if (!res.ok) throw new Error(`PDF download failed: ${res.status}`)
      writeFileSync(pdfPath, Buffer.from(await res.arrayBuffer()))

      console.log(`${edition.title}: rasterizing page 1...`)
      execFileSync('sips', ['-s', 'format', 'jpeg', pdfPath, '--out', jpgPath], {stdio: 'pipe'})

      console.log(`${edition.title}: uploading cover image...`)
      const asset = await client.assets.upload('image', readFileSync(jpgPath), {
        filename: `${edition.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cover.jpg`,
      })

      await client
        .patch(edition._id)
        .set({coverImage: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}})
        .commit()

      console.log(`${edition.title}: done`)
    } catch (err) {
      console.error(`${edition.title}: FAILED -- ${err.message}`)
    } finally {
      rmSync(tmpDir, {recursive: true, force: true})
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
