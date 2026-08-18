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

import { GET } from './route'

describe('健康检查接口', () => {
  beforeEach(() => {
    getPayloadMock.mockReset()
  })

  it('数据库可用时只返回健康状态', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    getPayloadMock.mockResolvedValue({ find })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(find).toHaveBeenCalledWith({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
  })

  it('数据库不可用时不泄露内部错误', async () => {
    getPayloadMock.mockRejectedValue(new Error('private connection detail'))

    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false })
  })
})
