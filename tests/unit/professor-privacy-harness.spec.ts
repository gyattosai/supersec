import { describe, expect, it } from 'vitest'
import { getProfessorReport } from '@/lib/data/reports'
import { generateProfessorCsv } from '@/lib/professor-csv'

describe('Professor Report Privacy Harness & Zero-Leak Guarantee (ADR 0002 & Ticket 08)', () => {
  it('guarantees that zero private excuse reasons, proofs, or internal notes leak to professor reports', async () => {
    const mockSubject = {
      id: 'subj-leak-test',
      code: 'OLCBSTM01',
      name: 'Strategic Management',
      section: 'OLCA113N001',
      internalNotes: 'TOP_SECRET_INTERNAL_NOTE_12345', // 🔒 Private
      absenceLimit: 4,
    }

    const mockStudents = [
      {
        id: 'stu-1',
        name: 'Santos, Maria',
        studentNumber: '2023-0001',
      },
    ]

    const mockEnrollments = [
      {
        id: 'enr-1',
        student: mockStudents[0],
        displayOrder: 1,
      },
    ]

    const mockSessions = [
      {
        id: 'sess-1',
        date: '2026-08-18',
        _status: 'published',
        kind: 'class',
        changeNote: 'Published Prelims roll call',
        entries: [
          {
            student: 'stu-1',
            attendance: 'E',
            excuseReason: 'VERY_PRIVATE_MEDICAL_DIAGNOSIS_99999', // 🔒 Private
            proofUrl: 'https://cloud.appwrite.io/v1/storage/buckets/proofs/files/SECRET_PROOF_IMG', // 🔒 Private
            proofStorageId: 'SECRET_STORAGE_ID_77777', // 🔒 Private
            recitations: 2,
          },
        ],
      },
    ]

    const mockPayload = {
      find: async ({ collection }: any) => {
        if (collection === 'reportLinks') {
          return {
            docs: [
              {
                id: 'link-1',
                token: 'valid-privacy-token',
                revokedAt: null,
                subject: 'subj-leak-test',
              },
            ],
          }
        }
        if (collection === 'subjects') return { docs: [mockSubject] }
        if (collection === 'sessions') return { docs: mockSessions }
        if (collection === 'enrollments') return { docs: mockEnrollments }
        return { docs: [] }
      },
    }

    const report = await getProfessorReport(mockPayload as any, 'valid-privacy-token')
    expect(report.status).toBe('active')
    if (report.status !== 'active') throw new Error('Expected active')

    const serializedReport = JSON.stringify(report)

    // Verify 🔒 Zero-Leak Guarantee
    expect(serializedReport).not.toContain('TOP_SECRET_INTERNAL_NOTE_12345')
    expect(serializedReport).not.toContain('VERY_PRIVATE_MEDICAL_DIAGNOSIS_99999')
    expect(serializedReport).not.toContain('SECRET_PROOF_IMG')
    expect(serializedReport).not.toContain('SECRET_STORAGE_ID_77777')
    expect(serializedReport).not.toContain('"excuseReason"')
    expect(serializedReport).not.toContain('"proofUrl"')
    expect(serializedReport).not.toContain('"proofStorageId"')
    expect(serializedReport).not.toContain('"internalNotes"')

    // Verify student is marked Excused (E) without exposing diagnosis
    expect(report.students[0].excusedCount).toBe(1)
    expect(report.students[0].sessionMarks['2026-08-18']).toBe('E')

    // Verify CSV export also has zero leak
    const csv = generateProfessorCsv({
      subjectCode: report.subject.code,
      heldSessionsCount: report.heldSessionsCount,
      sessionDates: report.heldSessionDates,
      students: report.students as any,
    })

    expect(csv).not.toContain('TOP_SECRET_INTERNAL_NOTE_12345')
    expect(csv).not.toContain('VERY_PRIVATE_MEDICAL_DIAGNOSIS_99999')
    expect(csv).not.toContain('SECRET_PROOF_IMG')
    expect(csv).not.toContain('SECRET_STORAGE_ID_77777')
  })
})
