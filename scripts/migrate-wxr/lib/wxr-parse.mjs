/**
 * Parses the Squarespace WordPress-format (WXR) export into a plain JS shape.
 * See docs/ARCHIVE_MIGRATION.md for the source data model.
 */
import {readFileSync} from 'node:fs'
import {XMLParser} from 'fast-xml-parser'

// fast-xml-parser collapses a child element to a bare object (not a
// 1-element array) when it occurs exactly once on a given parent. Most posts
// have 1-2 categories, so without this, category-resolution code would
// silently only see the last category on many posts. Force these to arrays.
const ALWAYS_ARRAY = new Set(['item', 'category', 'wp:postmeta', 'wp:comment', 'wp:author'])

/** A handful of legacy CDATA fields carry double-escaped entities (literal
 * "&amp;" text, not real XML entities — CDATA doesn't decode entities at
 * all). Only used for plain-text fields (title/category/tag display names),
 * never for content:encoded, which stays raw HTML for cheerio to parse. */
function decodeStrayEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
}

function text(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  // fast-xml-parser represents CDATA content as an array of fragments (to
  // support tags with multiple adjacent CDATA sections) whenever
  // cdataPropName/textNodeName are configured -- even for the common case of
  // exactly one fragment. Concatenate them back into a plain string.
  if (Array.isArray(v)) return v.map(text).join('')
  if (typeof v === 'object' && '#text' in v) return text(v['#text'])
  return ''
}

function normalizeItem(raw) {
  const categoriesRaw = raw.category ?? []
  const categories = []
  const tags = []
  for (const c of categoriesRaw) {
    const domain = c['@_domain']
    const nicename = c['@_nicename']
    const display = decodeStrayEntities(text(c))
    if (domain === 'category') categories.push({nicename, display})
    else if (domain === 'post_tag') tags.push({nicename, display})
  }

  const meta = {}
  for (const m of raw['wp:postmeta'] ?? []) {
    meta[text(m['wp:meta_key'])] = text(m['wp:meta_value'])
  }

  return {
    postId: text(raw['wp:post_id']),
    postType: text(raw['wp:post_type']),
    status: text(raw['wp:status']),
    title: decodeStrayEntities(text(raw.title)),
    slug: text(raw['wp:post_name']),
    contentHtml: text(raw['content:encoded']),
    creator: text(raw['dc:creator']).trim(),
    postDate: text(raw['wp:post_date']),
    postDateGmt: text(raw['wp:post_date_gmt']),
    categories,
    tags,
    meta,
    attachmentUrl: text(raw['wp:attachment_url']),
    postParent: text(raw['wp:post_parent']),
  }
}

/** @returns {{authors: Array, items: Array}} */
export function parseWxr(xmlPath) {
  const xml = readFileSync(xmlPath, 'utf-8')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '#text',
    textNodeName: '#text',
    isArray: (name) => ALWAYS_ARRAY.has(name),
    trimValues: false,
  })
  const doc = parser.parse(xml)
  const channel = doc.rss.channel

  const authors = (channel['wp:author'] ?? []).map((a) => ({
    login: text(a['wp:author_login']),
    displayName: decodeStrayEntities(text(a['wp:author_display_name'])),
    firstName: text(a['wp:author_first_name']),
    lastName: text(a['wp:author_last_name']),
  }))

  const items = (channel.item ?? []).map(normalizeItem)

  return {authors, items}
}
