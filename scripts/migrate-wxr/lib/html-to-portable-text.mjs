/**
 * Converts a Squarespace `content:encoded` HTML fragment into the site's
 * restricted Portable Text shape (studio/schemaTypes/objects/blockContent.ts):
 * block styles normal/h2/h3/h4/blockquote, bullet/number lists, strong/em/
 * underline marks, a `link` annotation. No images, tables, or embeds this
 * pass -- everything unsupported is dropped and reported via `onDrop`,
 * never allowed to crash the run over one bad element.
 */
import * as cheerio from 'cheerio'
import {randomUUID} from 'node:crypto'

const HEADING_STYLE = {h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4'}
const LIST_TYPE = {ul: 'bullet', ol: 'number'}
const DECORATOR = {strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'underline'}
const TRANSPARENT = new Set(['div', 'span', 'figure', 'section', 'article', 'font', 'center', 'body', 'html', 'head'])
const DROPPED = new Set([
  'img', 'iframe', 'script', 'style', 'table', 'embed', 'object', 'form',
  'audio', 'video', 'hr', 'noscript', 'svg', 'button', 'input', 'select',
  'canvas', 'meta', 'link',
])
const SAFE_HREF = /^(https?:|mailto:|tel:|\/)/i

export function makeKey() {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

/**
 * @param {string} html
 * @param {{postId?: string, onDrop?: (info:{postId:string,tag:string,snippet:string})=>void}} opts
 * @returns {object[]} Portable Text blocks
 */
export function htmlToPortableText(html, opts = {}) {
  const {postId = '', onDrop} = opts
  const $ = cheerio.load(html ?? '')
  const blocks = []
  let current = null

  function startBlock(style, extra) {
    current = {_type: 'block', _key: makeKey(), style, markDefs: [], children: [], ...extra}
    blocks.push(current)
  }
  function ensure() {
    if (!current) startBlock('normal')
  }
  function emitText(text, marks) {
    if (!text) return
    ensure()
    current.children.push({_type: 'span', _key: makeKey(), text, marks})
  }
  function drop(tag, node) {
    if (!onDrop) return
    let snippet = ''
    try {
      snippet = ($.html(node) ?? '').slice(0, 80)
    } catch {
      // best-effort only
    }
    onDrop({postId, tag, snippet})
  }

  // A <li>'s real content is very often wrapped in a <p> (or <div>) by
  // Squarespace's export. Unwrap those directly into the already-open
  // list-item block instead of recursing through the generic tag dispatch
  // (which would start a *new*, un-listItem'd block for the <p> and leave
  // the list-item block itself empty) -- same technique as the blockquote
  // handling below, applied to <li>.
  function walkListItem(li, type, level) {
    const kids = li.children ?? []
    const blockKids = kids.filter((k) => k.type === 'tag' && ['p', 'div'].includes((k.tagName || '').toLowerCase()))
    if (blockKids.length === 0) {
      startBlock('normal', {listItem: type, level})
      kids.forEach((c) => walk(c, [], {type, level}))
      current = null
      return
    }
    for (const k of kids) {
      const isBlockKid = k.type === 'tag' && ['p', 'div'].includes((k.tagName || '').toLowerCase())
      if (isBlockKid) {
        startBlock('normal', {listItem: type, level})
        ;(k.children ?? []).forEach((c) => walk(c, [], {type, level}))
        current = null
      } else if (k.type === 'text' && (k.data ?? '').trim() === '') {
        // whitespace between <p> siblings -- ignore
      } else {
        startBlock('normal', {listItem: type, level})
        walk(k, [], {type, level})
        current = null
      }
    }
  }

  function walk(node, marks, listCtx) {
    if (node.type === 'text') {
      const text = (node.data ?? '').replace(/\s+/g, ' ')
      if (text.trim() === '' && !current) return
      emitText(text, marks)
      return
    }
    if (node.type === 'comment') return
    if (node.type !== 'tag') return

    const tag = (node.tagName || node.name || '').toLowerCase()
    const kids = node.children ?? []

    if (tag === 'br') {
      current = null
      return
    }
    if (DROPPED.has(tag)) {
      drop(tag, node)
      return
    }
    if (tag === 'a') {
      const href = $(node).attr('href') ?? ''
      if (!href || !SAFE_HREF.test(href)) {
        drop(`a[unsafe-href:${href.slice(0, 30)}]`, node)
        kids.forEach((c) => walk(c, marks, listCtx))
        return
      }
      ensure()
      const markKey = makeKey()
      current.markDefs.push({_type: 'link', _key: markKey, href, blank: true})
      kids.forEach((c) => walk(c, [...marks, markKey], listCtx))
      return
    }
    if (DECORATOR[tag]) {
      kids.forEach((c) => walk(c, [...marks, DECORATOR[tag]], listCtx))
      return
    }
    if (HEADING_STYLE[tag]) {
      startBlock(HEADING_STYLE[tag])
      kids.forEach((c) => walk(c, [], listCtx))
      current = null
      return
    }
    if (tag === 'blockquote') {
      const blockKids = kids.filter((k) => k.type === 'tag' && ['p', 'div'].includes((k.tagName || '').toLowerCase()))
      if (blockKids.length > 0) {
        for (const k of kids) {
          if (k.type === 'tag' && ['p', 'div'].includes((k.tagName || '').toLowerCase())) {
            startBlock('blockquote')
            ;(k.children ?? []).forEach((c) => walk(c, [], listCtx))
            current = null
          } else {
            startBlock('blockquote')
            walk(k, [], listCtx)
            current = null
          }
        }
      } else {
        startBlock('blockquote')
        kids.forEach((c) => walk(c, [], listCtx))
        current = null
      }
      return
    }
    if (tag === 'ul' || tag === 'ol') {
      const type = LIST_TYPE[tag]
      const level = Math.min((listCtx?.level ?? 0) + 1, 3)
      for (const li of kids) {
        if (li.type !== 'tag' || (li.tagName || '').toLowerCase() !== 'li') continue
        walkListItem(li, type, level)
      }
      return
    }
    if (tag === 'li') {
      // stray <li> with no ul/ol ancestor -- treat as a top-level bullet
      walkListItem(node, 'bullet', 1)
      return
    }
    if (tag === 'p') {
      startBlock('normal')
      kids.forEach((c) => walk(c, [], listCtx))
      current = null
      return
    }
    if (TRANSPARENT.has(tag)) {
      kids.forEach((c) => walk(c, marks, listCtx))
      return
    }
    // Unknown/unsupported tag: log it, but still recurse so we don't lose
    // whatever text is nested inside it.
    drop(tag, node)
    kids.forEach((c) => walk(c, marks, listCtx))
  }

  const root = $('body').length ? $('body')[0] : $.root()[0]
  ;(root?.children ?? []).forEach((c) => walk(c, [], null))
  current = null

  return blocks.filter((b) => b.listItem || (b.children ?? []).some((c) => c.text && c.text.trim() !== ''))
}
