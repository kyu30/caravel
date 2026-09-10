/**
 * The single data-access layer for the site. Every page imports from here.
 *
 * When PUBLIC_SANITY_PROJECT_ID is unset (USE_SAMPLE_DATA), each function returns
 * bundled fixtures so the front end builds with zero configuration. Once the env
 * var is set the same functions run GROQ against the real dataset.
 */
import {sanityClient, USE_SAMPLE_DATA} from './sanity'
import type {Article, ArticleCardData, Author, Taxonomy} from './types'
import {
  sampleArticles,
  sampleAuthors,
  sampleRegions,
  sampleSections,
} from './sampleData'

// --- GROQ fragments --------------------------------------------------------
const PUBLISHED = `_type == "article" && status == "published" && publishDate <= now()`

const CARD_FIELDS = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  "url": "/" + primarySection->slug.current + "/" + slug.current,
  subtitle,
  "excerpt": coalesce(excerpt, subtitle),
  publishDate,
  featured,
  heroImage{alt, caption, credit, asset},
  "authors": authors[]->{_id, name, "slug": slug.current, role},
  "primarySection": primarySection->{_id, _type, name, "slug": slug.current},
  "regions": regions[]->{_id, name, "slug": slug.current},
  "compassTopics": compassTopics[]->{_id, name, "slug": slug.current}
`

const ARTICLE_FIELDS = /* groq */ `
  ${CARD_FIELDS},
  body[]{
    ...,
    markDefs[]{...},
    _type == "image" => { ..., asset }
  }
`

const AUTHOR_FIELDS = /* groq */ `
  _id, name, "slug": slug.current, role, staffGroup, active,
  headshot{alt, asset},
  bio,
  "socialLinks": socialLinks[]{platform, url}
