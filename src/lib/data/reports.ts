import type { Payload } from 'payload'
import crypto from 'crypto'
import { formatStudentDisplayName } from './students'

export interface CreateReportLinkInput {
  subjectId: string
  createdBy?: string
}

export function generateReportToken(): string {
  // 24 random bytes -> 32 base64url characters
  return crypto.randomBytes(24).toString('base64url')
}

export async function createReportLink(payload: Payload, input: CreateReportLinkInput) {
  const token = generateReportToken()

  const link = await payload.create({
    collection: 'reportLinks',
    data: {
      subject: input.subjectId,
      token,
      revokedAt: null,
      createdBy: input.createdBy,
    },
    overrideAccess: true,
  })

  return link
}

export async function revokeReportLink(payload: Payload, linkId: string) {
  const updated = await payload.update({
    collection: 'reportLinks',
    id: linkId,
    data: {
      revokedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return updated
}

export async function getActiveReportLink(payload: Payload, subjectId: string) {
  const res = await payload.find({
    collection: 'reportLinks',
    where: {
      and: [
        {
          subject: {
            equals: subjectId,
          },
        },
        {
          revokedAt: {
            equals: null,
          },
        },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  return res.docs && res.docs.length > 0 ? (res.docs[0] as any) : null
}

export async function resetReportLink(payload: Payload, subjectId: string, createdBy?: string) {
  // Revoke existing active links
  const existingRes = await payload.find({
    collection: 'reportLinks',
    where: {
      and: [
        {
          subject: {
            equals: subjectId,
          },
        },
        {
          revokedAt: {
            equals: null,
          },
        },
      ],
    },
    limit: 10,
    overrideAccess: true,
  })

  for (const doc of existingRes.docs as any[]) {
    await revokeReportLink(payload, doc.id)
  }

  // Create new active report link
  return createReportLink(payload, { subjectId, createdBy })
}

export async function getReportLinkByToken(payload: Payload, token: string) {
  const res = await payload.find({
    collection: 'reportLinks',
    where: {
      token: {
        equals: token,
      },
    },
    limit: 1,
    overrideAccess: true,
  })

  return res.docs && res.docs.length > 0 ? (res.docs[0] as any) : null
}

export interface ProfessorReportOptions {
  fromDate?: string
  toDate?: string
}

export type ProfessorReportResponse =
  | { status: 'not_found' }
  | { status: 'revoked'; revokedAt: string }
  | {
      status: 'active'
      subject: {
        id: string
        code: string
        name: string
        section?: string
        sectionMark?: string
        professor?: string
        termName?: string
        scheduleDays?: string[]
        startTime?: string
        endTime?: string
        room?: string
        absenceLimit: number
      }
      range: {
        fromDate?: string
        toDate?: string
      }
      heldSessionsCount: number
      heldSessionDates: string[]
      sessionSummaries: Array<{
        id: string
        date: string
        sheetTitle?: string
        onRosterCount: number
        presentStarCount: number
        presentCount: number
        excusedCount: number
        conflictCount: number
        absentCount: number
        attendanceRate: number
      }>
      monitoringSummary: any
      preparedByName?: string
      datePrepared?: string
      students: Array<{
        id: string
        name: string
        studentNumber: string
        displayOrder?: number
        presentCount: number
        absentCount: number
        excusedCount: number
        conflictCount: number
        presentStarCount: number
        eligibleSessionsCount: number
        attendancePercentage: number
        attendanceRate: number
        recitationsCount: number
        flag: 'none' | 'watch' | 'at_risk' | 'exceeded' | 'no_attendance'
        categories: string[]
        streak: number
        sessionMarks: Record<string, 'P' | 'A' | 'E' | 'C' | '—'>
      }>
    }

export async function getProfessorReport(
  payload: Payload,
  token: string,
  options?: ProfessorReportOptions,
): Promise<ProfessorReportResponse> {
  // 1. Validate token
  const link = await getReportLinkByToken(payload, token)
  if (!link) {
    return { status: 'not_found' }
  }

  if (link.revokedAt) {
    return { status: 'revoked', revokedAt: link.revokedAt }
  }

  // 2. Fetch subject with field allowlist
  const subjectId = typeof link.subject === 'object' && link.subject !== null ? link.subject.id : link.subject
  const subjectRes = await payload.find({
    collection: 'subjects',
    where: { id: { equals: subjectId } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })

  if (!subjectRes.docs || subjectRes.docs.length === 0) {
    return { status: 'not_found' }
  }

  const subjectDoc = subjectRes.docs[0] as any
  const termName =
    typeof subjectDoc.term === 'object' && subjectDoc.term !== null
      ? subjectDoc.term.name
      : 'Prelims'

  const subject = {
    id: subjectDoc.id,
    code: subjectDoc.code,
    name: subjectDoc.name,
    section: subjectDoc.section || undefined,
    sectionMark: subjectDoc.sectionMark || subjectDoc.section || undefined,
    professor: subjectDoc.professor || undefined,
    termName,
    scheduleDays: subjectDoc.scheduleDays || undefined,
    startTime: subjectDoc.startTime || undefined,
    endTime: subjectDoc.endTime || undefined,
    room: subjectDoc.room || undefined,
    absenceLimit: subjectDoc.absenceLimit ?? 4,
  }

  // 3. Fetch published sessions
  const sessionsRes = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { subject: { equals: subjectId } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 500,
    overrideAccess: true,
  })

  let sessions = (sessionsRes.docs as any[]).filter((s) => {
    if (options?.fromDate && s.date < options.fromDate) return false
    if (options?.toDate && s.date > options.toDate) return false
    return true
  })
  sessions.sort((a, b) => a.date.localeCompare(b.date))
  const heldSessionsCount = sessions.length
  const heldSessionDates = sessions.map((s) => s.date)

  // 4. Fetch enrollments
  const enrollmentsRes = await payload.find({
    collection: 'enrollments',
    where: { subject: { equals: subjectId } },
    depth: 1,
    limit: 500,
    overrideAccess: true,
  })

  const enrollments = enrollmentsRes.docs as any[]
  enrollments.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  // 5. Aggregate stats per student
  const students = enrollments.map((enr) => {
    const studentObj = typeof enr.student === 'object' && enr.student !== null ? enr.student : null
    const studentId = studentObj ? studentObj.id : enr.student
    const studentName = formatStudentDisplayName(studentObj)
    const studentNumber = studentObj ? studentObj.studentNumber : ''

    let eligibleSessionsCount = 0
    let presentCount = 0
    let absentCount = 0
    let excusedCount = 0
    let conflictCount = 0
    let recitationsCount = 0
    const attendanceHistory: Array<'P' | 'A' | 'E' | 'C'> = []
    const sessionMarks: Record<string, 'P' | 'A' | 'E' | 'C' | '—'> = {}

    for (const session of sessions) {
      if (session.kind === 'noClass') continue

      if (enr.enrolledOn && session.date < enr.enrolledOn) {
        sessionMarks[session.date] = '—'
        continue
      }

      if (enr.dropped && enr.droppedOn && session.date > enr.droppedOn) {
        sessionMarks[session.date] = '—'
        continue
      }

      eligibleSessionsCount++

      const entry = session.entries?.find((e: any) => {
        const eStuId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        return eStuId === studentId
      })

      if (entry) {
        if (entry.attendance === 'P') {
          presentCount++
          attendanceHistory.push('P')
          sessionMarks[session.date] = 'P'
        } else if (entry.attendance === 'A') {
          absentCount++
          attendanceHistory.push('A')
          sessionMarks[session.date] = 'A'
        } else if (entry.attendance === 'E') {
          excusedCount++
          attendanceHistory.push('E')
          sessionMarks[session.date] = 'E'
        } else if (entry.attendance === 'C') {
          conflictCount++
          attendanceHistory.push('C')
          sessionMarks[session.date] = 'C'
        }
        recitationsCount += entry.recitations || 0
      } else {
        absentCount++
        attendanceHistory.push('A')
        sessionMarks[session.date] = 'A'
      }
    }

    const presentStarCount = presentCount + excusedCount + conflictCount
    const legacyDenominator = heldSessionsCount - excusedCount - conflictCount
    const attendancePercentage = legacyDenominator <= 0 ? 100 : Math.round((presentCount / legacyDenominator) * 100)
    const attendanceRate = eligibleSessionsCount <= 0 ? 100 : Math.round((presentStarCount / eligibleSessionsCount) * 1000) / 10

    // Streak calculation (Rule R2: Excused & Schedule Conflict days neither break nor extend streaks)
    let streak = 0
    for (let i = attendanceHistory.length - 1; i >= 0; i--) {
      const mark = attendanceHistory[i]
      if (mark === 'E' || mark === 'C') {
        continue
      }
      if (mark === 'A') {
        streak++
      } else {
        break
      }
    }

    // Monitoring Flag
    const absenceLimit = subject.absenceLimit
    let flag: 'none' | 'watch' | 'at_risk' | 'exceeded' | 'no_attendance' = 'none'

    if (absentCount >= absenceLimit) {
      flag = 'exceeded'
    } else if (absentCount >= absenceLimit * 0.75) {
      flag = 'at_risk'
    } else if (absentCount >= absenceLimit * 0.5) {
      flag = 'watch'
    } else if (heldSessionsCount > 0 && presentCount === 0) {
      flag = 'no_attendance'
    }

    const categories: string[] = []
    if (presentStarCount === 0 && eligibleSessionsCount > 0) categories.push('No Attendance')
    if (attendanceRate < 50 && eligibleSessionsCount > 0 && presentStarCount > 0) categories.push('Below 50%')
    if (absentCount >= absenceLimit) categories.push('Exceeded Limit')
    else if (absentCount >= absenceLimit * 0.75) categories.push('At Risk')
    else if (absentCount >= absenceLimit * 0.5) categories.push('Watch')

    return {
      id: studentId,
      name: studentName,
      studentNumber,
      displayOrder: enr.displayOrder,
      presentCount,
      absentCount,
      excusedCount,
      conflictCount,
      presentStarCount,
      eligibleSessionsCount,
      attendancePercentage,
      attendanceRate,
      recitationsCount,
      flag,
      categories,
      streak,
      sessionMarks,
    }
  })

  // 6. Session Summaries Breakdown
  const sessionSummaries = sessions.map((sess) => {
    let pCount = 0
    let eCount = 0
    let cCount = 0
    let aCount = 0

    const entries = sess.entries || []
    for (const ent of entries) {
      if (ent.attendance === 'P') pCount++
      else if (ent.attendance === 'E') eCount++
      else if (ent.attendance === 'C') cCount++
      else if (ent.attendance === 'A') aCount++
    }

    const presentStarCount = pCount + eCount + cCount
    const onRosterCount = entries.length
    const attendanceRate = onRosterCount > 0 ? Math.round((presentStarCount / onRosterCount) * 1000) / 10 : 0

    return {
      id: sess.id,
      date: sess.date,
      sheetTitle: sess.changeNote || (sess.kind === 'noClass' ? sess.noClassReason : 'Class Session'),
      onRosterCount,
      presentStarCount,
      presentCount: pCount,
      excusedCount: eCount,
      conflictCount: cCount,
      absentCount: aCount,
      attendanceRate,
    }
  })

  // 7. Date prepared
  const datePrepared = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return {
    status: 'active',
    subject,
    range: {
      fromDate: options?.fromDate,
      toDate: options?.toDate,
    },
    heldSessionsCount,
    heldSessionDates,
    sessionSummaries,
    monitoringSummary: {
      totalHeldClassSessions: sessions.filter((s) => s.kind !== 'noClass').length,
      activeStudents: enrollments.filter((e) => !e.dropped).length,
      noAttendanceCount: students.filter((s) => s.presentStarCount === 0 && s.eligibleSessionsCount > 0).length,
      below50Count: students.filter((s) => s.attendanceRate < 50 && s.eligibleSessionsCount > 0).length,
      totalFlaggedCount: students.filter((s) => s.categories.length > 0 || s.streak >= 3).length,
    },
    preparedByName: 'Matthew Balubar, Class Secretary',
    datePrepared,
    students,
  }
}
