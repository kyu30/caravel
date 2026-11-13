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
      name: 'issueDate',
      title: 'Issue date',
      type: 'date',
      description: 'Used to sort editions newest-first.',
      validation: (rule) => rule.required(),
    },
    {
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Alt text'}],
      validation: (rule) => rule.required(),
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
    {title: 'Issue date, newest first', name: 'issueDateDesc', by: [{field: 'issueDate', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'issueDate', media: 'coverImage'},
  },
})
