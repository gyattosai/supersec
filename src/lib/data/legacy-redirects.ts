import type { Payload } from 'payload'

export interface LegacyRedirectResult {
  destination: string
  isPermanent: true
  slug?: string
  token?: string
}

/**
 * Resolves an incoming subject identifier.
 * - If identifier is already an active v2 subject slug, returns null (no redirect needed).
 * - If identifier matches a legacyId or legacyRowId of an active subject, returns 301 redirect target to /s/{slug}.
 * - If not found, returns null (caller can render 404).
 */
export async function resolveLegacySubjectRedirect(
  payload: Payload,
  identifier: string,
): Promise<LegacyRedirectResult | null> {
  const cleanId = identifier.trim()
  if (!cleanId) return null

  // 1. Check if identifier is already a canonical slug
  const canonicalCheck = await payload.find({
    collection: 'subjects',
    where: {
      and: [
        { slug: { equals: cleanId.toLowerCase() } },
        { archivedAt: { exists: false } },
      ],
    },
    select: { id: true, slug: true } as any,
    overrideAccess: true,
    limit: 1,
  })

  if (canonicalCheck.docs && canonicalCheck.docs.length > 0) {
    return null // Already canonical, proceed to render page
  }

  // 2. Check if identifier matches legacyId or legacyRowId
  const legacyMatch = await payload.find({
    collection: 'subjects',
    where: {
      and: [
        {
          or: [
            { legacyId: { equals: cleanId } },
            { legacyRowId: { equals: cleanId } },
          ],
        },
        { archivedAt: { exists: false } },
      ],
    },
    select: { id: true, slug: true } as any,
    overrideAccess: true,
    limit: 1,
  })

  if (!legacyMatch.docs || legacyMatch.docs.length === 0) {
    return null
  }

  const subject = legacyMatch.docs[0] as any
  return {
    slug: subject.slug,
    destination: `/s/${subject.slug}`,
    isPermanent: true,
  }
}

/**
 * Resolves an incoming report link identifier (e.g. from /r/:id legacy endpoint).
 * - Matches token, legacyId, or legacyRowId on non-revoked report links.
 * - Returns 301 redirect target to /prof/{token}.
 */
export async function resolveLegacyReportRedirect(
  payload: Payload,
  identifier: string,
): Promise<LegacyRedirectResult | null> {
  const cleanId = identifier.trim()
  if (!cleanId) return null

  const match = await payload.find({
    collection: 'reportLinks',
    where: {
      and: [
        {
          or: [
            { token: { equals: cleanId } },
            { legacyId: { equals: cleanId } },
            { legacyRowId: { equals: cleanId } },
          ],
        },
        { revokedAt: { exists: false } },
      ],
    },
    select: { id: true, token: true } as any,
    overrideAccess: true,
    limit: 1,
  })

  if (!match.docs || match.docs.length === 0) {
    return null
  }

  const report = match.docs[0] as any
  return {
    token: report.token,
    destination: `/prof/${report.token}`,
    isPermanent: true,
  }
}
