import * as React from 'react'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { projectSubjectRequestsList } from '@/lib/subjects/subject-home'
import { RequestsQueueView } from '@/components/console/requests-queue-view'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const payload = await getPayload({ config })

  // 1. Fetch subjects for filter dropdown
  const subjectsRes = await payload.find({
    collection: 'subjects',
    limit: 100,
    sort: 'code',
    overrideAccess: true,
  })

  const subjects = (subjectsRes.docs || []).map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
  }))

  // 2. Fetch all requests with depth: 1 to resolve student, session, and subject
  const requestsRes = await payload.find({
    collection: 'requests',
    sort: '-createdAt',
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })

  const projectedRequests = projectSubjectRequestsList(requestsRes.docs || [])

  return (
    <div className="py-2">
      <RequestsQueueView
        initialRequests={projectedRequests}
        subjects={subjects}
      />
    </div>
  )
}
