import {defineType} from 'sanity'

export default defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  fields: [
    {
      name: 'platform',
      title: 'Platform',
      type: 'string',
      options: {
        list: [
          {title: 'X / Twitter', value: 'twitter'},
          {title: 'Bluesky', value: 'bluesky'},
          {title: 'Instagram', value: 'instagram'},
          {title: 'LinkedIn', value: 'linkedin'},
          {title: 'Mastodon', value: 'mastodon'},
          {title: 'Facebook', value: 'facebook'},
          {title: 'Personal website', value: 'website'},
          {title: 'Email', value: 'email'},
        ],
      },
      validation: (rule) => rule.required(),
    },
    {
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Full URL (for email use a mailto: link).',
      validation: (rule) =>
        rule.required().uri({scheme: ['http', 'https', 'mailto']}),
    },
  ],
  preview: {
    select: {title: 'platform', subtitle: 'url'},
  },
})
