import { describe, it, expect } from 'vitest'
import { generateProfessorCsv, getFlagBadgeInfo } from '@/lib/professor-csv'

describe('Professor Report CSV & Helpers', () => {
  const mockStudents = [
    {
      id: 'stu-1',
      name: 'Alice Santos',
      studentNumber: '2023-0001',
      presentCount: 9,
      absentCount: 1,
      excusedCount: 0,
      attendancePercentage: 90,
      recitationsCount: 4,
      flag: 'none' as const,
      streak: 0,
    },
    {
      id: 'stu-2',
      name: 'Bob Reyes',
      studentNumber: '2023-0002',
      presentCount: 6,
      absentCount: 4,
      excusedCount: 0,
      attendancePercentage: 60,
      recitationsCount: 1,
      flag: 'exceeded' as const,
      streak: 3,
    },
  ]

  it('generates standard RFC-compliant CSV with header and student rows', () => {
    const csv = generateProfessorCsv({
      subjectCode: 'CS101',
      heldSessionsCount: 10,
      students: mockStudents,
    })

    expect(csv).toContain('Student Name,Student Number,Held Sessions,Present,Absent,Excused,Attendance %,Recitations,Absence Streak,Status Flag')
    expect(csv).toContain('"Alice Santos",2023-0001,10,9,1,0,90%,4,0,None')
    expect(csv).toContain('"Bob Reyes",2023-0002,10,6,4,0,60%,1,3,Exceeded Limit')
  })

  it('escapes student names with commas and quotes properly', () => {
    const customStudents = [
      {
        id: 'stu-3',
        name: 'Dela Cruz, Juan "Johnny"',
        studentNumber: '2023-0003',
        presentCount: 5,
        absentCount: 0,
        excusedCount: 1,
        attendancePercentage: 100,
        recitationsCount: 0,
        flag: 'none' as const,
        streak: 0,
      },
    ]

    const csv = generateProfessorCsv({
      subjectCode: 'CS101',
      heldSessionsCount: 6,
      students: customStudents,
    })

    expect(csv).toContain('"Dela Cruz, Juan ""Johnny""",2023-0003,6,5,0,1,100%,0,0,None')
  })

  it('maps warning flags to human-readable labels and variant styles', () => {
    expect(getFlagBadgeInfo('none')).toEqual({ label: 'Good Standing', variant: 'success' })
    expect(getFlagBadgeInfo('watch')).toEqual({ label: 'Watchlist', variant: 'warning' })
    expect(getFlagBadgeInfo('at_risk')).toEqual({ label: 'At Risk', variant: 'warning' })
    expect(getFlagBadgeInfo('exceeded')).toEqual({ label: 'Exceeded Limit', variant: 'danger' })
    expect(getFlagBadgeInfo('no_attendance')).toEqual({ label: 'No Attendance', variant: 'neutral' })
  })
})
