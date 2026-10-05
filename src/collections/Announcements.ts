import type { CollectionConfig } from 'payload'
import { slugifyPostTitle } from '@/lib/posts/lifecycle'

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'priority', 'publishedAt', 'updatedAt'],
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
      name: 'body',
      type: 'richText',
    },
    {
      name: 'image',
      type: 'text',
      admin: {
        description: 'Cover image URL or upload ID',
      },
    },
    {
      name: 'priority',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'pinnedUntil',
      type: 'text',
      admin: {
        description: 'Pin end date (YYYY-MM-DD)',
      },
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
