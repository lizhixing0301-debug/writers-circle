import type { Payload } from 'payload'

import { optionalEnvironment } from '../config/env'
import {
  createJustOneApiWechatProvider,
  type WechatArticleSearchProvider,
} from './justOneApiProvider'
import { createPayloadWechatSearchStore } from './payloadWechatSearchStore'
import {
  executeWechatSearchRun,
  type WechatSearchStatistics,
} from './runWechatSearch'
import type { WechatSearchRun, WechatSearchStore } from './searchTypes'

export type StartWechatSearchResult =
  | { kind: 'alreadyRunning'; runNumber: string }
  | { kind: 'started'; runNumber: string }

type StarterDependencies = {
  createProvider?: (options: {
    baseUrl?: string
    token: string
  }) => WechatArticleSearchProvider
  createStore?: (payload: Payload) => WechatSearchStore
  executeRun?: (options: {
    provider: WechatArticleSearchProvider
    run: WechatSearchRun
    store: WechatSearchStore
  }) => Promise<WechatSearchStatistics>
  getConfiguration?: () => { baseUrl?: string; token?: string }
  now?: () => Date
}

function defaultConfiguration() {
  return {
    baseUrl: optionalEnvironment('WECHAT_SEARCH_API_BASE_URL'),
    token: optionalEnvironment('WECHAT_SEARCH_API_TOKEN'),
  }
}

async function markConfigurationFailure(
  store: WechatSearchStore,
  run: WechatSearchRun,
  now: () => Date,
  errorSummary: string,
) {
  const failedAt = now().toISOString()

  await store.updateRun(run.id, {
    completedAt: failedAt,
    errorSummary,
    startedAt: failedAt,
    status: 'failed',
  })
}

export function createWechatSearchStarter({
  createProvider = createJustOneApiWechatProvider,
  createStore = createPayloadWechatSearchStore,
  executeRun = executeWechatSearchRun,
  getConfiguration = defaultConfiguration,
  now = () => new Date(),
}: StarterDependencies = {}) {
  let starting:
    | null
    | Promise<{ kind: 'started'; runNumber: string }> = null
  let active:
    | null
    | {
        completion: Promise<WechatSearchStatistics | undefined>
        runNumber: string
      } = null

  async function begin(payload: Payload): Promise<{
    kind: 'started'
    runNumber: string
  }> {
    const store = createStore(payload)
    const run = await store.createRun('admin')
    const configuration = getConfiguration()
    const token = configuration.token?.trim() ?? ''

    if (!token) {
      await markConfigurationFailure(
        store,
        run,
        now,
        '尚未配置微信公众号搜索服务 Token。',
      )
      return { kind: 'started', runNumber: run.runNumber }
    }

    let provider: WechatArticleSearchProvider

    try {
      provider = createProvider({
        baseUrl: configuration.baseUrl?.trim() || undefined,
        token,
      })
    } catch {
      await markConfigurationFailure(
        store,
        run,
        now,
        '微信公众号搜索服务地址配置不正确。',
      )
      return { kind: 'started', runNumber: run.runNumber }
    }

    const completion = Promise.resolve()
      .then(() => executeRun({ provider, run, store }))
      .catch(async () => {
        const failedAt = now().toISOString()

        try {
          await store.updateRun(run.id, {
            completedAt: failedAt,
            errorSummary: '搜索任务意外中断，请稍后重新运行。',
            status: 'failed',
          })
        } catch {
          // 数据库不可用时没有安全的持久化位置；避免产生未处理异常。
        }

        return undefined
      })

    active = { completion, runNumber: run.runNumber }
    void completion.finally(() => {
      if (active?.completion === completion) active = null
    })

    return { kind: 'started', runNumber: run.runNumber }
  }

  return async function startWechatSearch(payload: Payload): Promise<StartWechatSearchResult> {
    if (active) {
      return { kind: 'alreadyRunning', runNumber: active.runNumber }
    }

    if (starting) {
      const result = await starting
      return { kind: 'alreadyRunning', runNumber: result.runNumber }
    }

    const currentStart = begin(payload)
    starting = currentStart

    try {
      return await currentStart
    } finally {
      if (starting === currentStart) starting = null
    }
  }
}

export const startWechatSearch = createWechatSearchStarter()
