import { getPayload } from 'payload'
import config from '../src/payload.config'

async function verify() {
  const payload = await getPayload({ config })
  const terms = await payload.count({ collection: 'terms' })
  const subjects = await payload.count({ collection: 'subjects' })
  const students = await payload.count({ collection: 'students' })
  const enrollments = await payload.count({ collection: 'enrollments' })
  const sessions = await payload.count({ collection: 'sessions' })

  console.log('MongoDB Atlas Collection Counts:')
  console.log('  - Terms:       ', terms.totalDocs)
  console.log('  - Subjects:    ', subjects.totalDocs)
  console.log('  - Students:    ', students.totalDocs)
  console.log('  - Enrollments: ', enrollments.totalDocs)
  console.log('  - Sessions:    ', sessions.totalDocs)

  // Sample check a session with Conflict attendance
  const sampleSession = await payload.find({
    collection: 'sessions',
    where: {
      'entries.attendance': { equals: 'C' },
    },
    limit: 1,
  })

  if (sampleSession.docs.length > 0) {
    const s = sampleSession.docs[0]
    const conflictEntries = (s.entries || []).filter((e) => e.attendance === 'C')
    console.log(`  - Found session on ${s.date} with ${conflictEntries.length} schedule conflict ('C') entries.`)
  } else {
    console.log('  - Note: No sessions found with attendance == C yet.')
  }

  process.exit(0)
}

verify().catch((err) => {
  console.error('Verification error:', err)
  process.exit(1)
})
