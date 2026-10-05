import type { Payload } from 'payload'
import crypto from 'crypto'

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
      students: Array<{
        id: string
        name: string
        studentNumber: string
        displayOrder?: number
        presentCount: number
        absentCount: number
        excusedCount: number
        conflictCount: number
        attendancePercentage: number
        recitationsCount: number
        flag: 'none' | 'watch' | 'at_risk' | 'exceeded' | 'no_attendance'
        streak: number
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
    limit: 1,
    overrideAccess: true,
  })

  if (!subjectRes.docs || subjectRes.docs.length === 0) {
    return { status: 'not_found' }
  }

  const subjectDoc = subjectRes.docs[0] as any
  const subject = {
    id: subjectDoc.id,
    code: subjectDoc.code,
    name: subjectDoc.name,
    section: subjectDoc.section || undefined,
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

  // 4. Fetch enrollments
  const enrollmentsRes = await payload.find({
    collection: 'enrollments',
    where: { subject: { equals: subjectId } },
    limit: 500,
    overrideAccess: true,
  })

  const enrollments = enrollmentsRes.docs as any[]
  enrollments.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  // 5. Aggregate stats per student
  const students = enrollments.map((enr) => {
    const studentObj = typeof enr.student === 'object' && enr.student !== null ? enr.student : null
    const studentId = studentObj ? studentObj.id : enr.student
    const studentName = studentObj ? studentObj.name : ''
    const studentNumber = studentObj ? studentObj.studentNumber : ''

    let presentCount = 0
    let absentCount = 0
    let excusedCount = 0
    let conflictCount = 0
    let recitationsCount = 0
    const attendanceHistory: Array<'P' | 'A' | 'E' | 'C'> = []

    for (const session of sessions) {
      const entry = session.entries?.find((e: any) => {
        const eStuId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
        return eStuId === studentId
      })

      if (entry) {
        if (entry.attendance === 'P') {
          presentCount++
          attendanceHistory.push('P')
        } else if (entry.attendance === 'A') {
          absentCount++
          attendanceHistory.push('A')
        } else if (entry.attendance === 'E') {
          excusedCount++
          attendanceHistory.push('E')
        } else if (entry.attendance === 'C') {
          conflictCount++
          attendanceHistory.push('C')
        }
        recitationsCount += entry.recitations || 0
      }
    }

    const denominator = heldSessionsCount - excusedCount - conflictCount
    const attendancePercentage = denominator <= 0 ? 100 : Math.round((presentCount / denominator) * 100)

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

    return {
      id: studentId,
      name: studentName,
      studentNumber,
      displayOrder: enr.displayOrder,
      presentCount,
      absentCount,
      excusedCount,
      conflictCount,
      attendancePercentage,
      recitationsCount,
      flag,
      streak,
    }
  })

  return {
    status: 'active',
    subject,
    range: {
      fromDate: options?.fromDate,
      toDate: options?.toDate,
    },
    heldSessionsCount,
    students,
  }
}
