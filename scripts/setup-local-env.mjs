import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const environmentPath = resolve(process.cwd(), '.env')

if (existsSync(environmentPath)) {
  console.log('本地 .env 已存在，未作修改。')
  process.exit(0)
}

const payloadSecret = randomBytes(32).toString('hex')
const contents = [
  'DATABASE_URI=postgresql://localhost:5432/writers_circle',
  `PAYLOAD_SECRET=${payloadSecret}`,
  '',
].join('\n')

writeFileSync(environmentPath, contents, { encoding: 'utf8', mode: 0o600 })
console.log('已创建本地 .env；PAYLOAD_SECRET 已随机生成且不会显示。')

