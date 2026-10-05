import type { CollectionConfig } from 'payload'
import { DATE_REGEX } from './Terms'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['subject', 'date', 'kind', 'phase', '_status', 'updatedAt'],
  },
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 0,
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
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      label: 'Subject',
      index: true,
    },
    {
      name: 'date',
      type: 'text',
      required: true,
      label: 'Class Day (YYYY-MM-DD)',
      index: true,
      validate: (val: string | null | undefined) => {
        if (!val || typeof val !== 'string') return 'Date is required'
        if (!DATE_REGEX.test(val)) return 'Date must be in Asia/Manila YYYY-MM-DD format'
        return true
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'class',
      options: [
        { label: 'Class Session', value: 'class' },
        { label: 'No Class', value: 'noClass' },
      ],
      label: 'Session Kind',
    },
    {
      name: 'phase',
      type: 'select',
      defaultValue: 'live',
      options: [
        { label: 'Live', value: 'live' },
        { label: 'Finished', value: 'finished' },
      ],
      label: 'Session Phase',
    },
    {
      name: 'noClassReason',
      type: 'text',
      label: 'No Class Reason (e.g. Holiday, Suspension)',
      validate: (val: string | null | undefined, { siblingData }: { siblingData?: any } = {}) => {
        if (siblingData?.kind === 'noClass' && (!val || !val.trim())) {
          return 'A reason is required when marking No Class'
        }
        return true
      },
    },
    {
      name: 'entries',
      type: 'array',
      label: 'Roll Call Entries',
      fields: [
        {
          name: 'student',
          type: 'relationship',
          relationTo: 'students',
          required: true,
          label: 'Student',
        },
        {
          name: 'attendance',
          type: 'select',
          options: [
            { label: 'Present (P)', value: 'P' },
            { label: 'Absent (A)', value: 'A' },
            { label: 'Excused (E)', value: 'E' },
          ],
          label: 'Attendance',
        },
        {
          name: 'recitations',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Recitations',
        },
        {
          name: 'recitationTopic',
          type: 'text',
          label: 'Recitation Topic',
        },
      ],
    },
    {
      name: 'changeNote',
      type: 'text',
      label: 'Public Change Note (Required at Publish)',
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
