import { getPayload } from 'payload'
import config from '../src/payload.config'

async function inspectSEC401() {
  const payload = await getPayload({ config })
  const subj = await payload.find({
    collection: 'subjects',
    where: { code: { equals: 'SEC 401' } },
  })

  if (subj.docs.length === 0) {
    console.log('SEC 401 not found!')
    process.exit(0)
  }

  const s = subj.docs[0]
  console.log(`Found SEC 401 (ID: ${s.id}, Name: ${s.name})`)

  const enrollments = await payload.find({
    collection: 'enrollments',
    where: { subject: { equals: s.id } },
    limit: 100,
  })
  console.log(`Enrollments count: ${enrollments.totalDocs}`)

  const sessions = await payload.find({
    collection: 'sessions',
    where: { subject: { equals: s.id } },
    limit: 100,
  })
  console.log(`Sessions count: ${sessions.totalDocs}`)

  process.exit(0)
}

inspectSEC401().catch((err) => {
  console.error(err)
  process.exit(1)
})
