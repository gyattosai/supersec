import { getPayload } from 'payload'
import config from '../src/payload.config'

async function check() {
  const payload = await getPayload({ config })
  const sess = await payload.findByID({
    collection: 'sessions',
    id: '6ac3a00b804126254716a047',
    depth: 2,
    overrideAccess: true,
  })
  console.log('ENTRIES SAMPLE:', JSON.stringify(sess.entries?.slice(0, 2), null, 2))
  process.exit(0)
}
check()
