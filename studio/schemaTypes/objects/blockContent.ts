import {defineType, defineArrayMember} from 'sanity'

/**
 * The rich-text ("Portable Text") field used for article bodies and author bios.
 * Keep the option set intentionally small so the paper reads consistently —
 * editors get headings, quotes, lists, links, and inline images. Nothing else.
 */
export default defineType({
  title: 'Rich text',
  name: 'blockContent',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Paragraph', value: 'normal'},
        {title: 'Heading', value: 'h2'},
        {title: 'Subheading', value: 'h3'},
        {title: 'Small heading', value: 'h4'},
        {title: 'Pull quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Italic', value: 'em'},
          {title: 'Underline', value: 'underline'},
        ],
        annotations: [
          {
            title: 'Link',
            name: 'link',
            type: 'object',
            fields: [
              {
                title: 'URL',
                name: 'href',
                type: 'url',
                validation: (rule) =>
                  rule
                    .required()
                    .uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
              },
              {
                title: 'Open in new tab',
                name: 'blank',
                type: 'boolean',
                initialValue: true,
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: {hotspot: true},
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          description: 'Describe the image for screen readers and search engines.',
          validation: (rule) => rule.required(),
        },
        {name: 'caption', type: 'string', title: 'Caption'},
        {name: 'credit', type: 'string', title: 'Credit / source'},
      ],
    }),
  ],
})
