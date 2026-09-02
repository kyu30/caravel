import {defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'placement', title: 'Placement & tags'},
    {name: 'meta', title: 'Publishing'},
  ],
  fields: [
    {
      name: 'title',
      title: 'Headline',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required().max(160),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      description: 'The URL is /<primary-section-slug>/<this>.',
      validation: (rule) => rule.required(),
    },
    {
      name: 'subtitle',
      title: 'Standfirst / deck',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'The line shown under the headline.',
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
      description:
        'Short summary for article cards, search results, and social/SEO previews. Falls back to the standfirst if left blank.',
      validation: (rule) => rule.max(320),
    },
    {
      name: 'authors',
      title: 'Author(s)',
      type: 'array',
      group: 'content',
      of: [{type: 'reference', to: [{type: 'author'}]}],
      validation: (rule) => rule.required().min(1).unique(),
    },
    {
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          validation: (rule) => rule.required(),
        },
        {name: 'caption', type: 'string', title: 'Caption'},
        {name: 'credit', type: 'string', title: 'Credit / source'},
      ],
    },
    {
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      group: 'content',
    },

    // --- Placement & tags -------------------------------------------------
    {
      name: 'primarySection',
      title: 'Primary section',
      type: 'reference',
      group: 'placement',
      to: [{type: 'region'}, {type: 'section'}],
      description:
        "The article's canonical home. This is the URL segment: pick a region, an editorial section, or a Compass vertical.",
      validation: (rule) => rule.required(),
    },
    {
      name: 'regions',
      title: 'Regions',
      type: 'array',
      group: 'placement',
      of: [{type: 'reference', to: [{type: 'region'}]}],
      description:
        'Every regional section this piece should appear under. Include the primary section here too if it is a region.',
      validation: (rule) => rule.unique(),
    },
    {
      name: 'compassTopics',
      title: 'Compass topics',
      type: 'array',
      group: 'placement',
      of: [
        {
          type: 'reference',
          to: [{type: 'section'}],
          options: {filter: 'kind == "compass"'},
        },
      ],
      description: 'Compass verticals this piece belongs to (optional, cross-cuts regions).',
      validation: (rule) => rule.unique(),
    },
    {
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'placement',
      description: 'Eligible for the homepage lead / featured rail.',
      initialValue: false,
    },

    // --- Publishing -----------------------------------------------------------
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'Published', value: 'published'},
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (rule) => rule.required(),
    },
    {
      name: 'publishDate',
      title: 'Publish date',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      description: 'Used for ordering and the dateline. The site hides articles dated in the future.',
      validation: (rule) => rule.required(),
    },
  ],
  orderings: [
    {
      title: 'Publish date, newest',
      name: 'publishDateDesc',
      by: [{field: 'publishDate', direction: 'desc'}],
    },
    {
      title: 'Headline A–Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      date: 'publishDate',
      section: 'primarySection.name',
      media: 'heroImage',
    },
    prepare: ({title, status, date, section, media}) => {
      const d = date ? new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'no date'
      const flag = status === 'published' ? '●' : '○'
      return {title, subtitle: `${flag} ${section ?? 'unfiled'} · ${d}`, media}
    },
  },
})
