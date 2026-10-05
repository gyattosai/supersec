import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      termsRes,
      subjectsRes,
      studentsRes,
      enrollmentsRes,
      sessionsRes,
      requestsRes,
      reportLinksRes,
      announcementsRes,
      resourcesRes,
      questionsRes,
    ] = await Promise.all([
      payload.find({ collection: 'terms', limit: 100, overrideAccess: true }),
      payload.find({ collection: 'subjects', limit: 100, overrideAccess: true }),
      payload.find({ collection: 'students', limit: 1000, overrideAccess: true }),
      payload.find({ collection: 'enrollments', limit: 2000, overrideAccess: true }),
      payload.find({ collection: 'sessions', limit: 500, overrideAccess: true }),
      payload.find({ collection: 'requests', limit: 500, overrideAccess: true }),
      payload.find({ collection: 'reportLinks', limit: 100, overrideAccess: true }),
      payload.find({ collection: 'announcements', limit: 100, overrideAccess: true }),
      payload.find({ collection: 'resources', limit: 100, overrideAccess: true }),
      payload.find({ collection: 'questions', limit: 100, overrideAccess: true }),
    ])

    const now = new Date()
    const manilaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now)

    const exportPayload = {
      _meta: {
        app: 'SuperSec',
        version: '2.0.0',
        exportedAt: now.toISOString(),
        exportedBy: user.email,
        date: manilaDate,
      },
      counts: {
        terms: termsRes.totalDocs,
        subjects: subjectsRes.totalDocs,
        students: studentsRes.totalDocs,
        enrollments: enrollmentsRes.totalDocs,
        sessions: sessionsRes.totalDocs,
        requests: requestsRes.totalDocs,
        reportLinks: reportLinksRes.totalDocs,
        announcements: announcementsRes.totalDocs,
        resources: resourcesRes.totalDocs,
        questions: questionsRes.totalDocs,
      },
      data: {
        terms: termsRes.docs,
        subjects: subjectsRes.docs,
        students: studentsRes.docs,
        enrollments: enrollmentsRes.docs,
        sessions: sessionsRes.docs,
        requests: requestsRes.docs,
        reportLinks: reportLinksRes.docs,
        announcements: announcementsRes.docs,
        resources: resourcesRes.docs,
        questions: questionsRes.docs,
      },
    }

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="supersec-backup-${manilaDate}.json"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to export database' },
      { status: 500 },
    )
  }
}
