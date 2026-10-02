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
    client.fetch('*[_type=="article"]{_id,"slug":slug.current,"primarySectionRef":primarySection._ref}'),
  ])

  // Slugs only need to be unique *within* a primarySection (matches the
  // site's own article-by-slug query) -- seed the taken-slug set per
  // section from what's already live so newly-generated slugs never
  // collide with a hand-authored article.
  const takenSlugsBySection = new Map()
  for (const a of articles) {
    if (!a.slug || !a.primarySectionRef) continue
    if (!takenSlugsBySection.has(a.primarySectionRef)) takenSlugsBySection.set(a.primarySectionRef, new Set())
    takenSlugsBySection.get(a.primarySectionRef).add(a.slug)
  }

  return {
    regionsBySlug: new Map(regions.filter((r) => r.slug).map((r) => [r.slug, r])),
    sectionsBySlug: new Map(sections.filter((s) => s.slug).map((s) => [s.slug, s])),
    authors,
    existingArticleIds: new Set(articles.map((a) => a._id)),
    takenSlugsBySection,
  }
}