`

// --- helpers -------------------------------------------------------------
function byDateDesc<T extends {publishDate: string}>(a: T, b: T) {
  return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
}

async function q<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!sanityClient) throw new Error('sanityClient unavailable')
  return sanityClient.fetch<T>(query, params)
}

// --- taxonomy ----------------------------------------------------------
export async function getRegions(): Promise<Taxonomy[]> {
  if (USE_SAMPLE_DATA) return [...sampleRegions].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  return q<Taxonomy[]>(
    /* groq */ `*[_type == "region"]|order(order asc){_id, _type, name, shortName, "slug": slug.current, description, order, mapId}`,
  )
}

export async function getSections(kind?: 'editorial' | 'compass'): Promise<Taxonomy[]> {
  if (USE_SAMPLE_DATA) {
    return [...sampleSections]
      .filter((s) => !kind || s.kind === kind)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  }
  const filter = kind ? ` && kind == $kind` : ''
  return q<Taxonomy[]>(
    /* groq */ `*[_type == "section"${filter}]|order(order asc){_id, _type, name, "slug": slug.current, description, order, kind}`,
    kind ? {kind} : {},
  )
}

/** Regions + sections keyed for menus and route generation. */
export async function getAllTaxonomies(): Promise<Taxonomy[]> {
  const [regions, sections] = await Promise.all([getRegions(), getSections()])
  return [...regions, ...sections]
}

export async function getTaxonomyBySlug(slug: string): Promise<Taxonomy | null> {
  const all = await getAllTaxonomies()
  return all.find((t) => t.slug === slug) ?? null
}

// --- articles --------------------------------------------------------
export async function getLatestArticles(limit = 12): Promise<ArticleCardData[]> {
  if (USE_SAMPLE_DATA) return [...sampleArticles].sort(byDateDesc).slice(0, limit)
  return q<ArticleCardData[]>(
    /* groq */ `*[${PUBLISHED}]|order(publishDate desc)[0...$limit]{${CARD_FIELDS}}`,
    {limit},
  )
}

/** Every published article, newest first, no limit. Powers /archive. */
export async function getAllArticlesChrono(): Promise<ArticleCardData[]> {
  if (USE_SAMPLE_DATA) return [...sampleArticles].sort(byDateDesc)
  return q<ArticleCardData[]>(
    /* groq */ `*[${PUBLISHED}]|order(publishDate desc){${CARD_FIELDS}}`,
  )
}

export async function getFeaturedArticles(limit = 4): Promise<ArticleCardData[]> {
  if (USE_SAMPLE_DATA) {
    return [...sampleArticles].filter((a) => a.featured).sort(byDateDesc).slice(0, limit)
  }
  return q<ArticleCardData[]>(
    /* groq */ `*[${PUBLISHED} && featured == true]|order(publishDate desc)[0...$limit]{${CARD_FIELDS}}`,
    {limit},
  )
}

/** All {section, slug} pairs for the /[section]/[slug] getStaticPaths. */
export async function getAllArticleRoutes(): Promise<{section: string; slug: string}[]> {
  if (USE_SAMPLE_DATA) {
    return sampleArticles.map((a) => ({section: a.primarySection.slug, slug: a.slug}))
  }
  return q<{section: string; slug: string}[]>(
    /* groq */ `*[${PUBLISHED}]{"section": primarySection->slug.current, "slug": slug.current}`,
  )
}

export async function getArticleBySlug(
  sectionSlug: string,
  slug: string,
): Promise<Article | null> {
  if (USE_SAMPLE_DATA) {
    return (
      sampleArticles.find(
        (a) => a.slug === slug && a.primarySection.slug === sectionSlug,
      ) ?? null
    )
  }
  return q<Article | null>(
    /* groq */ `*[${PUBLISHED} && slug.current == $slug && primarySection->slug.current == $sectionSlug][0]{${ARTICLE_FIELDS}}`,
    {slug, sectionSlug},
  )
}

/** Articles filed under a region or section — as primary, region tag, or Compass tag. */
export async function getArticlesByTaxonomy(tax: Taxonomy, limit = 40): Promise<ArticleCardData[]> {
  if (USE_SAMPLE_DATA) {
    return [...sampleArticles]
      .filter(
        (a) =>
          a.primarySection._id === tax._id ||
          (a.regions ?? []).some((r) => r._id === tax._id) ||
          (a.compassTopics ?? []).some((c) => c._id === tax._id),
      )
      .sort(byDateDesc)
      .slice(0, limit)
  }
  return q<ArticleCardData[]>(
    /* groq */ `*[${PUBLISHED} && (
      primarySection._ref == $id ||
      $id in regions[]._ref ||
      $id in compassTopics[]._ref
    )]|order(publishDate desc)[0...$limit]{${CARD_FIELDS}}`,
    {id: tax._id, limit},
  )
}

export async function getRelatedArticles(article: ArticleCardData, limit = 4): Promise<ArticleCardData[]> {
  if (USE_SAMPLE_DATA) {
    const tagIds = new Set<string>([
      article.primarySection._id,
      ...(article.regions ?? []).map((r) => r._id),
      ...(article.compassTopics ?? []).map((c) => c._id),
    ])
    return [...sampleArticles]
      .filter((a) => a._id !== article._id)
      .map((a) => {
        const ids = [
          a.primarySection._id,
          ...(a.regions ?? []).map((r) => r._id),
          ...(a.compassTopics ?? []).map((c) => c._id),
        ]
        return {a, score: ids.filter((id) => tagIds.has(id)).length}
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || byDateDesc(x.a, y.a))
      .slice(0, limit)
      .map((x) => x.a)
  }
  const tagIds = [
    article.primarySection._id,
    ...(article.regions ?? []).map((r) => r._id),
    ...(article.compassTopics ?? []).map((c) => c._id),
  ]
  return q<ArticleCardData[]>(
    /* groq */ `*[${PUBLISHED} && _id != $id && (
      primarySection._ref in $tags || count((regions[]._ref)[@ in $tags]) > 0 || count((compassTopics[]._ref)[@ in $tags]) > 0
    )]|order(publishDate desc)[0...$limit]{${CARD_FIELDS}}`,
    {id: article._id, tags: tagIds, limit},
  )
}

// --- authors --------------------------------------------------------
export async function getAuthors(): Promise<Author[]> {
  if (USE_SAMPLE_DATA) return [...sampleAuthors].sort((a, b) => a.name.localeCompare(b.name))
  return q<Author[]>(/* groq */ `*[_type == "author"]|order(name asc){${AUTHOR_FIELDS}}`)
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  if (USE_SAMPLE_DATA) return sampleAuthors.find((a) => a.slug === slug) ?? null
  return q<Author | null>(
    /* groq */ `*[_type == "author" && slug.current == $slug][0]{${AUTHOR_FIELDS}}`,
    {slug},
  )
}

export async function getArticlesByAuthor(authorId: string, limit = 60): Promise<ArticleCardData[]> {
  if (USE_SAMPLE_DATA) {
    return [...sampleArticles]
      .filter((a) => a.authors.some((au) => au._id === authorId))
      .sort(byDateDesc)
      .slice(0, limit)
  }
  return q<ArticleCardData[]>(
    /* groq */ `*[${PUBLISHED} && $id in authors[]._ref]|order(publishDate desc)[0...$limit]{${CARD_FIELDS}}`,
    {id: authorId, limit},
  )
}

// --- search --------------------------------------------------------
export interface SearchRecord {
  title: string
  url: string
  excerpt: string
  section: string
  date: string
  authors: string[]
}

export async function getSearchIndex(): Promise<SearchRecord[]> {
  const articles = USE_SAMPLE_DATA
    ? [...sampleArticles].sort(byDateDesc)
    : await q<ArticleCardData[]>(
        /* groq */ `*[${PUBLISHED}]|order(publishDate desc){${CARD_FIELDS}}`,
      )
  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    excerpt: a.excerpt ?? a.subtitle ?? '',
    section: a.primarySection?.name ?? '',
    date: a.publishDate,
    authors: a.authors.map((au) => au.name),
  }))
}
