#!/usr/bin/env node
/**
 * Recovers hero image caption/credit text from the original Squarespace
 * [caption]...[/caption] shortcodes (stripped entirely during the main body
 * conversion -- see html-to-portable-text.mjs's stripShortcodes). Matches
 * each hero image to its caption block by filename, splits the caption text
 * into a description + trailing source attribution (the archive's
 * consistent "Sentence about the photo (Source Name)." pattern), and sets
 * heroImage.caption/credit/creditUrl on articles that already have a hero
 * image (from 06-upload-hero-images.mjs) but no caption/credit yet.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/07-add-hero-credits.mjs --with-user-token -- [flags]
 *
 * Flags:
 *   --dry-run           Report what would be set, write nothing.
 *   --sample=id1,id2,…  Only process these wp:post_ids (e.g. 27,5801).
 */
import {readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import * as cheerio from 'cheerio'
import {parseWxr} from './lib/wxr-parse.mjs'
import {makeClient} from './lib/sanity-context.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const XML_PATH = path.resolve(__dirname, '../../Squarespace-Wordpress-Export-09-23-2026.xml')
const OUT_DIR = path.resolve(__dirname, '.out')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const sampleArg = args.find((a) => a.startsWith('--sample='))
const SAMPLE_IDS = sampleArg ? new Set(sampleArg.slice('--sample='.length).split(',')) : null

function filenameOf(url) {
  try {
    return decodeURIComponent(url.split('/').pop().split('?')[0]).toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

/** Find the [caption] block whose <img> matches the hero image's filename. */
function extractHeroCaptionBlock(contentHtml, heroUrl) {
  const heroFilename = filenameOf(heroUrl)
  const blocks = [...contentHtml.matchAll(/\[caption\b[^\]]*\]([\s\S]*?)\[\/caption\]/g)]
  for (const m of blocks) {
    const $ = cheerio.load(m[1])
    const imgSrc = $('img').first().attr('src')
    if (!imgSrc || filenameOf(imgSrc) !== heroFilename) continue

    let creditUrl = null
    const href = $('a').first().attr('href') ?? ''
    if (/^https?:\/\//i.test(href) && !/thecaravelgu\.com/i.test(href)) creditUrl = href

    $('img').remove()
    const text = $.root().text().replace(/\s+/g, ' ').trim()
    return {text, creditUrl}
  }
  return null
}

// Common bare (no parens, no "Source:" prefix) trailing attributions seen
// in this archive, e.g. "Croatia's flag. Wikimedia Commons."
const KNOWN_SOURCES = [
  'Wikimedia Commons', 'Wikimedia', 'Wikipedia', 'Flickr', 'Pixabay',
  'Creative Commons', 'Getty Images', 'Getty', 'Reuters', 'AP', 'Twitter',
  'YouTube', 'Instagram', 'Unsplash', 'Shutterstock', 'Facebook',
]
const KNOWN_SOURCE_RE = new RegExp(`^(.*?)\\.\\s*(${KNOWN_SOURCES.join('|')})\\.?\\s*$`, 'i')

/** "Sentence about the photo (Source Name)." -> {caption, credit} */
function splitCaptionCredit(text) {
  let m = text.match(/^(.*)\(([^()]{2,80})\)\.?\s*$/)
  if (m) return {caption: m[1].trim(), credit: m[2].trim()}
  m = text.match(/^(.*?)\s*Source:\s*([^.]{2,80})\.?\s*$/i)
  if (m) return {caption: m[1].trim(), credit: m[2].trim()}
  m = text.match(/^(.*?)\bCredit:?\s+([^.]{2,80})\.?\s*$/i)
  if (m && m[1].trim()) return {caption: m[1].trim(), credit: m[2].trim()}
  m = text.match(/^(.*?)\.\s*Courtesy of\s+([^.]{2,60})\.?\s*$/i)
  if (m) return {caption: m[1].trim() + '.', credit: m[2].trim()}
  m = text.match(/^(.*?)\.\s*Photo by\s+([^.]{2,60})\.?\s*$/i)
  if (m) return {caption: m[1].trim() + '.', credit: m[2].trim()}
  m = text.match(KNOWN_SOURCE_RE)
  if (m) return {caption: m[1].trim() + '.', credit: m[2].trim()}
  return {caption: text, credit: null}
}

async function main() {
  console.log('Parsing WXR...')
  const {items} = parseWxr(XML_PATH)
  const byPostId = new Map(items.filter((i) => i.postType === 'post').map((i) => [i.postId, i]))

  const rows = readFileSync(path.join(OUT_DIR, 'hero-image-urls.csv'), 'utf-8')
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [postId, slug, ...urlParts] = line.split(',')
      return {postId, slug, url: urlParts.join(',')}
    })

  const candidates = SAMPLE_IDS ? rows.filter((r) => SAMPLE_IDS.has(r.postId)) : rows
  console.log(`${candidates.length} row(s)${SAMPLE_IDS ? ' (--sample)' : ''}`)

  const client = makeClient()
  const articleIds = candidates.map((r) => `article.wp-${r.postId}`)
  const existing = await client.fetch(
    `*[_id in $ids]{_id, "hasHero": defined(heroImage.asset), "hasCredit": defined(heroImage.caption) || defined(heroImage.credit)}`,
    {ids: articleIds},
  )
  const byId = new Map(existing.map((a) => [a._id, a]))

  const toProcess = candidates.filter((r) => {
    const a = byId.get(`article.wp-${r.postId}`)
    return a && a.hasHero && !a.hasCredit
  })
  console.log(`${toProcess.length} article(s) have a hero image and no caption/credit yet`)

  const unmatched = []
  const results = []
  for (const r of toProcess) {
    const item = byPostId.get(r.postId)
    if (!item) continue
    const block = extractHeroCaptionBlock(item.contentHtml, r.url)
    if (!block || !block.text || block.text.length > 400) {
      unmatched.push(r.postId)
      continue
    }
    const {caption, credit} = splitCaptionCredit(block.text)
    if (credit && credit.length > 80) {
      unmatched.push(r.postId)
      continue
    }
    results.push({articleId: `article.wp-${r.postId}`, caption, credit, creditUrl: block.creditUrl})
  }

  console.log(`${results.length} caption/credit matched, ${unmatched.length} had no matching caption block`)

  if (DRY_RUN) {
    console.log('\nFirst 20:')
    results.slice(0, 20).forEach((r) => console.log(` ${r.articleId}\n   caption: ${r.caption}\n   credit: ${r.credit}${r.creditUrl ? ` (${r.creditUrl})` : ''}`))
    return
  }

  const BATCH_SIZE = 50
  let written = 0
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE)
    let tx = client.transaction()
    for (const r of batch) {
      const patch = {}
      if (r.caption) patch['heroImage.caption'] = r.caption
      if (r.credit) patch['heroImage.credit'] = r.credit
      if (r.creditUrl) patch['heroImage.creditUrl'] = r.creditUrl
      tx = tx.patch(r.articleId, (p) => p.set(patch))
    }
    await tx.commit()
    written += batch.length
    console.log(`  ${written}/${results.length}`)
  }

  writeFileSync(path.join(OUT_DIR, 'hero-credit-unmatched.csv'), ['postId'].concat(unmatched).join('\n') + '\n')
  console.log(`\nSet caption/credit on ${written} article(s). ${unmatched.length} unmatched (logged to hero-credit-unmatched.csv).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
