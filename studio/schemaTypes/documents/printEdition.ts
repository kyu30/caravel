import {defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons'

export default defineType({
  name: 'printEdition',
  title: 'Print Edition',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    {
      name: 'title',
      title: 'Issue name',
      type: 'string',
      description: 'e.g. "Fall 2026" or "Volume 12, Issue 2".',
      validation: (rule) => rule.required(),
    },
    {
      name: 'issueMonth',
      title: 'Issue year-month',
      type: 'string',
      description: 'Format: YYYY-MM, e.g. 2026-11. Used to sort editions newest-first.',
      validation: (rule) =>
        rule
          .required()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {name: 'YYYY-MM', invert: false}),
    },
    {
      name: 'coverImage',
      title: 'Cover image',
      description:
        'Auto-generated from the PDF\'s first page after upload -- leave blank and run the cover-generation script. Only set this by hand to override the auto-generated cover.',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Alt text'}],
    },
    {
      name: 'pdf',
      title: 'PDF',
      type: 'file',
      options: {accept: 'application/pdf'},
      validation: (rule) => rule.required(),
    },
  ],
  orderings: [
    {title: 'Issue month, newest first', name: 'issueMonthDesc', by: [{field: 'issueMonth', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'issueMonth', media: 'coverImage'},
  },
})
