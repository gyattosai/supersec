import type { CollectionConfig } from 'payload'

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const Terms: CollectionConfig = {
  slug: 'terms',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startDate', 'endDate', 'createdAt'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    // Hard deletion is permanently disabled across academic core collections (ADR 0004)
    delete: () => false,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Term Name',
      admin: {
        placeholder: 'e.g. 1st Sem AY 2026-2027',
      },
    },
    {
      name: 'startDate',
      type: 'text',
      required: true,
      label: 'Start Date (YYYY-MM-DD)',
      validate: (val: string | null | undefined) => {
        if (!val || typeof val !== 'string') return 'Start date is required'
        if (!DATE_REGEX.test(val)) return 'Start date must be in Asia/Manila YYYY-MM-DD format'
        return true
      },
    },
    {
      name: 'endDate',
      type: 'text',
      required: true,
      label: 'End Date (YYYY-MM-DD)',
      validate: (val: string | null | undefined, { siblingData }: { siblingData?: any } = {}) => {
        if (!val || typeof val !== 'string') return 'End date is required'
        if (!DATE_REGEX.test(val)) return 'End date must be in Asia/Manila YYYY-MM-DD format'
        if (siblingData?.startDate && val < siblingData.startDate) {
          return 'End date must be on or after start date'
        }
        return true
      },
    },
  ],
}
