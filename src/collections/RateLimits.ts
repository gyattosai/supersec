import type { CollectionConfig } from 'payload'

export const RateLimits: CollectionConfig = {
  slug: 'rateLimits',
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['key', 'count', 'expiresAt'],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Rate Limit Key',
    },
    {
      name: 'count',
      type: 'number',
      required: true,
      defaultValue: 1,
      label: 'Request Count',
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true, // MongoDB TTL index target
      label: 'TTL Expiration Date',
    },
  ],
}
