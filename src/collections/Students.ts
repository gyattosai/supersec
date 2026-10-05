import type { CollectionConfig } from 'payload'

export const Students: CollectionConfig = {
  slug: 'students',
  admin: {
    useAsTitle: 'lastName',
    defaultColumns: ['lastName', 'firstName', 'middleName', 'studentNumber', 'createdAt'],
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
      name: 'lastName',
      type: 'text',
      required: true,
      label: 'Last Name',
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
      label: 'First Name',
    },
    {
      name: 'middleName',
      type: 'text',
      label: 'Middle Name / Initial',
    },
    {
      name: 'studentNumber',
      type: 'text',
      label: 'Student Number / ID (Report-only 📋)',
    },
    {
      name: 'privateNotes',
      type: 'textarea',
      label: 'Private Note (Private 🔒)',
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
