/**
 * Auth: reuses the session's own `sanity login` via `sanity exec
 * --with-user-token` -- no separate write API token needed. Must be invoked
 * with `studio/` as the working directory (that's where sanity.cli.ts /
 * sanity.config.ts live). Deliberately does NOT set `perspective:
 * 'published'` (unlike web/src/lib/sanity.ts) -- the migration needs to see
 * existing drafts too, for collision detection.
 */
import {getCliClient} from 'sanity/cli'

export function makeClient() {
  return getCliClient({apiVersion: '2024-10-01'})
}

export async function loadContext(client) {
  const [regions, sections, authors, articles] = await Promise.all([
    client.fetch('*[_type=="region"]{_id,"slug":slug.current}'),
    client.fetch('*[_type=="section"]{_id,"slug":slug.current,kind}'),
    client.fetch('*[_type=="author"]{_id,name,"slug":slug.current}'),
    client.fetch('*[_type=="article"]{_id}'),
  ])
  return {
    regionsBySlug: new Map(regions.filter((r) => r.slug).map((r) => [r.slug, r])),
    sectionsBySlug: new Map(sections.filter((s) => s.slug).map((s) => [s.slug, s])),
    authors,
    existingArticleIds: new Set(articles.map((a) => a._id)),
  }
}
