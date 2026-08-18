import { afterEach, describe, expect, it } from 'vitest'

import { optionalEnvironment, requireEnvironment } from './env'

const originalDatabaseUri = process.env.DATABASE_URI
const originalWechatToken = process.env.WECHAT_SEARCH_API_TOKEN

afterEach(() => {
  if (originalDatabaseUri === undefined) {
    delete process.env.DATABASE_URI
  } else {
    process.env.DATABASE_URI = originalDatabaseUri
  }

  if (originalWechatToken === undefined) {
    delete process.env.WECHAT_SEARCH_API_TOKEN
  } else {
    process.env.WECHAT_SEARCH_API_TOKEN = originalWechatToken
  }
})

describe('optionalEnvironment', () => {
  it('返回整理过的可选环境变量', () => {
    process.env.WECHAT_SEARCH_API_TOKEN = '  fictional-token  '

    expect(optionalEnvironment('WECHAT_SEARCH_API_TOKEN')).toBe('fictional-token')
  })

  it('缺失或空白的可选环境变量返回 undefined', () => {
    delete process.env.WECHAT_SEARCH_API_TOKEN
    expect(optionalEnvironment('WECHAT_SEARCH_API_TOKEN')).toBeUndefined()

    process.env.WECHAT_SEARCH_API_TOKEN = '   '
    expect(optionalEnvironment('WECHAT_SEARCH_API_TOKEN')).toBeUndefined()
  })
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
