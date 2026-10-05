import { getPayload } from 'payload'
import config from '../src/payload.config'

async function deleteSEC401() {
  const payload = await getPayload({ config })

  const subjRes = await payload.find({
    collection: 'subjects',
    where: { code: { equals: 'SEC 401' } },
    overrideAccess: true,
  })

  if (subjRes.docs.length === 0) {
    console.log('No subject found with code "SEC 401".')
    process.exit(0)
  }

  const subj = subjRes.docs[0]
  console.log(`Found subject: [${subj.code}] ${subj.name} (ID: ${subj.id})`)

  // 1. Delete associated sessions
  const sessions = await payload.find({
    collection: 'sessions',
    where: { subject: { equals: subj.id } },
    limit: 100,
    overrideAccess: true,
  })
  console.log(`Found ${sessions.docs.length} sessions to delete...`)
  for (const s of sessions.docs) {
    await payload.delete({
      collection: 'sessions',
      id: s.id,
      overrideAccess: true,
    })
    console.log(`  - Deleted session ${s.id} (${s.date})`)
  }

  // 2. Delete associated enrollments (if any)
  const enrollments = await payload.find({
    collection: 'enrollments',
    where: { subject: { equals: subj.id } },
    limit: 100,
    overrideAccess: true,
  })
  console.log(`Found ${enrollments.docs.length} enrollments to delete...`)
  for (const enr of enrollments.docs) {
    await payload.delete({
      collection: 'enrollments',
      id: enr.id,
      overrideAccess: true,
    })
    console.log(`  - Deleted enrollment ${enr.id}`)
  }

  // 3. Delete report links (if any)
  const reportLinks = await payload.find({
    collection: 'reportLinks',
    where: { subject: { equals: subj.id } },
    limit: 100,
    overrideAccess: true,
  })
  console.log(`Found ${reportLinks.docs.length} reportLinks to delete...`)
  for (const rl of reportLinks.docs) {
    await payload.delete({
      collection: 'reportLinks',
      id: rl.id,
      overrideAccess: true,
    })
    console.log(`  - Deleted reportLink ${rl.id}`)
  }

  // 4. Delete subject itself
  await payload.delete({
    collection: 'subjects',
    id: subj.id,
    overrideAccess: true,
  })
  console.log(`Successfully deleted subject [${subj.code}] ${subj.name}!`)

  // 5. Verify remaining subjects
  const remaining = await payload.find({
    collection: 'subjects',
    overrideAccess: true,
  })
  console.log(`Remaining subjects (${remaining.docs.length}):`)
  for (const r of remaining.docs) {
    console.log(`  - [${r.code}] ${r.name}`)
  }

  process.exit(0)
}

deleteSEC401().catch((err) => {
  console.error('Error deleting SEC 401:', err)
  process.exit(1)
})
