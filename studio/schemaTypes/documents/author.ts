import {defineType} from 'sanity'
import {UserIcon} from '@sanity/icons'

export default defineType({
  name: 'author',
  title: 'Author / Staff',
  type: 'document',
  icon: UserIcon,
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
      name: 'role',
      title: 'Role / title',
      type: 'string',
      description: 'e.g. "Editor-in-Chief", "Managing Editor", "Staff Writer".',
    },
    {
      name: 'staffGroup',
      title: 'Staff group',
      type: 'string',
      description: 'Controls which staff/board page this person is listed on.',
      options: {
        list: [
          {title: 'Editorial Board', value: 'editorial-board'},
          {title: 'Masthead', value: 'masthead'},
          {title: 'Section Editors', value: 'section-editors'},
          {title: 'Staff Writers', value: 'staff-writers'},
          {title: 'Contributors', value: 'contributors'},
          {title: 'Alumni / Former Staff', value: 'alumni'},
        ],
      },
    },
    {
      name: 'bio',
      title: 'Bio',
      type: 'blockContent',
    },
    {
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Alt text'}],
    },
    {
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [{type: 'socialLink'}],
    },
    {
      name: 'active',
      title: 'Active staff member',
      type: 'boolean',
      description:
        'Off = former staff. Their byline and profile stay live; staff pages can show them separately.',
      initialValue: true,
    },
  ],
  orderings: [
    {title: 'Name', name: 'name', by: [{field: 'name', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', subtitle: 'role', media: 'headshot'},
  },
})
