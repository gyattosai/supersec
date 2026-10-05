import type { CollectionConfig } from 'payload'

export interface MeetingSlot {
  weekday: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  start: string
  end: string
}

export function generateSubjectSlug(code: string): string {
  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const randomChars = Math.random().toString(36).substring(2, 6)
  return `${cleanCode}-${randomChars}`
}

export function validateMeetingSchedule(
  schedule: MeetingSlot[] | null | undefined,
): { isValid: boolean; error?: string } {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return { isValid: false, error: 'Schedule must contain at least 1 meeting slot' }
  }

  const seenWeekdays = new Set<string>()

  for (const slot of schedule) {
    if (seenWeekdays.has(slot.weekday)) {
      return {
        isValid: false,
        error: `Only 1 meeting per weekday is allowed (duplicate: ${slot.weekday})`,
      }
    }
    seenWeekdays.add(slot.weekday)

    if (!slot.start || !slot.end) {
      return { isValid: false, error: `Start and end times are required for ${slot.weekday}` }
    }

    if (slot.end <= slot.start) {
      return { isValid: false, error: `End time must be after start time for ${slot.weekday}` }
    }
  }

  return { isValid: true }
}

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'name', 'sectionMark', 'professor', 'slug', 'archivedAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    // Hard deletion permanently disabled (ADR 0004)
    delete: () => false,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data && !data.slug && data.code) {
          data.slug = generateSubjectSlug(data.code)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'term',
      type: 'relationship',
      relationTo: 'terms',
      required: true,
      label: 'Term',
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Subject Name',
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      label: 'Subject Code (e.g. OLCA113)',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Public Slug',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'professor',
      type: 'text',
      label: 'Professor Display Name',
    },
    {
      name: 'sectionMark',
      type: 'text',
      label: 'Section Short Mark (e.g. N001)',
    },
    {
      name: 'sectionFull',
      type: 'text',
      label: 'Section Full Name (e.g. OLCA113N001)',
    },
    {
      name: 'schedule',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Weekly Schedule Meetings',
      validate: (val: any) => {
        const result = validateMeetingSchedule(val)
        return result.isValid ? true : result.error || 'Invalid schedule'
      },
      fields: [
        {
          name: 'weekday',
          type: 'select',
          required: true,
          options: [
            { label: 'Monday', value: 'mon' },
            { label: 'Tuesday', value: 'tue' },
            { label: 'Wednesday', value: 'wed' },
            { label: 'Thursday', value: 'thu' },
            { label: 'Friday', value: 'fri' },
            { label: 'Saturday', value: 'sat' },
            { label: 'Sunday', value: 'sun' },
          ],
        },
        {
          name: 'start',
          type: 'text',
          required: true,
          label: 'Start Time (HH:mm)',
        },
        {
          name: 'end',
          type: 'text',
          required: true,
          label: 'End Time (HH:mm)',
        },
      ],
    },
    {
      name: 'room',
      type: 'text',
      label: 'Classroom / Building',
    },
    {
      name: 'zoomUrl',
      type: 'text',
      label: 'Virtual Meeting / Zoom URL',
    },
    {
      name: 'absenceLimit',
      type: 'number',
      label: 'Custom Absence Limit (empty = 20% rule)',
    },
    {
      name: 'archivedAt',
      type: 'date',
      label: 'Archived At (Soft Delete)',
    },
    {
      name: 'legacyRowId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'legacyId',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
}
