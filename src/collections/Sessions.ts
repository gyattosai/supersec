import type { CollectionConfig } from 'payload'
import { DATE_REGEX } from './Terms'

export function validatePublishableSession(data: any): { isValid: boolean; error?: string } {
  if (data._status !== 'published') {
    return { isValid: true }
  }

  // Preserve historical v1 sessions with Not Set entries exactly as recorded
  if (data.legacyRowId || data.changeNote?.includes('Imported from supersec v1')) {
    return { isValid: true }
  }

  if (!data.changeNote || !data.changeNote.trim()) {
    return { isValid: false, error: 'A change note is required when publishing a session' }
  }

  if (data.kind === 'class') {
    const notSetCount = (data.entries || []).filter((e: any) => !e.attendance).length
    if (notSetCount > 0) {
      return {
        isValid: false,
        error: `Cannot publish session: ${notSetCount} student(s) still marked Not Set`,
      }
    }
  }

  return { isValid: true }
}

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
  hooks: {
    beforeChange: [
      ({ data }) => {
        const validation = validatePublishableSession(data)
        if (!validation.isValid) {
          throw new Error(validation.error)
        }
        return data
      },
    ],
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
            { label: 'With Schedule Conflict (C)', value: 'C' },
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
