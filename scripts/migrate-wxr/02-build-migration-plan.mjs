#!/usr/bin/env node
/**
 * THE dry run. Reads the WXR export + live Sanity context, resolves
 * authors/categories, converts bodies to Portable Text, and writes the
 * result to local files under .out/ -- zero Sanity writes. See
 * docs/ARCHIVE_MIGRATION.md for the full pipeline.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/02-build-migration-plan.mjs --with-user-token
 */
import {writeFileSync, mkdirSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseWxr} from './lib/wxr-parse.mjs'
import {resolveTaxonomy} from './lib/category-map.mjs'
import {buildAuthorResolver} from './lib/author-resolve.mjs'
import {htmlToPortableText, makeKey} from './lib/html-to-portable-text.mjs'
import {makeClient, loadContext} from './lib/sanity-context.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const XML_PATH = path.resolve(__dirname, '../../Squarespace-Wordpress-Export-09-23-2026.xml')
const OUT_DIR = path.resolve(__dirname, '.out')
const EXPECTED_IN_SCOPE = 2930
const GENERIC_CREATORS = new Set(['TheCaravelArchives', 'TheEditorialBoard', 'thecaravel@georgetown.edu'])

function toIso(postDateGmt, postDate) {
  const raw = postDateGmt && postDateGmt !== '0000-00-00 00:00:00' ? postDateGmt : postDate
  if (!raw) return new Date().toISOString()
  const d = new Date(raw.replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))]
}

