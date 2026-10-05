import { getPayload } from 'payload'
import config from '../src/payload.config'

async function run() {
  const payload = await getPayload({ config })
  const subjects = await payload.find({ collection: 'subjects', limit: 100 })
  console.log(`Total subjects in MongoDB: ${subjects.docs.length}`)
  for (const s of subjects.docs) {
    console.log(`- [${s.code}] ${s.name} (ID: ${s.id}, section: ${s.sectionMark || 'none'})`)
    console.log(`  Schedule:`, JSON.stringify(s.schedule))
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
