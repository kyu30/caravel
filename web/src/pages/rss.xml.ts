import rss from '@astrojs/rss'
import type {APIContext} from 'astro'
import {getLatestArticles} from '../lib/queries'
import {SITE} from '../lib/site.js'

export async function GET(context: APIContext) {
  const articles = await getLatestArticles(30)
  return rss({
    title: SITE.name,
    description: SITE.tagline,
    site: context.site ?? SITE.url,
    items: articles.map((a) => ({
      title: a.title,
      description: a.excerpt ?? a.subtitle ?? '',
      link: a.url,
      pubDate: new Date(a.publishDate),
      categories: [
        a.primarySection?.name,
        ...(a.compassTopics ?? []).map((c) => c.name),
      ].filter(Boolean) as string[],
      author: a.authors.map((au) => au.name).join(', '),
    })),
  })
}
