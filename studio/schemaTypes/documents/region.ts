import {defineType} from 'sanity'
import {EarthGlobeIcon} from '@sanity/icons'

/**
 * A regional section of the paper. One document per region:
 *   Africa · Eastern Europe & Central Asia · Indo-Asia-Pacific ·
 *   Latin America & The Caribbean · Southwest Asia & North Africa ·
 *   Western Europe & Canada
 *
 * A region's `slug` is a top-level URL segment: /africa, /africa/<article-slug>.
 */
export default defineType({
  name: 'region',
  title: 'Region',
  type: 'document',
  icon: EarthGlobeIcon,
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
      validation: (rule) => rule.required(),
    },
    {
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      description: 'Optional condensed label for nav / map (e.g. "SWANA").',
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences shown at the top of the region page.',
    },
    {
      name: 'order',
      title: 'Nav order',
      type: 'number',
      description: 'Lower numbers appear first in menus and the region index.',
      initialValue: 100,
    },
    {
      name: 'mapId',
      title: 'Map key',
      type: 'string',
      description:
        'Stable identifier the interactive map component uses to link a shape to this region. Do not change once set.',
    },
    {
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Alt text'}],
    },
  ],
  orderings: [
    {title: 'Nav order', name: 'order', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', subtitle: 'slug.current'},
  },
})
