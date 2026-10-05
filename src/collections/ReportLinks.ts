import type { CollectionConfig } from 'payload'

export const ReportLinks: CollectionConfig = {
  slug: 'reportLinks',
  admin: {
    useAsTitle: 'token',
    defaultColumns: ['subject', 'token', 'revokedAt', 'createdAt'],
  },
  access: {
    // Unauthenticated reads forbidden; report projections must use local API seam with token validation (ADR 0002)
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    // Hard deletion ban (ADR 0004)
    delete: () => false,
  },
  fields: [
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      label: 'Subject',
    },
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Access Token',
    },
    {
      name: 'revokedAt',
      type: 'date',
      label: 'Revoked At Timestamp',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Created By Secretary',
    },
  ],
}
