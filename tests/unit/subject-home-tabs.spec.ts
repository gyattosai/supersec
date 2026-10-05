import { describe, expect, it } from 'vitest'
import {
  projectSubjectSessionsList,
  projectSubjectRosterList,
  projectSubjectRequestsList,
} from '@/lib/subjects/subject-home'

describe('Subject Home Sessions & Roster Tabs (Ticket 02)', () => {
  describe('Sessions Tab Projection', () => {
    it('sorts sessions by date descending and calculates attendance counts', () => {
      const rawSessions = [
        {
          id: 'sess-1',
          date: '2026-08-18',
          kind: 'class',
          title: 'Prelims Session 1',
          _status: 'published',
          version: 1,
          entries: [
            { student: 'stud-1', status: 'present' },
            { student: 'stud-2', status: 'absent' },
            { student: 'stud-3', status: 'excused' },
            { student: 'stud-4', status: 'conflict' },
          ],
        },
        {
          id: 'sess-2',
          date: '2026-08-25',
          kind: 'noClass',
          title: 'Suspension: Heavy Storm',
          noClassReason: 'Heavy Storm',
          _status: 'published',
          version: 1,
          entries: [],
        },
      ]

      const projected = projectSubjectSessionsList(rawSessions)

      expect(projected).toHaveLength(2)
      // Sorted date descending: sess-2 (Aug 25) then sess-1 (Aug 18)
      expect(projected[0].id).toBe('sess-2')
      expect(projected[0].kind).toBe('noClass')
      expect(projected[0].noClassReason).toBe('Heavy Storm')

      expect(projected[1].id).toBe('sess-1')
      expect(projected[1].kind).toBe('class')
      expect(projected[1].presentCount).toBe(3) // present + excused + conflict
      expect(projected[1].absentCount).toBe(1)
      expect(projected[1].totalEntries).toBe(4)
    })
  })

  describe('Roster Tab Projection', () => {
    it('formats enrolled students and highlights schedule conflicts', () => {
      const rawEnrollments = [
        {
          id: 'enr-1',
          student: {
            id: 'stud-1',
            name: 'Cariño, Dei',
            studentNumber: '2023-00123',
          },
          hasScheduleConflict: false,
          dropped: false,
          enrolledOn: '2026-08-15',
        },
        {
          id: 'enr-2',
          student: {
            id: 'stud-2',
            name: 'Chavez, Mika Ella',
            studentNumber: '2023-00456',
          },
          hasScheduleConflict: true,
          dropped: false,
          enrolledOn: '2026-08-15',
        },
      ]

      const projected = projectSubjectRosterList(rawEnrollments)

      expect(projected).toHaveLength(2)
      expect(projected[0].name).toBe('Cariño, Dei')
      expect(projected[0].hasScheduleConflict).toBe(false)
      expect(projected[0].studentNumber).toBe('2023-00123')

      expect(projected[1].name).toBe('Chavez, Mika Ella')
      expect(projected[1].hasScheduleConflict).toBe(true)
    })
  })

  describe('Requests Tab Projection', () => {
    it('formats requests and maps student name and session date', () => {
      const rawRequests = [
        {
          id: 'req-1',
          session: { id: 'sess-1', date: '2026-09-25' },
          student: { id: 'stud-1', name: 'Cariño, Dei', studentNumber: '2023-00123' },
          type: 'excuse',
          reason: 'Fever with med cert',
          proofUrl: 'data:image/webp;base64,xxxx',
          status: 'pending',
          createdAt: '2026-09-26T08:00:00.000Z',
        },
      ]

      const projected = projectSubjectRequestsList(rawRequests)
      expect(projected).toHaveLength(1)
      expect(projected[0].id).toBe('req-1')
      expect(projected[0].studentName).toBe('Cariño, Dei')
      expect(projected[0].sessionDate).toBe('2026-09-25')
      expect(projected[0].type).toBe('excuse')
      expect(projected[0].status).toBe('pending')
      expect(projected[0].proofUrl).toBe('data:image/webp;base64,xxxx')
    })
  })
})

