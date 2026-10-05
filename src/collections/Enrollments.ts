import type { CollectionConfig } from 'payload'
import { DATE_REGEX } from './Terms'

export const Enrollments: CollectionConfig = {
  slug: 'enrollments',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'subject', 'status', 'enrolledOn', 'displayOrder'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    // Hard deletion is permanently disabled (ADR 0004)
    delete: () => false,
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      label: 'Student',
    },
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      label: 'Subject',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Dropped', value: 'dropped' },
      ],
      label: 'Enrollment Status',
    },
    {
      name: 'enrolledOn',
      type: 'text',
      required: true,
      label: 'Enrolled On Date (YYYY-MM-DD)',
      validate: (val: string | null | undefined) => {
        if (!val || typeof val !== 'string') return 'Enrolled date is required'
        if (!DATE_REGEX.test(val)) return 'Enrolled date must be in Asia/Manila YYYY-MM-DD format'
        return true
      },
    },
    {
      name: 'droppedOn',
      type: 'text',
      label: 'Dropped On Date (YYYY-MM-DD)',
      validate: (val: string | null | undefined, { siblingData }: { siblingData?: any } = {}) => {
        if (siblingData?.status === 'dropped' && !val) {
          return 'Dropped date is required when status is dropped'
        }
        if (val && !DATE_REGEX.test(val)) {
          return 'Dropped date must be in Asia/Manila YYYY-MM-DD format'
        }
        return true
      },
    },
    {
      name: 'conflictFlag',
      type: 'checkbox',
      defaultValue: false,
      label: 'Schedule Conflict (Private 🔒)',
    },
    {
      name: 'displayOrder',
      type: 'number',
      label: 'Original Paste Order (Rule R9)',
    },
    {
      name: 'legacyRowId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
}
