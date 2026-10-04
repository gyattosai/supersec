import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'createdAt'],
  },
  auth: {
    tokenExpiration: 2592000, // 30 days per SCHEMA.md
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'owner',
      options: [
        { label: 'Owner (Secretary)', value: 'owner' },
        { label: 'Helper', value: 'helper' },
      ],
    },
  ],
  versions: false,
}
