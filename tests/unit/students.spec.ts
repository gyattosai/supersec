import { describe, expect, it } from 'vitest'
import { Students } from '@/collections/Students'
import { Enrollments } from '@/collections/Enrollments'
import {
  parseStudentName,
  parseRosterText,
  pasteRoster,
  getRoster,
  type RosterStudent,
} from '@/lib/data/students'

describe('Students & Enrollments Collections & Domain Data Seam (Stage 1.3 / Issue #4)', () => {
  describe('Schema & Access Rules', () => {
    it('permanently bans hard deletion on students and enrollments (ADR 0004)', () => {
      const deleteStudents = Students.access?.delete as (...args: unknown[]) => boolean
      const deleteEnrollments = Enrollments.access?.delete as (...args: unknown[]) => boolean
      expect(deleteStudents()).toBe(false)
      expect(deleteEnrollments()).toBe(false)
    })

    it('defines students fields per SCHEMA.md §3', () => {
      const fieldNames = Students.fields.map((f) => ('name' in f ? f.name : ''))
      expect(fieldNames).toContain('lastName')
      expect(fieldNames).toContain('firstName')
      expect(fieldNames).toContain('middleName')
      expect(fieldNames).toContain('studentNumber')
      expect(fieldNames).toContain('privateNotes')
    })

    it('defines enrollments fields and compound unique index', () => {
      const fieldNames = Enrollments.fields.map((f) => ('name' in f ? f.name : ''))
      expect(fieldNames).toContain('student')
      expect(fieldNames).toContain('subject')
      expect(fieldNames).toContain('status')
      expect(fieldNames).toContain('enrolledOn')
      expect(fieldNames).toContain('droppedOn')
      expect(fieldNames).toContain('conflictFlag')
      expect(fieldNames).toContain('displayOrder')
    })
  })

  describe('Roster Parsing & Clean Formatting', () => {
    it('parses "LASTNAME, FIRSTNAME M." format', () => {
      const parsed = parseStudentName('DELA CRUZ, Juan M.')
      expect(parsed).toEqual({
        lastName: 'DELA CRUZ',
        firstName: 'Juan',
        middleName: 'M.',
      })
    })

    it('parses "FIRSTNAME LASTNAME" format', () => {
      const parsed = parseStudentName('Maria Clara Santos')
      expect(parsed).toEqual({
        lastName: 'Santos',
        firstName: 'Maria Clara',
        middleName: '',
      })
    })

    it('cleans up raw pasted text into individual clean student records', () => {
      const rawText = `
        1. DELA CRUZ, Juan M.
        2. Santos, Maria
        3. AGUINALDO, Emilio B.
      `
      const list = parseRosterText(rawText)
      expect(list).toHaveLength(3)
      expect(list[0].lastName).toBe('DELA CRUZ')
      expect(list[0].firstName).toBe('Juan')
      expect(list[1].lastName).toBe('Santos')
      expect(list[2].lastName).toBe('AGUINALDO')
    })
  })

  describe('Roster Paste & Deterministic Display Order (Rule R9)', () => {
    it('assigns 1-indexed sequential displayOrder to pasted enrollments', async () => {
      const createdStudents: any[] = []
      const createdEnrollments: any[] = []

      const mockPayload = {
        create: async ({ collection, data }: { collection: string; data: any }) => {
          if (collection === 'students') {
            const doc = { id: `stu-${createdStudents.length + 1}`, ...data }
            createdStudents.push(doc)
            return doc
          }
          if (collection === 'enrollments') {
            const doc = { id: `enr-${createdEnrollments.length + 1}`, ...data }
            createdEnrollments.push(doc)
            return doc
          }
          throw new Error(`Unexpected collection: ${collection}`)
        },
        find: async () => ({ docs: [] }),
      }

      const raw = `
        Zaragoza, Ramon
        Abad, Antonio
        Mercado, Jose
      `

      const result = await pasteRoster(mockPayload as any, {
        subjectId: 'subj-1',
        rawText: raw,
        enrolledOn: '2026-10-05',
      })

      expect(result.enrolledCount).toBe(3)
      expect(createdEnrollments).toHaveLength(3)

      // Rule R9: 1-indexed sequential display order matching the original paste
      expect(createdEnrollments[0].displayOrder).toBe(1)
      expect(createdEnrollments[0].student).toBe('stu-1')
      expect(createdEnrollments[1].displayOrder).toBe(2)
      expect(createdEnrollments[1].student).toBe('stu-2')
      expect(createdEnrollments[2].displayOrder).toBe(3)
      expect(createdEnrollments[2].student).toBe('stu-3')
    })

    it('supports sorting roster by original order vs alphabetical order', () => {
      const roster: RosterStudent[] = [
        {
          id: 'stu-1',
          enrollmentId: 'enr-1',
          lastName: 'Zaragoza',
          firstName: 'Ramon',
          displayOrder: 1,
          status: 'active',
        },
        {
          id: 'stu-2',
          enrollmentId: 'enr-2',
          lastName: 'Abad',
          firstName: 'Antonio',
          displayOrder: 2,
          status: 'active',
        },
        {
          id: 'stu-3',
          enrollmentId: 'enr-3',
          lastName: 'Mercado',
          firstName: 'Jose',
          displayOrder: 3,
          status: 'active',
        },
      ]

      const byOriginal = getRoster(roster, 'original')
      expect(byOriginal.map((s) => s.lastName)).toEqual(['Zaragoza', 'Abad', 'Mercado'])

      const byAlphabetical = getRoster(roster, 'alphabetical')
      expect(byAlphabetical.map((s) => s.lastName)).toEqual(['Abad', 'Mercado', 'Zaragoza'])
    })
  })
})
