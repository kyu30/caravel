import imageUrlBuilder from '@sanity/image-url'
import {sanityClient} from './sanity'
import type {SanityImage} from './types'

const builder =
  sanityClient != null ? imageUrlBuilder(sanityClient) : null

interface ImageOpts {
  width?: number
  height?: number
  quality?: number
}

/**
 * Resolve an image source to a URL, working with both live Sanity assets and the
 * plain-string sources used by sample data. Returns `null` when there's nothing
 * to show so callers can branch.
 */
export function imageUrl(
  source: SanityImage | string | undefined | null,
  opts: ImageOpts = {},
): string | null {
  if (!source) return null

  if (typeof source === 'string') return source
  if (source.src) return source.src
  if (source.asset?.url && !builder) return source.asset.url

  if (builder && (source.asset?._ref || source.asset?.url)) {
    let img = builder.image(source as never).auto('format').fit('max')
    if (opts.width) img = img.width(opts.width)
    if (opts.height) img = img.height(opts.height)
    img = img.quality(opts.quality ?? 75)
    return img.url()
  }

  return null
}

export function imageAlt(
  source: SanityImage | string | undefined | null,
  fallback = '',
): string {
  if (!source || typeof source === 'string') return fallback
  return source.alt ?? fallback
}
