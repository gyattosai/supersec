import type { CollectionConfig } from 'payload'
import { slugifyPostTitle } from '@/lib/posts/lifecycle'

export const Resources: CollectionConfig = {
  slug: 'resources',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', 'updatedAt'],
  },
  versions: {
    drafts: true,
    maxPerDoc: 0,
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data) {
          if (!data.slug && data.title) {
            data.slug = slugifyPostTitle(data.title)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'External link to Google Drive, slides, recording, or document',
      },
    },
    {
      name: 'category',
      type: 'text',
      admin: {
        description: 'Resource category (e.g. Syllabus, Lecture Notes, Problem Sets)',
      },
    },
    {
      name: 'attachments',
      type: 'array',
      maxRows: 6,
      admin: {
        description: 'Up to 6 file attachments or download links',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'fileUrl',
          type: 'text',
          required: true,
        },
        {
          name: 'size',
          type: 'text',
        },
      ],
    },
    {
      name: 'body',
      type: 'richText',
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
    {
      name: 'changeNote',
      type: 'text',
    },
    {
      name: 'archivedAt',
      type: 'date',
    },
    {
      name: 'subjects',
      type: 'relationship',
      relationTo: 'subjects',
      hasMany: true,
      required: true,
    },
  ],
}