async function main() {
  mkdirSync(OUT_DIR, {recursive: true})

  console.log(`Parsing ${path.basename(XML_PATH)}...`)
  const {authors: wpAuthors, items} = parseWxr(XML_PATH)
  const wpAuthorsByLogin = new Map(wpAuthors.map((a) => [a.login, a]))
  console.log(`  ${items.length} items, ${wpAuthors.length} wp:author records`)

  const posts = items.filter((it) => it.postType === 'post' && it.status === 'publish')
  const inScope = posts.filter((it) => it.creator && !GENERIC_CREATORS.has(it.creator))
  const excludedGeneric = posts.length - inScope.length

  console.log(`  ${posts.length} published posts`)
  console.log(`  ${inScope.length} individually-bylined (in scope) -- ${excludedGeneric} excluded (generic byline)`)
  if (inScope.length !== EXPECTED_IN_SCOPE) {
    console.warn(
      `  WARNING: expected ${EXPECTED_IN_SCOPE} in-scope items, got ${inScope.length}. ` +
        `The export file or the exclusion rules may have drifted since docs/ARCHIVE_MIGRATION.md was written -- review before proceeding.`,
    )
  }

  console.log('Loading live Sanity context (studio/ -- sanity exec --with-user-token)...')
  const client = makeClient()
  const ctx = await loadContext(client)
  console.log(
    `  live: ${ctx.regionsBySlug.size} regions, ${ctx.sectionsBySlug.size} sections, ${ctx.authors.length} authors, ${ctx.existingArticleIds.size} articles`,
  )

  const authorResolver = buildAuthorResolver({liveAuthors: ctx.authors, wpAuthorsByLogin})
  const attachmentUrlByPostId = new Map(
    items.filter((it) => it.postType === 'attachment').map((it) => [it.postId, it.attachmentUrl]),
  )

  const manualReview = []
  const heroImageRows = []
  const conversionDrops = []
  const dropHistogram = {}
  const articleDocs = []
  const usedAuthorIds = new Set()
  let categoryErrors = 0

  for (const it of inScope) {
    let tax
    try {
      tax = resolveTaxonomy(it, ctx)
    } catch (err) {
      categoryErrors += 1
      manualReview.push({postId: it.postId, title: it.title, reason: `category-map-error: ${err.message}`, blocking: true})
      continue
    }

    if (!tax.ok) {
      manualReview.push({postId: it.postId, title: it.title, reason: tax.reason, blocking: true})
      continue
    }
    if (!it.title.trim() || !it.contentHtml.trim()) {
      manualReview.push({postId: it.postId, title: it.title, reason: 'empty-title-or-content', blocking: true})
      continue
    }
    if (tax.hasUnmappedSecondary) {
      manualReview.push({
        postId: it.postId,
        title: it.title,
        reason: 'info:unmapped-secondary-category (likely science-technology)',
        blocking: false,
      })
    }

    const authorRefs = authorResolver.resolveLogin(it.creator)
    authorRefs.forEach((a) => usedAuthorIds.add(a._id))

    const body = htmlToPortableText(it.contentHtml, {
      postId: it.postId,
      onDrop: (d) => {
        conversionDrops.push(d)
        dropHistogram[d.tag] = (dropHistogram[d.tag] ?? 0) + 1
      },
    })

    const heroThumbId = it.meta['_thumbnail_id']
    if (heroThumbId && attachmentUrlByPostId.has(heroThumbId)) {
      heroImageRows.push({postId: it.postId, slug: it.slug, url: attachmentUrlByPostId.get(heroThumbId)})
    }

    const tags = dedupe([...it.tags.map((t) => t.display), ...tax.auditTags, ...tax.badgeTags])

    articleDocs.push({
      _id: `article.wp-${it.postId}`,
      _type: 'article',
      title: it.title,
      slug: {_type: 'slug', current: it.slug},
      status: 'draft',
      publishDate: toIso(it.postDateGmt, it.postDate),
      featured: false,
      authors: authorRefs.map((a) => ({_type: 'reference', _ref: a._id, _key: makeKey()})),
      primarySection: {_type: 'reference', _ref: tax.primaryId},
      regions: tax.regionIds.map((ref) => ({_type: 'reference', _ref: ref, _key: makeKey()})),
      compassTopics: tax.compassTopicIds.map((ref) => ({_type: 'reference', _ref: ref, _key: makeKey()})),
      tags,
      body,
      _meta: {wpPostId: it.postId, alreadyLive: ctx.existingArticleIds.has(`article.wp-${it.postId}`)},
    })
  }

  // --- write output files ---
  writeFileSync(
    path.join(OUT_DIR, 'articles.ndjson'),
    articleDocs.map((d) => JSON.stringify(d)).join('\n') + '\n',
  )
  writeFileSync(
    path.join(OUT_DIR, 'authors-to-create.ndjson'),
    authorResolver.newAuthors.map((a) => JSON.stringify(a.doc)).join('\n') + '\n',
  )
  writeFileSync(
    path.join(OUT_DIR, 'manual-review.csv'),
    ['postId,title,reason,blocking']
      .concat(manualReview.map((r) => [r.postId, csvEscape(r.title), r.reason, r.blocking].join(',')))
      .join('\n') + '\n',
  )
  writeFileSync(
    path.join(OUT_DIR, 'hero-image-urls.csv'),
    ['postId,slug,url'].concat(heroImageRows.map((r) => [r.postId, r.slug, r.url].join(','))).join('\n') + '\n',
  )
  writeFileSync(
    path.join(OUT_DIR, 'conversion-log.txt'),
    conversionDrops.map((d) => `wp-${d.postId}\t${d.tag}\t${d.snippet}`).join('\n') + '\n',
  )
  writeFileSync(
    path.join(OUT_DIR, 'author-collisions.json'),
    JSON.stringify(authorResolver.collisions, null, 2),
  )

  const blockingReview = manualReview.filter((r) => r.blocking)
  const alreadyLive = articleDocs.filter((d) => d._meta.alreadyLive).length
  const summary = {
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    publishedPosts: posts.length,
    excludedGenericByline: excludedGeneric,
    inScope: inScope.length,
    expectedInScope: EXPECTED_IN_SCOPE,
    articlesToCreate: articleDocs.length,
    articlesAlreadyLive: alreadyLive,
    manualReviewBlocking: blockingReview.length,
    manualReviewInfoOnly: manualReview.length - blockingReview.length,
    categoryResolutionErrors: categoryErrors,
    distinctAuthorsUsed: usedAuthorIds.size,
    newAuthors: authorResolver.newAuthors.length,
    reusedExistingAuthors: usedAuthorIds.size - authorResolver.newAuthors.length,
    authorSlugCollisions: authorResolver.collisions.length,
    heroImageUrlsFound: heroImageRows.length,
    conversionDropsTotal: conversionDrops.length,
    conversionDropsByTag: dropHistogram,
  }
  writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2))

  console.log('\n--- summary ---')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`\nWrote output to ${path.relative(process.cwd(), OUT_DIR)}/`)
  console.log('No Sanity writes were made (dry run).')
}

function csvEscape(s) {
  const str = String(s ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
