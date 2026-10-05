import fs from 'fs'
import path from 'path'

try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
} catch {
  // ignore
}

import { getPayload } from 'payload'
import config from '../src/payload.config'
import { runV1Migration } from '../src/lib/data/migrate-v1'

async function main() {
  console.log('🚀 Starting SuperSec v1 to v2 Data Migration...')
  const startTime = Date.now()

  try {
    const payload = await getPayload({ config })
    const stats = await runV1Migration(payload)

    console.log('✅ Migration completed successfully in', ((Date.now() - startTime) / 1000).toFixed(2), 'seconds!')
    console.log('📊 Migration Summary:')
    console.log('  - Terms created:              ', stats.terms)
    console.log('  - Subjects migrated:          ', stats.subjects)
    console.log('  - Students migrated:          ', stats.students)
    console.log('  - Enrollments migrated:       ', stats.enrollments)
    console.log('  - Sessions migrated:          ', stats.sessions)
    console.log('  - Attendance records parsed:  ', stats.attendanceRecordsProcessed)

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
