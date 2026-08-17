import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getPayloadMock } = vi.hoisted(() => ({
  getPayloadMock: vi.fn(),
}))

vi.mock('payload', () => ({
  getPayload: getPayloadMock,
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

import { POST } from './route'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    category: 'prose',
    contact: 'fictional-wechat-contact',
    content: '这是一篇完全虚构、只用于自动化测试的投稿正文。',
    notes: '',
    penName: '测试笔名',
    requestToken: randomUUID(),
    rightsConfirmed: true,
    submitterName: '虚构投稿人',
    title: '虚构测试稿件',
    website: '',
    ...overrides,
  }
}

function request(body: unknown, source = `test-${randomUUID()}`) {
  return new Request('http://localhost/api/public/submissions', {
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': source,
    },
    method: 'POST',
  })
}

function fakePayload(options: { createError?: Error } = {}) {
  return {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      if (options.createError) throw options.createError
      return {
        ...data,
        createdAt: '2026-08-17T00:00:00.000Z',
        id: 1,
        updatedAt: '2026-08-17T00:00:00.000Z',
      }
    }),
    find: vi.fn(async () => ({
      docs: [],
      hasNextPage: false,
      hasPrevPage: false,
      limit: 1,
      nextPage: null,
      page: 1,
      pagingCounter: 1,
      prevPage: null,
      totalDocs: 0,
      totalPages: 0,
    })),
  }
}

describe('公开投稿接口', () => {
  beforeEach(() => {
    getPayloadMock.mockReset()
    getPayloadMock.mockResolvedValue(fakePayload())
  })

  it('成功时只返回服务器生成的投稿编号', async () => {
    const response = await POST(request(validBody()))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(Object.keys(body)).toEqual(['submissionNumber'])
    expect(body.submissionNumber).toMatch(/^WC-\d{8}-[A-F0-9]{8}$/)
    expect(JSON.stringify(body)).not.toContain('fictional-wechat-contact')
    expect(JSON.stringify(body)).not.toContain('虚构测试稿件')
  })

  it('JSON 损坏时返回通俗的 400 错误', async () => {
    const response = await POST(
      new Request('http://localhost/api/public/submissions', {
        body: '{broken-json',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      message: '投稿内容格式不正确，请刷新页面后重试。',
    })
  })

  it('字段校验失败时返回对应错误且不泄露稿件', async () => {
    const response = await POST(request(validBody({ title: '' })))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({
      fieldErrors: { title: '请填写文章标题。' },
      message: '请检查标出的内容后再提交。',
    })
    expect(JSON.stringify(body)).not.toContain('fictional-wechat-contact')
  })

  it('同一来源十分钟内第六次投稿返回 429', async () => {
    const source = `rate-limit-${randomUUID()}`

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(request(validBody(), source))
      expect(response.status).toBe(201)
    }

    const blocked = await POST(request(validBody(), source))

    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({
      message: '提交次数较多，请十分钟后再试。',
    })
  })

  it('数据库异常时只返回通用错误', async () => {
    getPayloadMock.mockResolvedValue(
      fakePayload({ createError: new Error('private database details') }),
    )

    const response = await POST(request(validBody()))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ message: '投稿暂时未成功，请稍后再试。' })
    expect(JSON.stringify(body)).not.toContain('private database details')
    expect(JSON.stringify(body)).not.toContain('fictional-wechat-contact')
  })
})
