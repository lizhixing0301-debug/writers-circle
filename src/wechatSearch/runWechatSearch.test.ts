import { describe, expect, it } from 'vitest'

import type { WechatArticleSearchItem, WechatArticleSearchProvider } from './justOneApiProvider'
import { createWechatArticleReference } from './wechatArticleIdentity'
import { runWechatSearch } from './runWechatSearch'
import type {
  WechatCandidateInput,
  WechatSearchRunUpdate,
  WechatSearchStore,
  WechatSearchTrigger,
} from './searchTypes'
import type { WechatSearchMember } from './searchTerms'

const articleOne: WechatArticleSearchItem = {
  sourceName: '虚构公众号甲',
  summary: '完全虚构的第一条摘要。',
  title: '完全虚构的第一篇文章',
  url: 'https://mp.weixin.qq.com/s/FICTIONAL_RUN_ONE',
}
const articleTwo: WechatArticleSearchItem = {
  sourceName: '虚构公众号乙',
  title: '完全虚构的第二篇文章',
  url: 'https://mp.weixin.qq.com/s/FICTIONAL_RUN_TWO',
}
const articleThree: WechatArticleSearchItem = {
  title: '数据库中已经存在的虚构文章',
  url: 'https://mp.weixin.qq.com/s/FICTIONAL_RUN_EXISTING',
}

class MemoryStore implements WechatSearchStore {
  candidates: WechatCandidateInput[] = []
  existing = new Set<string>()
  members: WechatSearchMember[] = []
  runUpdates: WechatSearchRunUpdate[] = []
  trigger?: WechatSearchTrigger

  async candidateExists(sourceReference: string) {
    return this.existing.has(sourceReference)
  }

  async createCandidate(input: WechatCandidateInput) {
    this.candidates.push(input)
    this.existing.add(input.sourceReference)
    return { candidateNumber: `NEWS-FICTIONAL-${this.candidates.length}` }
  }

  async createRun(trigger: WechatSearchTrigger) {
    this.trigger = trigger
    return { id: 71, runNumber: 'WXSEARCH-20260818-FICTIONAL' }
  }

  async getActiveMembers() {
    return this.members
  }

  async updateRun(_id: number | string, data: WechatSearchRunUpdate) {
    this.runUpdates.push(data)
  }
}

class QueryProvider implements WechatArticleSearchProvider {
  calls: string[] = []
  results = new Map<string, Error | WechatArticleSearchItem[]>()

  async search(query: string) {
    this.calls.push(query)
    const result = this.results.get(query) ?? []
    if (result instanceof Error) throw result
    return result
  }
}

function finalUpdate(store: MemoryStore) {
  return store.runUpdates.at(-1)
}

describe('微信公众号文章搜索运行', () => {
  it('创建新候选，并统计同次重复和数据库已有文章', async () => {
    const store = new MemoryStore()
    store.members = [
      { id: 1, name: '虚构成员甲' },
      { id: 2, name: '虚构成员乙' },
    ]
    const existingReference = createWechatArticleReference(articleThree.url)
    if (!existingReference) throw new Error('虚构测试网址应当有效。')
    store.existing.add(existingReference)

    const provider = new QueryProvider()
    provider.results.set('虚构成员甲', [articleOne, articleTwo])
    provider.results.set('虚构成员乙', [articleTwo, articleThree])

    const result = await runWechatSearch({
      now: () => new Date('2026-08-18T03:00:00.000Z'),
      provider,
      store,
      trigger: 'verification',
    })

    expect(result).toEqual({
      run: { id: 71, runNumber: 'WXSEARCH-20260818-FICTIONAL' },
      statistics: {
        apiCallCount: 2,
        createdCount: 2,
        duplicateCount: 2,
        failedQueryCount: 0,
        memberCount: 2,
        plannedQueryCount: 2,
        resultCount: 4,
        status: 'succeeded',
      },
    })
    expect(store.trigger).toBe('verification')
    expect(provider.calls).toEqual(['虚构成员甲', '虚构成员乙'])
    expect(store.candidates).toHaveLength(2)
    expect(store.candidates[0]).toMatchObject({
      item: articleOne,
      query: '虚构成员甲',
      sourceReference: expect.stringMatching(/^wechat:[a-f0-9]{64}$/),
    })
    expect(JSON.stringify(store.candidates)).not.toContain('relatedMember')
    expect(finalUpdate(store)).toEqual({
      apiCallCount: 2,
      completedAt: '2026-08-18T03:00:00.000Z',
      createdCount: 2,
      duplicateCount: 2,
      errorSummary: null,
      failedQueryCount: 0,
      memberCount: 2,
      plannedQueryCount: 2,
      resultCount: 4,
      status: 'succeeded',
    })
  })

  it('单个搜索词失败时继续其他搜索并标记部分成功', async () => {
    const store = new MemoryStore()
    store.members = [
      { id: 1, name: '虚构失败成员' },
      { id: 2, name: '虚构成功成员' },
    ]
    const provider = new QueryProvider()
    provider.results.set(
      '虚构失败成员',
      new Error('private upstream detail and fictional-secret-token'),
    )
    provider.results.set('虚构成功成员', [articleOne])

    const result = await runWechatSearch({ provider, store, trigger: 'admin' })

    expect(result.statistics).toMatchObject({
      apiCallCount: 2,
      createdCount: 1,
      failedQueryCount: 1,
      status: 'partial',
    })
    expect(provider.calls).toEqual(['虚构失败成员', '虚构成功成员'])
    expect(finalUpdate(store)?.errorSummary).toContain('第 1 个搜索词')
    expect(finalUpdate(store)?.errorSummary).not.toContain('private upstream')
    expect(finalUpdate(store)?.errorSummary).not.toContain('fictional-secret-token')
    expect(finalUpdate(store)?.errorSummary).not.toContain('虚构失败成员')
  })

  it('所有搜索词失败时记录失败，而不是伪造成功', async () => {
    const store = new MemoryStore()
    store.members = [{ id: 1, name: '虚构成员' }]
    const provider = new QueryProvider()
    provider.results.set('虚构成员', new Error('fictional failure'))

    const result = await runWechatSearch({ provider, store, trigger: 'admin' })

    expect(result.statistics).toMatchObject({
      apiCallCount: 1,
      createdCount: 0,
      failedQueryCount: 1,
      status: 'failed',
    })
    expect(store.candidates).toEqual([])
  })

  it('没有在册成员时零调用完成，并留下可核对的零统计', async () => {
    const store = new MemoryStore()
    const provider = new QueryProvider()

    const result = await runWechatSearch({ provider, store, trigger: 'admin' })

    expect(result.statistics).toEqual({
      apiCallCount: 0,
      createdCount: 0,
      duplicateCount: 0,
      failedQueryCount: 0,
      memberCount: 0,
      plannedQueryCount: 0,
      resultCount: 0,
      status: 'succeeded',
    })
    expect(provider.calls).toEqual([])
  })

  it('即使调用者要求更多查询，也仍执行全局64次上限', async () => {
    const store = new MemoryStore()
    store.members = Array.from({ length: 40 }, (_, index) => ({
      id: index,
      name: `成员${index}`,
      penName: `笔名${index}`,
    }))
    const provider = new QueryProvider()

    const result = await runWechatSearch({
      maximumQueries: 999,
      provider,
      store,
      trigger: 'admin',
    })

    expect(provider.calls).toHaveLength(64)
    expect(result.statistics.plannedQueryCount).toBe(64)
  })
})
