import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Terms } from './collections/Terms'
import { Subjects } from './collections/Subjects'
import { Students } from './collections/Students'
import { Enrollments } from './collections/Enrollments'
import { Sessions } from './collections/Sessions'
import { Requests } from './collections/Requests'
import { RateLimits } from './collections/RateLimits'
import { ReportLinks } from './collections/ReportLinks'
import { Announcements } from './collections/Announcements'
import { Resources } from './collections/Resources'
import { Questions } from './collections/Questions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Terms, Subjects, Students, Enrollments, Sessions, Requests, RateLimits, ReportLinks, Announcements, Resources, Questions],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'supersec-local-development-secret-key-32chars-min',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || process.env.DATABASE_URL || '',
    connectOptions: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 7000,
      connectTimeoutMS: 7000,
    },
  }),
  sharp,
})
