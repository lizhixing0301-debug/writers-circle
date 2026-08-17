import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'

import { Media } from './collections/Media'
import { Members } from './collections/Members'
import { NewsCandidates } from './collections/NewsCandidates'
import { Submissions } from './collections/Submissions'
import { Users } from './collections/Users'
import { requireEnvironment } from './config/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  bodyParser: {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  },
  collections: [Users, Members, Media, Submissions, NewsCandidates],
  db: postgresAdapter({
    pool: {
      connectionString: requireEnvironment('DATABASE_URI'),
    },
  }),
  secret: requireEnvironment('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
