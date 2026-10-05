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

async function check() {
  const payload = await getPayload({ config })
  const users = await payload.find({ collection: 'users', overrideAccess: true })
  console.log('USERS_FOUND:', JSON.stringify(users.docs.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role }))))
  process.exit(0)
}

check()
