import { getPayload } from 'payload'
import config from '../src/payload.config'

async function resetPassword() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  const payload = await getPayload({ config })

  if (!email || !newPassword) {
    console.log('--- SuperSec Secretary Accounts ---')
    const all = await payload.find({ collection: 'users', overrideAccess: true })
    if (all.docs.length === 0) {
      console.log('No secretary accounts found in database.')
    } else {
      for (const u of all.docs) {
        console.log(`- ${u.email} (${u.name}, role: ${u.role})`)
      }
    }
    console.log('\nUsage to reset password:')
    console.log('pnpm tsx --env-file=.env.local scripts/reset-secretary-password.ts <email> <newPassword>')
    process.exit(1)
  }

  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: email.trim().toLowerCase() } },
    overrideAccess: true,
  })

  if (users.docs.length === 0) {
    console.error(`❌ User with email "${email}" not found.`)
    const all = await payload.find({ collection: 'users', overrideAccess: true })
    console.log('Existing registered emails:', all.docs.map((u) => u.email).join(', '))
    process.exit(1)
  }

  const user = users.docs[0]
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      password: newPassword,
    },
    overrideAccess: true,
  })

  console.log(`✅ Successfully updated password for ${user.email} (${user.name})!`)
  process.exit(0)
}

resetPassword().catch((err) => {
  console.error('❌ Failed to reset password:', err)
  process.exit(1)
})
