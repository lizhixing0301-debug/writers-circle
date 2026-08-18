import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

describe('Docker Compose deployment configuration', () => {
  it('uses a standalone application build', () => {
    expect(readProjectFile('next.config.mjs')).toContain("output: 'standalone'")
  })

  it('keeps secrets out of the Docker build context', () => {
    const ignored = readProjectFile('.dockerignore')

    expect(ignored).toContain('.env')
    expect(ignored).toContain('node_modules')
    expect(ignored).toContain('.postgres')
    expect(ignored).toContain('media')
  })

  it('starts Postgres, migrations and the application with persistent volumes', () => {
    const compose = readProjectFile('docker-compose.yml')

    expect(compose).toContain('postgres:')
    expect(compose).toContain('migrate:')
    expect(compose).toContain('app:')
    expect(compose).toContain('postgres_data:')
    expect(compose).toContain('media_data:')
    expect(compose).toContain('service_healthy')
    expect(compose).toContain('service_completed_successfully')
    expect(compose).toContain('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:')
    expect(compose).not.toContain('PAYLOAD_SECRET: real-')
    expect(compose).not.toContain('POSTGRES_PASSWORD: real-')
  })

  it('publishes an environment template without real secrets', () => {
    const environmentTemplate = readProjectFile('.env.docker.example')

    expect(environmentTemplate).toContain('POSTGRES_PASSWORD=')
    expect(environmentTemplate).toContain('PAYLOAD_SECRET=')
    expect(environmentTemplate).toContain('WECHAT_SEARCH_API_TOKEN=')
    expect(environmentTemplate).not.toContain('api.justoneapi.com')
  })

  it('keeps Payload migrations with the source code', () => {
    expect(readProjectFile('src/payload.config.ts')).toContain("migrationDir: path.resolve(dirname, 'migrations')")
  })

  it('does not export test helpers from Next.js route modules', () => {
    const route = readProjectFile(
      'src/app/(frontend)/api/internal/wechat-search/run/route.ts',
    )

    expect(route).not.toContain('export function createWechatSearchRoute')
  })

  it('uses the proven production build command in Docker', () => {
    const packageJson = readProjectFile('package.json')

    expect(packageJson).toContain('"build": "next build --webpack"')
  })
})
