import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { createPayloadWechatSearchStore } from './payloadWechatSearchStore'

function fakePayload() {
  const find = vi.fn(async (args: { collection: string }) => {
    if (args.collection === 'members') {
      return {
        docs: [
          {
            aliases: [{ id: 'alias-1', value: '虚构署名' }],
            id: 21,
            name: '虚构成员',
            penName: '虚构笔名',
            searchKeywords: [{ id: 'keyword-1', value: '虚构成员 散文' }],
          },
        ],
      }
    }

    return { docs: [], totalDocs: 0 }
  })
  const create = vi.fn(async (args: { collection: string; data: Record<string, unknown> }) => {
    if (args.collection === 'wechat-search-runs') {
      return {
        ...args.data,
        id: 81,
        runNumber: 'WXSEARCH-20260818-ABCDEF12',
      }
    }

    return {
      ...args.data,
      candidateNumber: 'NEWS-20260818-12345678',
      id: 91,
    }
  })
  const update = vi.fn(async (args: { data: Record<string, unknown> }) => args.data)

  return { create, find, update } as unknown as Payload & {
    create: typeof create
    find: typeof find
    update: typeof update
  }
}

describe('Payload 微信公众号搜索存储适配器', () => {
  it('只读取在册成员的公开检索字段', async () => {
    const payload = fakePayload()
    const store = createPayloadWechatSearchStore(payload)

    await expect(store.getActiveMembers()).resolves.toEqual([
      {
        aliases: [{ value: '虚构署名' }],
        id: 21,
        name: '虚构成员',
        penName: '虚构笔名',
        searchKeywords: [{ value: '虚构成员 散文' }],
      },
    ])
    expect(payload.find).toHaveBeenCalledWith({
      collection: 'members',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      select: {
        aliases: true,
        name: true,
        penName: true,
        searchKeywords: true,
      },
      where: { status: { equals: 'active' } },
    })
    expect(JSON.stringify(payload.find.mock.calls[0])).not.toContain('disability')
    expect(JSON.stringify(payload.find.mock.calls[0])).not.toContain('internalNotes')
  })

  it('通过稳定来源标识检查数据库中是否已有候选', async () => {
    const payload = fakePayload()
    payload.find.mockResolvedValueOnce({ docs: [{ id: 1 }], totalDocs: 1 } as never)
    const store = createPayloadWechatSearchStore(payload)

    await expect(store.candidateExists('wechat:abc123')).resolves.toBe(true)
    expect(payload.find).toHaveBeenCalledWith({
      collection: 'news-candidates',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { sourceReference: { equals: 'wechat:abc123' } },
    })
  })

  it('搜索结果只以待核实自动线索写入，不自动关联成员', async () => {
    const payload = fakePayload()
    const store = createPayloadWechatSearchStore(payload)

    await expect(
      store.createCandidate({
        item: {
          publishedAt: '2026-08-18T00:00:00.000Z',
          sourceName: '虚构公众号',
          summary: '完全虚构的测试摘要。',
          title: '完全虚构的公众号文章',
          url: 'https://mp.weixin.qq.com/s/FICTIONAL_STORE',
        },
        query: '虚构成员',
        sourceReference: 'wechat:fictional-reference',
      }),
    ).resolves.toEqual({ candidateNumber: 'NEWS-20260818-12345678' })

    const call = payload.create.mock.calls.find(
      ([args]) => args.collection === 'news-candidates',
    )?.[0]
    expect(call).toMatchObject({
      collection: 'news-candidates',
      data: {
        category: 'other',
        publishedAt: '2026-08-18T00:00:00.000Z',
        relatedPersonName: '虚构成员',
        sourceName: '虚构公众号',
        sourceReference: 'wechat:fictional-reference',
        sourceType: 'automaticSearch',
        sourceUrl: 'https://mp.weixin.qq.com/s/FICTIONAL_STORE',
        status: 'pending',
        summary: '完全虚构的测试摘要。',
        title: '完全虚构的公众号文章',
      },
      overrideAccess: true,
    })
    expect(call?.data).not.toHaveProperty('relatedMember')
    expect(call?.data).not.toHaveProperty('verificationNotes')
    expect(call?.data).not.toHaveProperty('verifiedAt')
  })

  it('通过服务器权限建立和更新不可伪造的运行记录', async () => {
    const payload = fakePayload()
    const store = createPayloadWechatSearchStore(payload)

    await expect(store.createRun('admin')).resolves.toEqual({
      id: 81,
      runNumber: 'WXSEARCH-20260818-ABCDEF12',
    })
    await store.updateRun(81, {
      apiCallCount: 2,
      completedAt: '2026-08-18T01:00:00.000Z',
      status: 'succeeded',
    })

    expect(payload.create).toHaveBeenCalledWith({
      collection: 'wechat-search-runs',
      data: expect.objectContaining({
        apiCallCount: 0,
        createdCount: 0,
        duplicateCount: 0,
        failedQueryCount: 0,
        memberCount: 0,
        plannedQueryCount: 0,
        resultCount: 0,
        status: 'queued',
        trigger: 'admin',
      }),
      overrideAccess: true,
    })
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'wechat-search-runs',
      data: {
        apiCallCount: 2,
        completedAt: '2026-08-18T01:00:00.000Z',
        status: 'succeeded',
      },
      id: 81,
      overrideAccess: true,
    })
  })
})
