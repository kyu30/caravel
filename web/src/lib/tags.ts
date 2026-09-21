/**
 * Freeform article tags are stored as plain display text (e.g. "Trade War"),
 * not pre-slugified in Sanity — this is the single place that turns tag text
 * into its URL slug, used both when linking to a tag from an article and when
 * matching a tag page's route param back to the articles that carry it.
 */
export function slugifyTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
