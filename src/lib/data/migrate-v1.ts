import type { Payload } from 'payload'
import {
  utcToManilaDateString,
  mapWeekdayNumberToString,
  mapV1AttendanceStatus,
} from './migration-transforms'

export interface AppwriteDoc {
  $id: string
  [key: string]: any
}

export interface FetchAppwriteOptions {
  endpoint?: string
  projectId?: string
  apiKey?: string
  databaseId?: string
}

export async function fetchAllAppwriteDocs(
  collectionId: string,
  options: FetchAppwriteOptions = {},
): Promise<AppwriteDoc[]> {
  const endpoint = options.endpoint || 'https://sgp.cloud.appwrite.io/v1'
  const projectId = options.projectId || 'supersec'
  const databaseId = options.databaseId || 'supersec_db'

  const headers: Record<string, string> = {
    'X-Appwrite-Project': projectId,
  }
  if (options.apiKey) {
    headers['X-Appwrite-Key'] = options.apiKey
  }

  const allDocs: AppwriteDoc[] = []
  let cursor: string | null = null

  while (true) {
    const qLimit = encodeURIComponent(JSON.stringify({ method: 'limit', values: [100] }))
    let url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?queries[0]=${qLimit}`
    if (cursor) {
      const qCursor = encodeURIComponent(JSON.stringify({ method: 'cursorAfter', values: [cursor] }))
      url += `&queries[1]=${qCursor}`
    }

    const res = await fetch(url, { headers })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Failed to fetch Appwrite ${collectionId}: ${res.status} ${errText}`)
    }

    const data = await res.json()
    const docs = data.documents || []
    if (docs.length === 0) {
      break
    }

    allDocs.push(...docs)
    cursor = docs[docs.length - 1].$id
    if (allDocs.length >= (data.total || 0)) {
      break
    }
  }

  return allDocs
}

export interface MigrationStats {
  terms: number
  subjects: number
  students: number
  enrollments: number
  sessions: number
  attendanceRecordsProcessed: number
}

