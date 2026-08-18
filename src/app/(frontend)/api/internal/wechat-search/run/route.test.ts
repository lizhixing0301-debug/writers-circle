import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

import type { StartWechatSearchResult } from '../../../../../../wechatSearch/startWechatSearch'
import { createWechatSearchRoute } from './wechatSearchRoute'

function request() {
  return new Request('http://localhost/api/internal/wechat-search/run', {
    method: 'POST',
  })
}

function fakePayload(user: null | { id: number }) {
  return {
    auth: vi.fn(async () => ({ permissions: {}, user })),
  } as unknown as Payload
}

describe('管理员启动微信公众号搜索接口', () => {
  it('未登录请求返回401且不启动搜索', async () => {
    const payload = fakePayload(null)
    const start = vi.fn()
    const POST = createWechatSearchRoute({
      getPayload: async () => payload,
      start,
    })

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: '请先登录后台再启动搜索。' })
    expect(start).not.toHaveBeenCalled()
  })

  it('已登录管理员启动新任务时返回202和搜索编号', async () => {
    const payload = fakePayload({ id: 1 })
    const start = vi.fn(async (): Promise<StartWechatSearchResult> => ({
      kind: 'started',
      runNumber: 'WXSEARCH-20260818-ABCDEF12',
    }))
    const POST = createWechatSearchRoute({
      getPayload: async () => payload,
      start,
    })

    const response = await POST(request())

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({
      message: '搜索任务已经开始，请稍后查看“公众号搜索记录”。',
      runNumber: 'WXSEARCH-20260818-ABCDEF12',
    })
    expect(start).toHaveBeenCalledWith(payload)
  })

  it('已有任务运行时返回200和同一个搜索编号', async () => {
    const payload = fakePayload({ id: 1 })
    const start = vi.fn(async (): Promise<StartWechatSearchResult> => ({
      kind: 'alreadyRunning',
      runNumber: 'WXSEARCH-20260818-RUNNING1',
    }))
    const POST = createWechatSearchRoute({
      getPayload: async () => payload,
      start,
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: '已有搜索任务正在运行，请勿重复点击。',
      runNumber: 'WXSEARCH-20260818-RUNNING1',
    })
  })

  it('内部异常时只返回通用错误', async () => {
    const payload = fakePayload({ id: 1 })
    const POST = createWechatSearchRoute({
      getPayload: async () => payload,
      start: async () => {
        throw new Error('private database and fictional-token details')
      },
    })

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ message: '搜索任务暂时无法启动，请稍后再试。' })
    expect(JSON.stringify(body)).not.toContain('fictional-token')
    expect(JSON.stringify(body)).not.toContain('private database')
  })
})
