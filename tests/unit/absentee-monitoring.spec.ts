import { describe, expect, it } from 'vitest'
import {
  computeAbsenteeMonitoring,
  computeStudentMonitoring,
  type MonitoringEnrollment,
  type MonitoringSession,
} from '@/lib/stats/absentee-monitoring'

describe('Pure Absentee Monitoring Engine (Stage 2 - Ticket 05)', () => {
  describe('Edge cases', () => {
    it('handles 0 held sessions gracefully without dividing by zero', () => {
      const enrollments: MonitoringEnrollment[] = [
        {
          id: 'enr-1',
          studentId: 'stu-1',
          name: 'Balubar, Matthew',
          studentNumber: '2023-0001',
        },
      ]
      const sessions: MonitoringSession[] = []

      const result = computeAbsenteeMonitoring({
        enrollments,
        sessions,
        absenceLimit: 4,
      })

      expect(result.totalHeldClassSessions).toBe(0)
      expect(result.students.length).toBe(1)
      const stu = result.students[0]
      expect(stu.eligibleSessionsCount).toBe(0)
      expect(stu.attendanceRate).toBe(100)
      expect(stu.absentCount).toBe(0)
      expect(stu.consecutiveAbsences).toBe(0)
      expect(stu.isNoAttendance).toBe(false)
      expect(stu.isBelow50).toBe(false)
      expect(stu.isWatch).toBe(false)
      expect(stu.isAtRisk).toBe(false)
      expect(stu.isExceeded).toBe(false)
      expect(stu.hasStreak).toBe(false)
      expect(result.totalFlaggedCount).toBe(0)
    })

    it('calculates 100% attendance rate for students attending all sessions', () => {
      const enrollments: MonitoringEnrollment[] = [
        {
          id: 'enr-1',
          studentId: 'stu-1',
          name: 'Ramos, Ana',
        },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
        {
          id: 's-2',
          date: '2026-09-08',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
      ]

      const result = computeAbsenteeMonitoring({
        enrollments,
        sessions,
        absenceLimit: 4,
      })

      const stu = result.students[0]
      expect(stu.eligibleSessionsCount).toBe(2)
      expect(stu.presentCount).toBe(2)
      expect(stu.presentStarCount).toBe(2)
      expect(stu.attendanceRate).toBe(100)
      expect(stu.absentCount).toBe(0)
      expect(stu.primaryCategory).toBe('normal')
    })
  })

  describe('Rule R2: Streak calculation & Excused skipping', () => {
    it('Excused days inside an absence streak neither break nor extend the streak', () => {
      // Sessions: A (day 1), A (day 2), E (day 3), A (day 4) -> Streak = 3
      const enrollments: MonitoringEnrollment[] = [
        { id: 'enr-1', studentId: 'stu-1', name: 'Santos, Juan' },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-2',
          date: '2026-09-04',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-3',
          date: '2026-09-08',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'E' }],
        },
        {
          id: 's-4',
          date: '2026-09-11',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
      ]

      const stu = computeStudentMonitoring(enrollments[0], sessions, 4)
      expect(stu.absentCount).toBe(3)
      expect(stu.excusedCount).toBe(1)
      expect(stu.consecutiveAbsences).toBe(3)
      expect(stu.hasStreak).toBe(true)
    })

    it('Excused day at the very end does not break a preceding absence streak', () => {
      // Sessions: A, A, A, E -> Streak = 3
      const enrollments: MonitoringEnrollment[] = [
        { id: 'enr-1', studentId: 'stu-1', name: 'Cruz, Maria' },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-2',
          date: '2026-09-04',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-3',
          date: '2026-09-08',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-4',
          date: '2026-09-11',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'E' }],
        },
      ]

      const stu = computeStudentMonitoring(enrollments[0], sessions, 4)
      expect(stu.consecutiveAbsences).toBe(3)
      expect(stu.hasStreak).toBe(true)
    })

    it('A Present mark cleanly breaks an absence streak', () => {
      // Sessions: A, A, P, A -> Streak = 1
      const enrollments: MonitoringEnrollment[] = [
        { id: 'enr-1', studentId: 'stu-1', name: 'Lim, Pedro' },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-2',
          date: '2026-09-04',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
        {
          id: 's-3',
          date: '2026-09-08',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
        {
          id: 's-4',
          date: '2026-09-11',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
      ]

      const stu = computeStudentMonitoring(enrollments[0], sessions, 4)
      expect(stu.consecutiveAbsences).toBe(1)
      expect(stu.hasStreak).toBe(false)
    })
  })

  describe('Official Prelims Report Rules: Present* and Pre-Enrollment', () => {
    it('Present* includes both Excused (E) and Schedule Conflict (C) as present in rate', () => {
      const enrollments: MonitoringEnrollment[] = [
        { id: 'enr-1', studentId: 'stu-1', name: 'Alvarez, Carla' },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
        {
          id: 's-2',
          date: '2026-09-04',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'E' }],
        },
        {
          id: 's-3',
          date: '2026-09-08',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'C' }],
        },
      ]

      const stu = computeStudentMonitoring(enrollments[0], sessions, 4)
      expect(stu.eligibleSessionsCount).toBe(3)
      expect(stu.presentCount).toBe(1)
      expect(stu.excusedCount).toBe(1)
      expect(stu.conflictCount).toBe(1)
      expect(stu.presentStarCount).toBe(3) // 1 + 1 + 1
      expect(stu.attendanceRate).toBe(100) // 3 / 3 = 100%
      expect(stu.absentCount).toBe(0)
    })

    it('Pre-enrollment sessions are marked "—" and excluded from student denominator', () => {
      // Student enrolled on 2026-09-08
      const enrollments: MonitoringEnrollment[] = [
        {
          id: 'enr-1',
          studentId: 'stu-1',
          name: 'Late, Enrollee',
          enrolledOn: '2026-09-08',
        },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01', // Before enrolledOn
          kind: 'class',
          entries: [],
        },
        {
          id: 's-2',
          date: '2026-09-04', // Before enrolledOn
          kind: 'class',
          entries: [],
        },
        {
          id: 's-3',
          date: '2026-09-08', // On enrolledOn
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
        {
          id: 's-4',
          date: '2026-09-11', // After enrolledOn
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
      ]

      const stu = computeStudentMonitoring(enrollments[0], sessions, 4)
      expect(stu.sessionMarks['2026-09-01']).toBe('—')
      expect(stu.sessionMarks['2026-09-04']).toBe('—')
      expect(stu.sessionMarks['2026-09-08']).toBe('P')
      expect(stu.sessionMarks['2026-09-11']).toBe('P')
      expect(stu.eligibleSessionsCount).toBe(2)
      expect(stu.presentStarCount).toBe(2)
      expect(stu.attendanceRate).toBe(100)
    })

    it('No Class sessions are strictly excluded from calculations', () => {
      const enrollments: MonitoringEnrollment[] = [
        { id: 'enr-1', studentId: 'stu-1', name: 'Dela Cruz, Juan' },
      ]
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'P' }],
        },
        {
          id: 's-2',
          date: '2026-09-04',
          kind: 'noClass', // Suspension/Holiday
          entries: [],
        },
        {
          id: 's-3',
          date: '2026-09-08',
          kind: 'class',
          entries: [{ studentId: 'stu-1', attendance: 'A' }],
        },
      ]

      const stu = computeStudentMonitoring(enrollments[0], sessions, 4)
      expect(stu.eligibleSessionsCount).toBe(2)
      expect(stu.presentStarCount).toBe(1)
      expect(stu.absentCount).toBe(1)
      expect(stu.attendanceRate).toBe(50)
      expect(stu.sessionMarks['2026-09-04']).toBeUndefined()
    })
  })

  describe('Threshold Categories (Watch, At Risk, Exceeded, No Attendance, Below 50%)', () => {
    it('categorizes students accurately based on absenceLimit of 4', () => {
      const enrollments: MonitoringEnrollment[] = [
        { id: 'enr-watch', studentId: 'stu-watch', name: 'Watch Student' },
        { id: 'enr-risk', studentId: 'stu-risk', name: 'At Risk Student' },
        { id: 'enr-exceeded', studentId: 'stu-exceeded', name: 'Exceeded Student' },
        { id: 'enr-none', studentId: 'stu-none', name: 'Zero Attendance Student' },
      ]

      // 5 held sessions
      const sessions: MonitoringSession[] = [
        {
          id: 's-1',
          date: '2026-09-01',
          kind: 'class',
          entries: [
            { studentId: 'stu-watch', attendance: 'P' },
            { studentId: 'stu-risk', attendance: 'P' },
            { studentId: 'stu-exceeded', attendance: 'P' }, // stu-exceeded attended 1
            { studentId: 'stu-none', attendance: 'A' },
          ],
        },
        {
          id: 's-2',
          date: '2026-09-04',
          kind: 'class',
          entries: [
            { studentId: 'stu-watch', attendance: 'A' },
            { studentId: 'stu-risk', attendance: 'A' },
            { studentId: 'stu-exceeded', attendance: 'A' },
            { studentId: 'stu-none', attendance: 'A' },
          ],
        },
        {
          id: 's-3',
          date: '2026-09-08',
          kind: 'class',
          entries: [
            { studentId: 'stu-watch', attendance: 'A' }, // 2 absences -> Watch (50% of 4)
            { studentId: 'stu-risk', attendance: 'A' },
            { studentId: 'stu-exceeded', attendance: 'A' },
            { studentId: 'stu-none', attendance: 'A' },
          ],
        },
        {
          id: 's-4',
          date: '2026-09-11',
          kind: 'class',
          entries: [
            { studentId: 'stu-watch', attendance: 'P' },
            { studentId: 'stu-risk', attendance: 'A' }, // 3 absences -> At Risk (75% of 4)
            { studentId: 'stu-exceeded', attendance: 'A' },
            { studentId: 'stu-none', attendance: 'A' },
          ],
        },
        {
          id: 's-5',
          date: '2026-09-15',
          kind: 'class',
          entries: [
            { studentId: 'stu-watch', attendance: 'P' },
            { studentId: 'stu-risk', attendance: 'P' },
            { studentId: 'stu-exceeded', attendance: 'A' }, // 4 absences -> Exceeded (100% of 4)
            { studentId: 'stu-none', attendance: 'A' }, // 5 absences, 0 attended -> No Attendance
          ],
        },
      ]

      const result = computeAbsenteeMonitoring({
        enrollments,
        sessions,
        absenceLimit: 4,
      })

      const watchStu = result.students.find((s) => s.studentId === 'stu-watch')!
      expect(watchStu.absentCount).toBe(2)
      expect(watchStu.isWatch).toBe(true)
      expect(watchStu.isAtRisk).toBe(false)
      expect(watchStu.isExceeded).toBe(false)

      const riskStu = result.students.find((s) => s.studentId === 'stu-risk')!
      expect(riskStu.absentCount).toBe(3)
      expect(riskStu.isWatch).toBe(false)
      expect(riskStu.isAtRisk).toBe(true)
      expect(riskStu.isExceeded).toBe(false)

      const exceededStu = result.students.find((s) => s.studentId === 'stu-exceeded')!
      expect(exceededStu.absentCount).toBe(4)
      expect(exceededStu.isExceeded).toBe(true)

      const noneStu = result.students.find((s) => s.studentId === 'stu-none')!
      expect(noneStu.isNoAttendance).toBe(true)
      expect(noneStu.isBelow50).toBe(true)
      expect(noneStu.isExceeded).toBe(true)

      expect(result.watchCount).toBe(1)
      expect(result.atRiskCount).toBe(1)
      expect(result.exceededCount).toBe(2)
      expect(result.noAttendanceCount).toBe(1)
      expect(result.flaggedStudents.length).toBe(4)
    })
  })
})
