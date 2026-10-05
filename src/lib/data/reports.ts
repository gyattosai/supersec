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
