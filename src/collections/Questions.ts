import type { CollectionConfig } from 'payload'
import { slugifyPostTitle } from '@/lib/posts/lifecycle'

export const Questions: CollectionConfig = {
  slug: 'questions',
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'official', 'publishedAt', 'updatedAt'],
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
          if (!data.slug && data.question) {
            data.slug = slugifyPostTitle(data.question)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'question',
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
      name: 'answer',
      type: 'richText',
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Topic keywords (e.g. grading, schedule, project, exams)',
      },
    },
    {
      name: 'official',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Official badge: verified directly by the professor or school',
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
