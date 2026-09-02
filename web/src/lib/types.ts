/**
 * Hand-written types for the shapes the GROQ queries return. These are not the
 * raw document schema — they're the projected, resolved views the front end uses.
 * When the schema stabilises, replace these with generated types via
 * `sanity typegen` in the studio workspace.
 */

export interface SanityImage {
  // Either a real Sanity asset reference (live data) …
  asset?: {_ref?: string; _type?: string; url?: string}
  hotspot?: {x: number; y: number}
  crop?: {top: number; bottom: number; left: number; right: number}
  alt?: string
  caption?: string
  credit?: string
  // … or a plain URL string source (sample data).
  src?: string
}

export interface AuthorRef {
  _id: string
  name: string
  slug: string
  role?: string
}

export interface Author extends AuthorRef {
  staffGroup?: string
  bio?: PortableBlock[]
  headshot?: SanityImage
  socialLinks?: {platform: string; url: string}[]
  active?: boolean
}

export interface Taxonomy {
  _id: string
  _type: 'region' | 'section'
  name: string
  slug: string
  shortName?: string
  description?: string
  order?: number
  /** sections only */
  kind?: 'editorial' | 'compass'
  /** regions only */
  mapId?: string
}

export interface ArticleCardData {
  _id: string
  title: string
  slug: string
  url: string
  subtitle?: string
  excerpt?: string
  publishDate: string
  featured?: boolean
  heroImage?: SanityImage
  authors: AuthorRef[]
  primarySection: Pick<Taxonomy, '_id' | '_type' | 'name' | 'slug'>
  regions?: Pick<Taxonomy, '_id' | 'name' | 'slug'>[]
  compassTopics?: Pick<Taxonomy, '_id' | 'name' | 'slug'>[]
}

export interface Article extends ArticleCardData {
  body?: PortableBlock[]
}

// --- Portable Text (loose — enough for our renderer) ------------------------
export interface PortableSpan {
  _type: 'span'
  _key: string
  text: string
  marks?: string[]
}
export interface PortableBlock {
  _type: string
  _key: string
  style?: string
  listItem?: 'bullet' | 'number'
  level?: number
  children?: PortableSpan[]
  markDefs?: {_key: string; _type: string; href?: string; blank?: boolean}[]
  // image block
  asset?: SanityImage['asset']
  alt?: string
  caption?: string
  credit?: string
}
