import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { WechatArticleSearchProvider } from './justOneApiProvider'
import type { WechatSearchStatistics } from './runWechatSearch'
import type { WechatSearchRunUpdate, WechatSearchStore } from './searchTypes'
import { createWechatSearchStarter } from './startWechatSearch'

const finishedStatistics: WechatSearchStatistics = {
  apiCallCount: 0,
  createdCount: 0,
  duplicateCount: 0,
  failedQueryCount: 0,
  memberCount: 0,
  plannedQueryCount: 0,
  resultCount: 0,
  status: 'succeeded',
}

function fakeStore() {
  let runCount = 0
  const updates: WechatSearchRunUpdate[] = []
  const store: WechatSearchStore = {
    async candidateExists() {
      return false
    },
    async createCandidate() {
      return { candidateNumber: 'NEWS-FICTIONAL' }
    },
    async createRun() {
      runCount += 1
      return { id: runCount, runNumber: `WXSEARCH-FICTIONAL-${runCount}` }
    },
    async getActiveMembers() {
      return []
    },
    async updateRun(_id, update) {
      updates.push(update)
    },
  }

  return { getRunCount: () => runCount, store, updates }
}

describe('启动微信公众号搜索', () => {
  it('并发点击只建立一个任务，并返回同一个搜索编号', async () => {
    const memory = fakeStore()
    let finish: ((statistics: WechatSearchStatistics) => void) | undefined
    const executeRun = vi.fn(
      () =>
        new Promise<WechatSearchStatistics>((resolve) => {
          finish = resolve
        }),
    )
    const starter = createWechatSearchStarter({
      createProvider: () => ({ search: vi.fn() }) as WechatArticleSearchProvider,
      createStore: () => memory.store,
      executeRun,
      getConfiguration: () => ({ token: 'fictional-token' }),
    })
    const payload = {} as Payload

    const [first, second] = await Promise.all([starter(payload), starter(payload)])

    expect(first).toEqual({ kind: 'started', runNumber: 'WXSEARCH-FICTIONAL-1' })
    expect(second).toEqual({
      kind: 'alreadyRunning',
      runNumber: 'WXSEARCH-FICTIONAL-1',
    })
    expect(memory.getRunCount()).toBe(1)
    expect(executeRun).toHaveBeenCalledTimes(1)

    finish?.(finishedStatistics)
    await new Promise((resolve) => setTimeout(resolve, 0))

    await expect(starter(payload)).resolves.toEqual({
      kind: 'started',
      runNumber: 'WXSEARCH-FICTIONAL-2',
    })
    expect(memory.getRunCount()).toBe(2)
  })

  it('缺少 Token 时建立失败记录，不调用外部服务也不泄露配置', async () => {
    const memory = fakeStore()
    const createProvider = vi.fn()
    const executeRun = vi.fn()
    const starter = createWechatSearchStarter({
      createProvider,
      createStore: () => memory.store,
      executeRun,
      getConfiguration: () => ({ token: '   ' }),
      now: () => new Date('2026-08-18T04:00:00.000Z'),
    })

    await expect(starter({} as Payload)).resolves.toEqual({
      kind: 'started',
      runNumber: 'WXSEARCH-FICTIONAL-1',
    })
    expect(createProvider).not.toHaveBeenCalled()
    expect(executeRun).not.toHaveBeenCalled()
    expect(memory.updates).toEqual([
      {
        completedAt: '2026-08-18T04:00:00.000Z',
        errorSummary: '尚未配置微信公众号搜索服务 Token。',
        startedAt: '2026-08-18T04:00:00.000Z',
        status: 'failed',
      },
    ])
  })

  it('整理 Token 后交给提供者，并保留 HTTPS 自定义地址', async () => {
    const memory = fakeStore()
    const createProvider = vi.fn(
      () => ({ search: vi.fn() }) as WechatArticleSearchProvider,
    )
    const executeRun = vi.fn(async () => finishedStatistics)
    const starter = createWechatSearchStarter({
      createProvider,
      createStore: () => memory.store,
      executeRun,
      getConfiguration: () => ({
        baseUrl: ' https://fictional-api.example ',
        token: ' fictional-token ',
      }),
    })

    await starter({} as Payload)

    expect(createProvider).toHaveBeenCalledWith({
      baseUrl: 'https://fictional-api.example',
      token: 'fictional-token',
    })
  })

  it('服务地址配置错误时只写入安全的失败说明', async () => {
    const memory = fakeStore()
    const starter = createWechatSearchStarter({
      createProvider: () => {
        throw new Error('private address details must use HTTPS fictional-token')
      },
      createStore: () => memory.store,
      getConfiguration: () => ({ token: 'fictional-token' }),
      now: () => new Date('2026-08-18T05:00:00.000Z'),
    })

    await starter({} as Payload)

    expect(memory.updates.at(-1)).toEqual({
      completedAt: '2026-08-18T05:00:00.000Z',
      errorSummary: '微信公众号搜索服务地址配置不正确。',
      startedAt: '2026-08-18T05:00:00.000Z',
      status: 'failed',
    })
    expect(JSON.stringify(memory.updates)).not.toContain('fictional-token')
    expect(JSON.stringify(memory.updates)).not.toContain('private address')
  })
})
