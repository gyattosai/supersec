import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { submitClassmateRequest } from '@/lib/data/requests'

export async function POST(req: Request) {
  // Extract client IP for token bucket rate limiting (ADR 0009)
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1'

  try {
    const body = await req.json()
    const {
      subjectId,
      sessionId,
      studentId,
      type,
      reason,
      count,
      topic,
      proofUrl,
      proofStorageId,
      honeypot,
    } = body

    // 1. Honeypot check: spambots filling hidden input are silently dropped
    if (honeypot && typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return NextResponse.json({ success: true, message: 'Submission received' }, { status: 200 })
    }

    if (!subjectId || !sessionId || !studentId || !type) {
      return NextResponse.json(
        { error: 'Missing required request fields (subjectId, sessionId, studentId, type)' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    const created = await submitClassmateRequest(payload, {
      ip,
      subjectId,
      sessionId,
      studentId,
      type,
      reason,
      count: count ? Number(count) : undefined,
      topic,
      proofUrl,
      proofStorageId,
    })

    return NextResponse.json({
      success: true,
      id: created.id,
    }, { status: 201 })
  } catch (error: any) {
    const msg = error?.message || 'Failed to submit request'
    if (msg.includes('Too many submissions') || msg.includes('Rate limit')) {
      return NextResponse.json({ error: msg }, { status: 429 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
