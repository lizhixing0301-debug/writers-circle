import { afterEach, describe, expect, it } from 'vitest'

import { requireEnvironment } from './env'

const originalDatabaseUri = process.env.DATABASE_URI

afterEach(() => {
  if (originalDatabaseUri === undefined) {
    delete process.env.DATABASE_URI
  } else {
    process.env.DATABASE_URI = originalDatabaseUri
  }
})

describe('requireEnvironment', () => {
  it('返回已经配置的非空环境变量', () => {
    process.env.DATABASE_URI = 'postgresql://localhost:5432/writers_circle'

    expect(requireEnvironment('DATABASE_URI')).toBe(
      'postgresql://localhost:5432/writers_circle',
    )
  })

  it('在必需环境变量缺失时给出明确错误', () => {
    delete process.env.DATABASE_URI

    expect(() => requireEnvironment('DATABASE_URI')).toThrow(
      'Missing required environment variable: DATABASE_URI',
    )
  })
})
