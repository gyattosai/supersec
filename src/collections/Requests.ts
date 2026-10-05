import type { CollectionConfig } from 'payload'

export const Requests: CollectionConfig = {
  slug: 'requests',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'type', 'status', 'subject', 'session', 'createdAt'],
  },
  access: {
    // Unauthenticated public reads are strictly forbidden (ADR 0002)
    read: ({ req: { user } }) => Boolean(user),
    create: () => true, // Allowed for public submissions via API handler
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
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
      name: 'session',
      type: 'relationship',
      relationTo: 'sessions',
      required: true,
      label: 'Session',
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      label: 'Student',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'I was present', value: 'present' },
        { label: 'Excuse', value: 'excuse' },
        { label: 'I recited', value: 'recited' },
      ],
      label: 'Request Type',
    },
    {
      name: 'reason',
      type: 'textarea',
      label: 'Excuse Reason (Private 🔒)',
      validate: (val: string | null | undefined, { siblingData }: { siblingData?: any } = {}) => {
        if (siblingData?.type === 'excuse' && (!val || !val.trim())) {
          return 'An excuse reason is required for excuse requests'
        }
        return true
      },
    },
    {
      name: 'count',
      type: 'number',
      defaultValue: 1,
      min: 1,
      label: 'Recitations Delta (Rule R5)',
    },
    {
      name: 'topic',
      type: 'text',
      label: 'Recitation Topic',
    },
    {
      name: 'proofUrl',
      type: 'text',
      label: 'Proof Image URL (Private 🔒)',
    },
    {
      name: 'proofStorageId',
      type: 'text',
      label: 'Appwrite Storage File ID (Private 🔒)',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Declined', value: 'declined' },
        { label: 'Expired', value: 'expired' },
      ],
      label: 'Status',
    },
    {
      name: 'decidedAt',
      type: 'date',
      label: 'Decided At',
    },
    {
      name: 'decisionNote',
      type: 'text',
      label: 'Secretary Decision Note',
    },
  ],
}
