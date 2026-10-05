import type { Payload } from 'payload'

export interface SubmitRequestInput {
  ip: string
  subjectId: string
  sessionId: string
  studentId: string
  type: 'present' | 'excuse' | 'recited'
  reason?: string
  count?: number
  topic?: string
  proofUrl?: string
  proofStorageId?: string
}

export async function checkRateLimit(
  payload: Payload,
  ip: string,
  action: string,
  limit = 5,
  windowMs = 10 * 60 * 1000, // 10 minutes
): Promise<{ allowed: boolean; currentCount: number; error?: string }> {
  const key = `${ip}:${action}`
  const now = new Date()

  const existingRes = await payload.find({
    collection: 'rateLimits',
    where: {
      key: {
        equals: key,
      },
    },
    limit: 1,
    overrideAccess: true,
  })

  const existing = existingRes.docs && existingRes.docs.length > 0 ? (existingRes.docs[0] as any) : null

  if (existing) {
    if (new Date(existing.expiresAt) > now) {
      if (existing.count >= limit) {
        return {
          allowed: false,
          currentCount: existing.count,
          error: 'Too many submissions. Please wait 10 minutes before submitting again.',
        }
      }

      const updatedCount = existing.count + 1
      await payload.update({
        collection: 'rateLimits',
        id: existing.id,
        data: {
          count: updatedCount,
        },
        overrideAccess: true,
      })

      return { allowed: true, currentCount: updatedCount }
    }
  }

  // First request or previous window expired
  const expiresAt = new Date(Date.now() + windowMs).toISOString()
  await payload.create({
    collection: 'rateLimits',
    data: {
      key,
      count: 1,
      expiresAt,
    },
    overrideAccess: true,
  })

  return { allowed: true, currentCount: 1 }
}

export async function submitClassmateRequest(payload: Payload, data: SubmitRequestInput) {
  // 1. Enforce rate limit bucket (ADR 0009)
  const rateLimit = await checkRateLimit(payload, data.ip, 'submit-request')
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error || 'Rate limit exceeded')
  }

  // 2. Validate excuse reason
  if (data.type === 'excuse' && (!data.reason || !data.reason.trim())) {
    throw new Error('An excuse reason is required for excuse requests')
  }

  // 3. Verify session exists and is published
  const sessionRes = await payload.find({
    collection: 'sessions',
    where: {
      id: {
        equals: data.sessionId,
      },
    },
    limit: 1,
    overrideAccess: true,
  })

  if (!sessionRes.docs || sessionRes.docs.length === 0) {
    throw new Error('Target session does not exist')
  }

  const session = sessionRes.docs[0] as any
  if (session._status !== 'published') {
    throw new Error('Requests can only be submitted against published sessions')
  }

  // 4. Verify no duplicate pending request for this student + session + type
  const existingPending = await payload.find({
    collection: 'requests',
    where: {
      and: [
        { session: { equals: data.sessionId } },
        { student: { equals: data.studentId } },
        { type: { equals: data.type } },
        { status: { equals: 'pending' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existingPending.docs && existingPending.docs.length > 0) {
    throw new Error('You already have a pending request for this session and request type')
  }

  // 5. Create pending request
  const created = await payload.create({
    collection: 'requests',
    data: {
      subject: data.subjectId,
      session: data.sessionId,
      student: data.studentId,
      type: data.type,
      reason: data.reason ? data.reason.trim() : undefined,
      count: data.type === 'recited' ? data.count || 1 : undefined,
      topic: data.type === 'recited' ? data.topic : undefined,
      proofUrl: data.proofUrl,
      proofStorageId: data.proofStorageId,
      status: 'pending',
    },
    overrideAccess: true,
  })

  return created
}

export interface ReviewRequestInput {
  requestId: string
  decision: 'approved' | 'declined'
}

export async function reviewRequest(payload: Payload, input: ReviewRequestInput) {
  // 1. Fetch request
  const reqRes = await payload.find({
    collection: 'requests',
    where: {
      id: {
        equals: input.requestId,
      },
    },
    limit: 1,
    overrideAccess: true,
  })

  if (!reqRes.docs || reqRes.docs.length === 0) {
    throw new Error('Request not found')
  }

  const req = reqRes.docs[0] as any
  const sessionId = typeof req.session === 'object' && req.session !== null ? req.session.id : req.session
  const studentId = typeof req.student === 'object' && req.student !== null ? req.student.id : req.student

  // 2. Fetch session
  const sessionRes = await payload.find({
    collection: 'sessions',
    where: {
      id: {
        equals: sessionId,
      },
    },
    limit: 1,
    overrideAccess: true,
  })

  if (!sessionRes.docs || sessionRes.docs.length === 0) {
    throw new Error('Target session not found')
  }

  const session = sessionRes.docs[0] as any

  if (input.decision === 'approved') {
    // Rule R3: Cannot approve if session has uncommitted draft edits
    if (session._status === 'draft') {
      throw new Error('Cannot approve request while target session has unpublished draft edits (Rule R3)')
    }

    // Update target session entries
    const entries = [...(session.entries || [])]
    const entryIndex = entries.findIndex((e: any) => {
      const eStuId = typeof e.student === 'object' && e.student !== null ? e.student.id : e.student
      return eStuId === studentId
    })

    if (entryIndex !== -1) {
      const currentEntry = entries[entryIndex]
      if (req.type === 'present') {
        entries[entryIndex] = {
          ...currentEntry,
          attendance: 'P',
        }
      } else if (req.type === 'excuse') {
        entries[entryIndex] = {
          ...currentEntry,
          attendance: 'E',
          excuseReason: req.reason || undefined,
        }
      } else if (req.type === 'recited') {
        // Rule R5: Approving "I recited" adds count delta to recitations without overwriting in-class taps
        const delta = req.count || 1
        entries[entryIndex] = {
          ...currentEntry,
          recitations: (currentEntry.recitations || 0) + delta,
        }
      }

      await payload.update({
        collection: 'sessions',
        id: session.id,
        data: {
          entries,
        },
        overrideAccess: true,
      })
    }
  }

  // 3. Update request status and decidedAt
  const updatedRequest = await payload.update({
    collection: 'requests',
    id: req.id,
    data: {
      status: input.decision,
      decidedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return updatedRequest
}
