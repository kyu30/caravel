import {defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

/**
 * A non-regional section or a Compass topic vertical.
 *
 *   kind: "editorial" → Opinion & Satire, Crow's Nest, Travel
 *   kind: "compass"   → World, Elections, Gender, Coin, Futures, Planet
 *
 * Like regions, a section's `slug` is a top-level URL segment:
 * /opinion-satire, /elections, /elections/<article-slug>.
 *
 * "Latest" (the all-articles feed) is NOT a section document — it's the
 * hard-coded /latest route on the site.
 */

// Slugs the front end already owns as routes. A section may not claim these.
const RESERVED_SLUGS = [
  'about',
  'staff',
  'masthead',
  'bunn-award-winners',
  'join',
  'contact',
  'ethics-policy',
  'authors',
  'regions',
  'compass',
  'search',
  'latest',
  'archive',
  'api',
  'rss.xml',
  'sitemap.xml',
]

export default defineType({
  name: 'section',
  title: 'Section',
  type: 'document',
  icon: TagIcon,
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 60},
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (slug?.current && RESERVED_SLUGS.includes(slug.current)) {
            return `"${slug.current}" is a reserved route and can't be used as a section slug.`
          }
          return true
        }),
    },
    {
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          {title: 'Editorial section', value: 'editorial'},
          {title: 'Compass topic vertical', value: 'compass'},
        ],
        layout: 'radio',
      },
      initialValue: 'editorial',
      validation: (rule) => rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    },
    {
      name: 'order',
      title: 'Nav order',
      type: 'number',
      initialValue: 100,
    },
  ],
  orderings: [
    {title: 'Nav order', name: 'order', by: [{field: 'order', direction: 'asc'}]},
    {title: 'Kind', name: 'kind', by: [{field: 'kind', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', kind: 'kind', slug: 'slug.current'},
    prepare: ({title, kind, slug}) => ({
      title,
      subtitle: `${kind === 'compass' ? 'Compass' : 'Editorial'} · /${slug ?? ''}`,
    }),
  },
})
