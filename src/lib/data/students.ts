import type { Payload } from 'payload'
import { DATE_REGEX } from '@/collections/Terms'

export interface ParsedName {
  lastName: string
  firstName: string
  middleName: string
}

export interface RosterStudent {
  id: string
  enrollmentId: string
  lastName: string
  firstName: string
  middleName?: string
  studentNumber?: string
  displayOrder: number
  status: 'active' | 'dropped'
  conflictFlag?: boolean
  enrolledOn?: string
  droppedOn?: string
}

export function parseStudentName(nameStr: string): ParsedName {
  const clean = nameStr.trim().replace(/^\d+[\.\)]\s*/, '') // strip leading numbers like "1. " or "1) "

  if (clean.includes(',')) {
    // Format: "LASTNAME, FIRSTNAME M."
    const parts = clean.split(',').map((p) => p.trim())
    const lastName = parts[0]
    const rest = parts.slice(1).join(',').trim()

    // Check if rest ends with middle initial like "Juan M." or "Juan M"
    const restParts = rest.split(/\s+/)
    if (restParts.length > 1 && restParts[restParts.length - 1].length <= 2) {
      const middleName = restParts.pop()!
      const firstName = restParts.join(' ')
      return { lastName, firstName, middleName }
    }

    return { lastName, firstName: rest, middleName: '' }
  }

  // Format: "Firstname [Middlename] Lastname"
  const parts = clean.split(/\s+/)
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: '', middleName: '' }
  }

  const lastName = parts.pop()!
  const firstName = parts.join(' ')
  return { lastName, firstName, middleName: '' }
}

export function parseRosterText(rawText: string): ParsedName[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map(parseStudentName)
}

export function getRoster(
  students: RosterStudent[],
  sortBy: 'original' | 'alphabetical' = 'original',
): RosterStudent[] {
  return [...students].sort(
    sortBy === 'alphabetical'
      ? (a, b) =>
          a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' }) ||
          a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' })
      : (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
  )
}

export async function pasteRoster(
  payload: Payload,
  data: {
    subjectId: string
    rawText: string
    enrolledOn: string
  },
): Promise<{ enrolledCount: number; studentIds: string[] }> {
  const names = parseRosterText(data.rawText)
  if (names.length === 0) {
    return { enrolledCount: 0, studentIds: [] }
  }

  const studentIds: string[] = []

  for (let i = 0; i < names.length; i++) {
    const item = names[i]
    const displayOrder = i + 1 // Rule R9: 1-indexed sequential integer

    // Create student record
    const student = await payload.create({
      collection: 'students',
      data: {
        lastName: item.lastName,
        firstName: item.firstName,
        middleName: item.middleName || undefined,
      },
      overrideAccess: true,
    })

    const studentId = student.id

    // Create enrollment record
    await payload.create({
      collection: 'enrollments',
      data: {
        student: studentId,
        subject: data.subjectId,
        status: 'active',
        enrolledOn: data.enrolledOn,
        displayOrder,
      },
      overrideAccess: true,
    })

    studentIds.push(studentId)
  }

  return {
    enrolledCount: studentIds.length,
    studentIds,
  }
}

export async function bulkEnrollStudents(
  payload: Payload,
  data: {
    subjectId: string
    students: Array<{
      lastName: string
      firstName: string
      middleName?: string
      studentNumber?: string
    }>
    enrolledOn: string
  },
): Promise<{ enrolledCount: number; studentIds: string[] }> {
  if (!data.students || data.students.length === 0) {
    return { enrolledCount: 0, studentIds: [] }
  }

  // Count existing enrollments for proper displayOrder (Rule R9)
  const existing = await payload.count({
    collection: 'enrollments',
    where: { subject: { equals: data.subjectId } },
    overrideAccess: true,
  })

  let startOrder = existing.totalDocs || 0
  const studentIds: string[] = []

  for (const item of data.students) {
    startOrder++

    const student = await payload.create({
      collection: 'students',
      data: {
        lastName: item.lastName,
        firstName: item.firstName,
        middleName: item.middleName || undefined,
        studentNumber: item.studentNumber || undefined,
      },
      overrideAccess: true,
    })

    const studentId = student.id

    await payload.create({
      collection: 'enrollments',
      data: {
        student: studentId,
        subject: data.subjectId,
        status: 'active',
        enrolledOn: data.enrolledOn,
        displayOrder: startOrder,
      },
      overrideAccess: true,
    })

    studentIds.push(studentId)
  }

  return {
    enrolledCount: studentIds.length,
    studentIds,
  }
}

export function getActiveEnrollments(
  students: RosterStudent[],
  targetDate: string,
): RosterStudent[] {
  return students.filter((s) => {
    // Student must be enrolled on or before the target date
    if (s.enrolledOn && s.enrolledOn > targetDate) {
      return false
    }

    // Student must be active, or if dropped, the drop date must be on or after the target date
    if (s.status === 'dropped') {
      return Boolean(s.droppedOn && s.droppedOn >= targetDate)
    }

    return s.status === 'active'
  })
}

export async function dropStudent(
  payload: Payload,
  enrollmentId: string,
  droppedOn: string,
): Promise<any> {
  if (!droppedOn || !DATE_REGEX.test(droppedOn)) {
    throw new Error('Dropped date must be in YYYY-MM-DD format')
  }

  const result = await payload.update({
    collection: 'enrollments',
    id: enrollmentId,
    data: {
      status: 'dropped',
      droppedOn,
    },
    overrideAccess: true,
  })

  return result
}

export async function setConflictFlag(
  payload: Payload,
  enrollmentId: string,
  flag: boolean,
): Promise<any> {
  const result = await payload.update({
    collection: 'enrollments',
    id: enrollmentId,
    data: {
      conflictFlag: flag,
    },
    overrideAccess: true,
  })

  return result
}

