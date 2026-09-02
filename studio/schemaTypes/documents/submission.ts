import {defineType} from 'sanity'
import {InboxIcon} from '@sanity/icons'

/**
 * The editorial intake queue. NOT public-facing — nothing on the website reads
 * this type. It replaces the "incoming pitches" spreadsheet: one row per piece a
 * writer has submitted via the Google Form (see /docs/GOOGLE_FORM.md).
 *
 * Writers never touch Sanity. An editor reads the linked Google Doc, then builds
 * an `article` document by hand and sets this submission to "published", linking
 * the two.
 */
export default defineType({
  name: 'submission',
  title: 'Submission',
  type: 'document',
  icon: InboxIcon,
  fields: [
    {
      name: 'writerName',
      title: 'Writer name',
      type: 'string',
      validation: (rule) => rule.required(),
    },
    {
      name: 'writerEmail',
      title: 'Writer email',
      type: 'string',
      validation: (rule) => rule.required().email(),
    },
    {
      name: 'googleDocLink',
      title: 'Google Doc link',
      type: 'url',
      description: 'Draft should be shared as "anyone with the link can comment".',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    },
    {
      name: 'suggestedTitle',
      title: 'Suggested title',
      type: 'string',
    },
    {
      name: 'suggestedRegion',
      title: 'Suggested region',
      type: 'string',
      description: 'Free text as typed by the writer on the form.',
    },
    {
      name: 'suggestedSection',
      title: 'Suggested section / Compass topic',
      type: 'string',
      description: 'Free text as typed by the writer on the form.',
    },
    {
      name: 'pitch',
      title: 'Pitch / summary',
      type: 'text',
      rows: 4,
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Pending', value: 'pending'},
          {title: 'In review', value: 'in-review'},
          {title: 'Published', value: 'published'},
          {title: 'Rejected', value: 'rejected'},
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
      validation: (rule) => rule.required(),
    },
    {
      name: 'submittedAt',
      title: 'Submitted',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    },
    {
      name: 'assignedEditor',
      title: 'Assigned editor',
      type: 'string',
    },
    {
      name: 'editorNotes',
      title: 'Editor notes',
      type: 'text',
      rows: 4,
    },
    {
      name: 'linkedArticle',
      title: 'Published as',
      type: 'reference',
      to: [{type: 'article'}],
      description: 'Link to the article once it has been built and published.',
    },
  ],
  orderings: [
    {
      title: 'Submitted, newest',
      name: 'submittedAtDesc',
      by: [{field: 'submittedAt', direction: 'desc'}],
    },
    {
      title: 'Status',
      name: 'status',
      by: [
        {field: 'status', direction: 'asc'},
        {field: 'submittedAt', direction: 'desc'},
      ],
    },
  ],
  preview: {
    select: {name: 'writerName', title: 'suggestedTitle', status: 'status', date: 'submittedAt'},
    prepare: ({name, title, status, date}) => {
      const d = date ? new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : ''
      return {
        title: title || `(untitled) — ${name}`,
        subtitle: `${status?.toUpperCase() ?? 'PENDING'} · ${name} · ${d}`,
      }
    },
  },
})
