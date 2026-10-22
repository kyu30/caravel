#!/usr/bin/env node
/**
 * Matches each .docx in the "4. Published" Drive folders to its Sanity
 * article by title, then recovers the hero image's real credit hyperlink
 * from the doc (the original draft has it; it was stripped somewhere in
 * the Squarespace publishing step -- see docs/ARCHIVE_MIGRATION.md).
 *
 * Pass 1: exact (normalized) title match -- high confidence, auto-writable.
 * Pass 2 (--fuzzy): for docs with no exact title match, fuzzy title
 * similarity corroborated by byline author or filename/folder date --
 * reported for review only, never auto-written.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/08-drive-credit-match.mjs --with-user-token -- [flags]
 *
 * Flags:
 *   --dry-run     Report matches found, write nothing.
 *   --limit=N     Only process the first N docs found (for a quick sample).
 *   --fuzzy       Also run the pass-2 fallback on pass-1 misses (always dry).
 */
import {execFileSync} from 'node:child_process'
import {readdirSync, statSync} from 'node:fs'
import path from 'node:path'
import {makeClient} from './lib/sanity-context.mjs'

const DRIVE_ROOTS = [
  '/Users/keith/Downloads/drive-download-20261022T201737Z-1-001', // regions
  '/Users/keith/Downloads/drive-download-20261022T211229Z-1-001', // Compass topics
]

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FUZZY = args.includes('--fuzzy')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.slice('--limit='.length)) : null

function normalize(title) {
  return (title ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’‘"“”.,!?;:()*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Regions don't all use a single flat "4. Published" folder -- some (LAC,
// WEUC, SWANA) also have a separate top-level "Archive"-style folder with
// finished articles moved out of the active Published folder over time,
// and LAC's archive even has its OWN nested Drafts/Ready/Copy-Edited/
// Published pipeline inside it. Rather than special-case every region's
// layout, walk the whole region tree and skip only folders that are
// clearly a non-final stage (drafts, ready-for-copy, copy-edited,
// resources, meeting notes, print layouts) -- recurse into everything
// else, including arbitrarily nested "Archive"/"Published" folders.
const SKIP_DIR_RE = /^1\.?\s*drafts?\b|^2\.?\s*ready for copy\b|^3\.?\s*copy edited\b|resources\b|meeting\b|print\b|\(delete\)/i

function findArticleDocx(roots) {
  const results = []
  for (const root of roots) {
  for (const region of readdirSync(root)) {
    const regionDir = path.join(root, region)
    try {
      if (!statSync(regionDir).isDirectory()) continue
    } catch {
      continue
    }
    const walk = (dir) => {
      for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (SKIP_DIR_RE.test(entry.name)) continue
          walk(full)
        } else if (entry.isFile() && /\.docx$/i.test(entry.name)) {
          results.push(full)
        }
      }
    }
    walk(regionDir)
  }
  }
  return results
}

// Compass-topic docs' published titles get a "Compass World: "/"Compass
// Money: " prefix added during editing that the original doc title never
// had -- not random drift, a systematic rename. Derive the topic from the
// doc's own folder path (World/Elections/Gender/Coin/Futures/Planet) so the
// prefix can be tried as a second exact-match candidate.
const COMPASS_TOPICS = ['World', 'Elections', 'Gender', 'Coin', 'Futures', 'Planet']
function compassTopicFromPath(docPath) {
  const parts = docPath.split(path.sep)
  return COMPASS_TOPICS.find((t) => parts.includes(t)) ?? null
}

function toMarkdown(docxPath) {
  return execFileSync('pandoc', ['-t', 'markdown', docxPath], {maxBuffer: 1024 * 1024 * 20}).toString('utf-8')
}

/** The title's formatting isn't consistent across writers/eras (underline,
 * bold, or plain text) -- take the first paragraph (blank-line-delimited,
 * so a word-wrapped multi-line title still comes through whole) and strip
 * whatever markdown formatting is on it. Bails out if the doc opens with a
 * bare image link instead of a real title line. */
