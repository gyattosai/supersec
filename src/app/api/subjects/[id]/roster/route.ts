import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { bulkEnrollStudents } from '@/lib/data/students'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: subjectId } = await params
    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { students, enrolledOn } = body

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'At least one student is required' }, { status: 400 })
    }

    if (!enrolledOn || !/^\d{4}-\d{2}-\d{2}$/.test(enrolledOn)) {
      return NextResponse.json(
        { error: 'enrolledOn must be in YYYY-MM-DD format' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })
    const result = await bulkEnrollStudents(payload, {
      subjectId,
      students,
      enrolledOn,
    })

    return NextResponse.json({
      success: true,
      enrolledCount: result.enrolledCount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to enroll students' },
      { status: 500 },
    )
  }
}
