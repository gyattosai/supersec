import { describe, expect, it } from 'vitest'
import { computeDashboardMetrics } from '@/lib/dashboard-helpers'

describe('Dashboard Live Metric Counters (Ticket 09)', () => {
  const subjects = [
    { id: 'subj-1', code: 'CS101', name: 'Intro CS', absenceLimit: 4 },
    { id: 'subj-2', code: 'MATH201', name: 'Calculus', absenceLimit: 3 },
  ]

  const enrollments = [
    // Subj 1: student-1 (normal), student-2 (exceeded)
    {
      id: 'enr-1',
      subject: 'subj-1',
      student: { id: 'stu-1', name: 'Alice Walker' },
      status: 'active',
      enrolledOn: '2026-09-01',
    },
    {
      id: 'enr-2',
      subject: 'subj-1',
      student: { id: 'stu-2', name: 'Bob Dylan' },
      status: 'active',
      enrolledOn: '2026-09-01',
    },
    // Subj 2: student-3 (at risk)
    {
      id: 'enr-3',
      subject: 'subj-2',
      student: { id: 'stu-3', name: 'Charlie Brown' },
      status: 'active',
      enrolledOn: '2026-09-01',
    },
  ]

  const sessions = [
    // Subj 1: 5 sessions. Alice absent 1 (normal). Bob absent 5 (exceeded).
    {
      id: 'sess-1',
      subject: 'subj-1',
      date: '2026-09-02',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-1', attendance: 'P' },
        { student: 'stu-2', attendance: 'A' },
      ],
    },
    {
      id: 'sess-2',
      subject: 'subj-1',
      date: '2026-09-05',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-1', attendance: 'P' },
        { student: 'stu-2', attendance: 'A' },
      ],
    },
    {
      id: 'sess-3',
      subject: 'subj-1',
      date: '2026-09-09',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-1', attendance: 'P' },
        { student: 'stu-2', attendance: 'A' },
      ],
    },
    {
      id: 'sess-4',
      subject: 'subj-1',
      date: '2026-09-12',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-1', attendance: 'P' },
        { student: 'stu-2', attendance: 'A' },
      ],
    },
    {
      id: 'sess-5',
      subject: 'subj-1',
      date: '2026-09-16',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-1', attendance: 'A' },
        { student: 'stu-2', attendance: 'A' },
      ],
    },
    // Subj 2: 3 sessions. Charlie absent 2 out of 3 limit (at risk).
    {
      id: 'sess-6',
      subject: 'subj-2',
      date: '2026-09-03',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-3', attendance: 'P' },
      ],
    },
    {
      id: 'sess-7',
      subject: 'subj-2',
      date: '2026-09-07',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-3', attendance: 'A' },
      ],
    },
    {
      id: 'sess-8',
      subject: 'subj-2',
      date: '2026-09-10',
      kind: 'class',
      _status: 'published',
      entries: [
        { student: 'stu-3', attendance: 'A' },
      ],
    },
  ]

  it('aggregates flagged students across subjects correctly', () => {
    const result = computeDashboardMetrics({
      subjects,
      enrollments,
      sessions,
    })

    // Subj 1 has 1 flagged student (Bob Dylan, exceeded)
    expect(result.subjectFlaggedCounts['subj-1']).toBe(1)
    // Subj 2 has 1 flagged student (Charlie Brown, at risk: 2/3 absences)
    expect(result.subjectFlaggedCounts['subj-2']).toBe(1)
    // Total flagged count across all subjects is 2
    expect(result.totalFlaggedCount).toBe(2)
  })

  it('handles empty subjects or sessions gracefully', () => {
    const result = computeDashboardMetrics({
      subjects: [],
      enrollments: [],
      sessions: [],
    })

    expect(result.totalFlaggedCount).toBe(0)
    expect(result.subjectFlaggedCounts).toEqual({})
  })
})