export async function runV1Migration(
  payload: Payload,
  options: FetchAppwriteOptions = {},
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    terms: 0,
    subjects: 0,
    students: 0,
    enrollments: 0,
    sessions: 0,
    attendanceRecordsProcessed: 0,
  }

  // 1. Ensure Term exists
  const existingTerm = await payload.find({
    collection: 'terms',
    where: { name: { equals: '1st Semester - 2026' } },
    limit: 1,
    overrideAccess: true,
  })

  let termId: string
  if (existingTerm.docs && existingTerm.docs.length > 0) {
    termId = existingTerm.docs[0].id
  } else {
    const createdTerm = await payload.create({
      collection: 'terms',
      data: {
        name: '1st Semester - 2026',
        startDate: '2026-08-01',
        endDate: '2026-12-31',
      },
      overrideAccess: true,
    })
    termId = createdTerm.id
    stats.terms++
  }

  // 2. Fetch all collections from v1
  const v1Subjects = await fetchAllAppwriteDocs('subjects', options)
  const v1Students = await fetchAllAppwriteDocs('students', options)
  const v1SubjectStudents = await fetchAllAppwriteDocs('subjectStudents', options)
  const v1ClassSessions = await fetchAllAppwriteDocs('classSessions', options)
  const v1AttendanceRecords = await fetchAllAppwriteDocs('attendanceRecords', options)

  // Mapping tables: v1RowId -> v2Id
  const subjectIdMap = new Map<string, string>() // v1SubjectId -> v2SubjectId
  const studentIdMap = new Map<string, string>() // v1StudentId -> v2StudentId
  const enrollmentMap = new Map<
    string,
    { v2StudentId: string; v2SubjectId: string; conflictFlag: boolean }
  >() // v1SubjectStudentId -> data

  // 3. Upsert Subjects
  for (const s of v1Subjects) {
    let meetings: any[] = []
    try {
      meetings = JSON.parse(s.meetingDaysJson || '[]')
    } catch {
      meetings = []
    }

    if (!Array.isArray(meetings) || meetings.length === 0) {
      meetings = [{ weekday: 1, startTime: '08:00', endTime: '10:00' }]
    }

    // Clean schedule meetings ensuring 1 per weekday (Rule R8)
    const seenWeekdays = new Set<string>()
    const schedule: any[] = []
    for (const m of meetings) {
      const dayCode = mapWeekdayNumberToString(m.weekday)
      if (seenWeekdays.has(dayCode)) continue
      seenWeekdays.add(dayCode)
      schedule.push({
        weekday: dayCode,
        start: m.startTime || '08:00',
        end: m.endTime || '10:00',
      })
    }

    const legacyRowId = s.$id
    const legacyId = s.publicId || ''
    const cleanCode = (s.code || 'SUBJ').trim()
    const cleanName = (s.name || cleanCode).trim()
    const slug = `${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${(legacyId.slice(0, 4) || 'v1sub').toLowerCase()}`

    const existingSub = await payload.find({
      collection: 'subjects',
      where: { legacyRowId: { equals: legacyRowId } },
      limit: 1,
      overrideAccess: true,
    })

    let v2SubId: string
    if (existingSub.docs && existingSub.docs.length > 0) {
      v2SubId = existingSub.docs[0].id
      await payload.update({
        collection: 'subjects',
        id: v2SubId,
        data: {
          term: termId,
          name: cleanName,
          code: cleanCode,
          professor: s.professorName || undefined,
          schedule,
          legacyId,
        },
        overrideAccess: true,
      })
    } else {
      const created = await payload.create({
        collection: 'subjects',
        data: {
          term: termId,
          name: cleanName,
          code: cleanCode,
          professor: s.professorName || undefined,
          schedule,
          slug,
          legacyRowId,
          legacyId,
        },
        overrideAccess: true,
      })
      v2SubId = created.id
      stats.subjects++
    }
    subjectIdMap.set(legacyRowId, v2SubId)
  }

  // 4. Upsert Students
  for (const st of v1Students) {
    const legacyRowId = st.$id
    let lastName = (st.lastName || '').trim()
    let firstName = (st.firstName || '').trim()
    const middleName = (st.middleName || '').trim() || undefined

    if (!lastName || !firstName) {
      if (st.canonicalName && st.canonicalName.includes(',')) {
        const parts = st.canonicalName.split(',')
        lastName = parts[0]?.trim() || 'Unknown'
        firstName = parts[1]?.trim() || 'Unknown'
      } else {
        lastName = lastName || 'Student'
        firstName = firstName || legacyRowId.slice(0, 6)
      }
    }

    const existingStudent = await payload.find({
      collection: 'students',
      where: { legacyRowId: { equals: legacyRowId } },
      limit: 1,
      overrideAccess: true,
    })

    let v2StuId: string
    if (existingStudent.docs && existingStudent.docs.length > 0) {
      v2StuId = existingStudent.docs[0].id
      await payload.update({
        collection: 'students',
        id: v2StuId,
        data: {
          lastName,
          firstName,
          middleName,
          privateNotes: st.privateNotes || undefined,
        },
        overrideAccess: true,
      })
    } else {
      const created = await payload.create({
        collection: 'students',
        data: {
          lastName,
          firstName,
          middleName,
          privateNotes: st.privateNotes || undefined,
          legacyRowId,
        },
        overrideAccess: true,
      })
      v2StuId = created.id
      stats.students++
    }
    studentIdMap.set(legacyRowId, v2StuId)
  }

  // 5. Upsert Enrollments
  for (const ss of v1SubjectStudents) {
    const v2StudentId = studentIdMap.get(ss.studentId)
    const v2SubjectId = subjectIdMap.get(ss.subjectId)
    if (!v2StudentId || !v2SubjectId) {
      continue
    }

    const isDropped = ss.membershipState === 'removed'
    const conflictFlag = Boolean(ss.hasScheduleConflict)
    const displayOrder = typeof ss.displayOrder === 'number' ? ss.displayOrder : 0
    const droppedOn = isDropped
      ? ss.removedAt
        ? utcToManilaDateString(ss.removedAt)
        : '2026-12-31'
      : undefined

    const legacyRowId = ss.$id

    const existingEnr = await payload.find({
      collection: 'enrollments',
      where: { legacyRowId: { equals: legacyRowId } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingEnr.docs && existingEnr.docs.length > 0) {
      await payload.update({
        collection: 'enrollments',
        id: existingEnr.docs[0].id,
        data: {
          student: v2StudentId,
          subject: v2SubjectId,
          status: isDropped ? 'dropped' : 'active',
          enrolledOn: '2026-08-01',
          droppedOn,
          conflictFlag,
          displayOrder,
        },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'enrollments',
        data: {
          student: v2StudentId,
          subject: v2SubjectId,
          status: isDropped ? 'dropped' : 'active',
          enrolledOn: '2026-08-01',
          droppedOn,
          conflictFlag,
          displayOrder,
          legacyRowId,
        },
        overrideAccess: true,
      })
      stats.enrollments++
    }

    enrollmentMap.set(legacyRowId, {
      v2StudentId,
      v2SubjectId,
      conflictFlag,
    })
  }

  // 6. Group attendance records by session ID
  const recordsBySession = new Map<string, AppwriteDoc[]>()
  for (const rec of v1AttendanceRecords) {
    const sessId = rec.classSessionId
    if (!recordsBySession.has(sessId)) {
      recordsBySession.set(sessId, [])
    }
    recordsBySession.get(sessId)!.push(rec)
    stats.attendanceRecordsProcessed++
  }

  // 7. Upsert Sessions with Entries
  for (const cs of v1ClassSessions) {
    const v2SubjectId = subjectIdMap.get(cs.subjectId)
    if (!v2SubjectId) {
      continue
    }

    const legacyRowId = cs.$id
    const date = utcToManilaDateString(cs.startsAt || cs.$createdAt)
    const isNoClass = Boolean(cs.noClassReason || cs.sessionState === 'no_class')
    const noClassReason = isNoClass ? (cs.noClassReason || 'No Class').trim() : undefined
    const kind = isNoClass ? 'noClass' : 'class'
    const status = cs.publishState === 'published' ? 'published' : 'draft'

    // Build roll call entries from attendance records
    const sessionRecords = recordsBySession.get(legacyRowId) || []
    const seenStudents = new Set<string>()
    const entries: any[] = []

    for (const rec of sessionRecords) {
      const enr = enrollmentMap.get(rec.subjectStudentId)
      if (!enr) continue
      if (seenStudents.has(enr.v2StudentId)) continue
      seenStudents.add(enr.v2StudentId)

      const hasConflict = rec.hasScheduleConflict || enr.conflictFlag
      const attendance = mapV1AttendanceStatus(rec.attendanceStatus, hasConflict)

      entries.push({
        student: enr.v2StudentId,
        attendance,
        recitations: 0,
      })
    }

    const existingSession = await payload.find({
      collection: 'sessions',
      where: { legacyRowId: { equals: legacyRowId } },
      limit: 1,
      overrideAccess: true,
    })

    if (existingSession.docs && existingSession.docs.length > 0) {
      await payload.update({
        collection: 'sessions',
        id: existingSession.docs[0].id,
        data: {
          subject: v2SubjectId,
          date,
          kind,
          phase: 'finished',
          noClassReason,
          entries,
          changeNote: 'Imported from supersec v1',
          _status: status,
        },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'sessions',
        data: {
          subject: v2SubjectId,
          date,
          kind,
          phase: 'finished',
          noClassReason,
          entries,
          changeNote: 'Imported from supersec v1',
          _status: status,
          legacyRowId,
        },
        overrideAccess: true,
      })
      stats.sessions++
    }
  }

  return stats
}