function extractTitle(md) {
  const firstPara = md.split(/\n\s*\n/)[0]?.trim()
  if (!firstPara) return null
  if (/^\[\[?https?:\/\//.test(firstPara)) return null
  const cleaned = firstPara
    .replace(/\[([^\]]+)\]\{\.underline\}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\\(.)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
}

// Not every doc has an image link before the body starts -- without this
// check, the "first link in the first 1000 chars" is often just the first
// inline body citation (e.g. "called" -> bbc.com), not a photo credit.
// Require the link to actually look like a photo source: either the link
// text names a known platform, or the URL's own host is a known photo
// host, regardless of what text is on it (some docs paste the raw URL as
// the visible link text instead of a word like "Flickr").
const KNOWN_TEXT = /wiki(media|pedia)?\s*commons?\b|^commons$|flickr|pixabay|getty|unsplash|pexels|picryl|shutterstock|creative commons/i
const KNOWN_HOSTS = [
  'commons.wikimedia.org', 'upload.wikimedia.org', 'commons.m.wikimedia.org', 'wikipedia.org',
  'flickr.com', 'staticflickr.com', 'pixabay.com', 'unsplash.com', 'pexels.com', 'picryl.com',
  'needpix.com', 'pikrepo.com', 'pxfuel.com', 'pikist.com', 'pickpik.com', 'gettyimages.com',
  'istockphoto.com', 'shutterstock.com', 'geograph.org.uk',
]

function isPhotoHost(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return KNOWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

/** First *photo-source* link within the first ~1500 chars -> the hero
 * credit. Text may or may not be underline-wrapped, and may be a nice word
 * ("Flickr") or just the raw URL pasted as the visible link text.
 *
 * The URL group allows one level of balanced parens -- Wikimedia Commons
 * filenames routinely have a disambiguating "(123456)" in them, and a naive
 * [^)\s]+ capture truncates the URL at that first internal ")" instead of
 * the markdown link's real closing paren. */
function extractCredit(md) {
  const head = md.slice(0, 1500)
  const re = /\[(?:\[([^\]]+)\]\{\.underline\}|([^\]]+))\]\(((?:[^()\s]|\([^()]*\))*)\)/g
  let m
  while ((m = re.exec(head))) {
    const text = (m[1] ?? m[2] ?? '').replace(/\s+/g, ' ').replace(/\\(.)/g, '$1').trim()
    const url = m[3]
    if (!/^https?:\/\//i.test(url)) continue
    if (KNOWN_TEXT.test(text) || isPhotoHost(url)) return {text, url}
  }
  return null
}

/** "By Jane Doe" near the top of the doc -> "Jane Doe", else null. */
function extractByline(md) {
  const m = md.slice(0, 600).match(/^By\s+([A-Z][^\n]{2,60})$/m)
  return m ? m[1].replace(/\\(.)/g, '$1').trim() : null
}

const MONTH_RE = '(0?[1-9]|1[0-2])'
const DAY_RE = '(0?[1-9]|[12][0-9]|3[01])'

/** Best-effort date from the filename + its parent folder name. Returns an
 * ISO-ish {year, month, day} or null if there's no usable signal. Filename
 * conventions vary (MM_DD, MM.DD, explicit YYYY.MM.DD) and a bare MM_DD
 * needs the parent folder ("Academic Year 2019-2020", "Fall 2020", "Spring
 * 2024") to resolve which calendar year it falls in. */
function extractDate(filePath) {
  const base = path.basename(filePath, '.docx')
  const parent = path.basename(path.dirname(filePath))

  const explicit = base.match(/(20\d{2})[.\-_](\d{1,2})[.\-_](\d{1,2})/)
  if (explicit) return {year: Number(explicit[1]), month: Number(explicit[2]), day: Number(explicit[3])}

  const md = base.match(new RegExp(`\\b${MONTH_RE}[._]${DAY_RE}\\b`))
  if (!md) return null
  const month = Number(md[1])
  const day = Number(md[2])

  const fallSpring = parent.match(/\b(Fall|Spring)\s+(20\d{2})\b/i)
  if (fallSpring) return {year: Number(fallSpring[2]), month, day}

  const academicYear = parent.match(/(20\d{2})\s*-\s*(20\d{2})/)
  if (academicYear) {
    const [y1, y2] = [Number(academicYear[1]), Number(academicYear[2])]
    // Aug-Dec falls in the first year of the range, Jan-Jul in the second.
    return {year: month >= 8 ? y1 : y2, month, day}
  }
  return null
}

function daysBetween(a, b) {
  return Math.abs((a.getTime() - b.getTime()) / 86400000)
}

/** Token-overlap (Jaccard) similarity between two normalized titles. */
function titleSimilarity(a, b) {
  const ta = new Set(a.split(' ').filter((w) => w.length > 2))
  const tb = new Set(b.split(' ').filter((w) => w.length > 2))
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const w of ta) if (tb.has(w)) intersection++
  return intersection / new Set([...ta, ...tb]).size
}

async function main() {
  console.log('Scanning article folders...')
  let docs = findArticleDocx(DRIVE_ROOTS)
  console.log(`${docs.length} .docx file(s) found`)
  if (LIMIT) docs = docs.slice(0, LIMIT)

  console.log('Loading Sanity articles...')
  const client = makeClient()
  const articles = await client.fetch(
    `*[_type=="article" && _id match "article.wp-*"]{_id, title, publishDate, "hasCreditUrl": defined(heroImage.creditUrl), "authors": authors[]->name}`,
  )
  const byNormTitle = new Map()
  for (const a of articles) {
    const key = normalize(a.title)
    if (!byNormTitle.has(key)) byNormTitle.set(key, [])
    byNormTitle.get(key).push(a)
  }

  let processed = 0
  let titleFailed = 0
  let noArticleMatch = 0
  let ambiguousMatch = 0
  let noCreditInDoc = 0
  const toWrite = []
  const unmatched = [] // {docPath, title, md} -- for the fuzzy pass

  for (const docPath of docs) {
    processed++
    let md
    try {
      md = toMarkdown(docPath)
    } catch (err) {
      console.log(`  pandoc failed on ${path.basename(docPath)}: ${err.message.slice(0, 100)}`)
      continue
    }
    const title = extractTitle(md)
    if (!title) {
      titleFailed++
      continue
    }
    let matches = byNormTitle.get(normalize(title))
    if (!matches || matches.length === 0) {
      const topic = compassTopicFromPath(docPath)
      if (topic) matches = byNormTitle.get(normalize(`Compass ${topic}: ${title}`))
    }
    if (!matches || matches.length === 0) {
      noArticleMatch++
      unmatched.push({docPath, title, md})
      continue
    }
    if (matches.length > 1) {
      ambiguousMatch++
      continue
    }
    const article = matches[0]
    if (article.hasCreditUrl) continue // already has one, don't touch

    const credit = extractCredit(md)
    if (!credit) {
      noCreditInDoc++
      continue
    }
    toWrite.push({articleId: article._id, title, creditText: credit.text, creditUrl: credit.url})

    if (processed % 100 === 0) console.log(`  ${processed}/${docs.length}`)
  }

  console.log(`\nprocessed: ${processed}`)
  console.log(`title extraction failed: ${titleFailed}`)
  console.log(`no matching Sanity article by title: ${noArticleMatch}`)
  console.log(`ambiguous (multiple articles share that title): ${ambiguousMatch}`)
  console.log(`matched article but no credit link found in doc: ${noCreditInDoc}`)
  console.log(`\npass 1 -- matched with a recoverable credit link: ${toWrite.length}`)

  if (FUZZY) {
    console.log(`\n--- pass 2 (fuzzy, review-only) on ${unmatched.length} unmatched doc(s) ---`)
    const fuzzyResults = []
    let noDateOrAuthor = 0
    let noCandidateAboveThreshold = 0
    let fuzzyAmbiguous = 0

    for (const u of unmatched) {
      const byline = extractByline(u.md)
      const date = extractDate(u.docPath)
      if (!byline && !date) {
        noDateOrAuthor++
        continue
      }
      const normTitle = normalize(u.title)
      const scored = articles
        .filter((a) => !a.hasCreditUrl)
        .map((a) => ({a, score: titleSimilarity(normTitle, normalize(a.title))}))
        .filter((x) => x.score >= 0.6)
        .sort((x, y) => y.score - x.score)

      const corroborated = scored.filter(({a}) => {
        const authorMatch = byline && (a.authors ?? []).some((n) => normalize(n) === normalize(byline))
        let dateMatch = false
        if (date && a.publishDate) {
          try {
            const docDate = new Date(Date.UTC(date.year, date.month - 1, date.day))
            dateMatch = daysBetween(docDate, new Date(a.publishDate)) <= 21
          } catch {
            dateMatch = false
          }
        }
        return authorMatch || dateMatch
      })

      if (corroborated.length === 0) {
        noCandidateAboveThreshold++
        continue
      }
      if (corroborated.length > 1) {
        fuzzyAmbiguous++
        continue
      }

      const article = corroborated[0].a
      const credit = extractCredit(u.md)
      if (!credit) continue
      fuzzyResults.push({
        articleId: article._id,
        docTitle: u.title,
        articleTitle: article.title,
        score: corroborated[0].score.toFixed(2),
        byline,
        date,
        creditText: credit.text,
        creditUrl: credit.url,
      })
    }

    console.log(`no byline and no date signal in doc: ${noDateOrAuthor}`)
    console.log(`no fuzzy-title candidate above threshold: ${noCandidateAboveThreshold}`)
    console.log(`ambiguous (multiple corroborated candidates): ${fuzzyAmbiguous}`)
    console.log(`\npass 2 -- corroborated fuzzy matches with a credit link: ${fuzzyResults.length}`)
    console.log('\nAll pass-2 matches (review before trusting):')
    fuzzyResults.forEach((r) =>
      console.log(
        ` score=${r.score} doc="${r.docTitle}" -> article="${r.articleTitle}" (${r.articleId})\n` +
          `   byline=${r.byline ?? 'n/a'} date=${r.date ? `${r.date.year}-${r.date.month}-${r.date.day}` : 'n/a'}\n` +
          `   credit: ${r.creditText} -> ${r.creditUrl}`,
      ),
    )
    return
  }

  if (DRY_RUN) {
    console.log('\nFirst 20:')
    toWrite.slice(0, 20).forEach((w) => console.log(` ${w.articleId} "${w.title}" -> ${w.creditText}: ${w.creditUrl}`))
    return
  }

  const BATCH_SIZE = 50
  let written = 0
  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const batch = toWrite.slice(i, i + BATCH_SIZE)
    let tx = client.transaction()
    for (const w of batch) tx = tx.patch(w.articleId, (p) => p.set({'heroImage.creditUrl': w.creditUrl}))
    await tx.commit()
    written += batch.length
    console.log(`  wrote ${written}/${toWrite.length}`)
  }
  console.log(`\nSet creditUrl on ${written} article(s) from the original Drive docs.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
