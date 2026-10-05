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

  // 4. Create pending request
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
