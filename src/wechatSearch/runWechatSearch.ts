import type { WechatArticleSearchProvider } from './justOneApiProvider'
import { buildWechatSearchJobs } from './searchTerms'
import type {
  WechatSearchRun,
  WechatSearchRunStatus,
  WechatSearchStore,
  WechatSearchTrigger,
} from './searchTypes'
import { createWechatArticleReference } from './wechatArticleIdentity'

const MAXIMUM_QUERIES_PER_RUN = 64

export type WechatSearchStatistics = {
  apiCallCount: number
  createdCount: number
  duplicateCount: number
  failedQueryCount: number
  memberCount: number
  plannedQueryCount: number
  resultCount: number
  status: Extract<WechatSearchRunStatus, 'failed' | 'partial' | 'succeeded'>
}

type ExecuteOptions = {
  maximumQueries?: number
  now?: () => Date
  provider: WechatArticleSearchProvider
  run: WechatSearchRun
  store: WechatSearchStore
}

type RunOptions = Omit<ExecuteOptions, 'run'> & {
  trigger: WechatSearchTrigger
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof Error) {
    const safePrefixes = [
      '公众号搜索服务',
      '当前账号',
      '暂时无法连接公众号搜索服务',
      '搜索结果格式不符合',
    ]

    if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) {
      return error.message.slice(0, 300)
    }
  }

  return '搜索服务或数据写入暂时失败。'
}

function finalStatus(failed: number, planned: number): WechatSearchStatistics['status'] {
  if (failed === 0) return 'succeeded'
  if (planned > 0 && failed === planned) return 'failed'
  return 'partial'
}

function emptyStatistics(): Omit<WechatSearchStatistics, 'status'> {
  return {
    apiCallCount: 0,
    createdCount: 0,
    duplicateCount: 0,
    failedQueryCount: 0,
    memberCount: 0,
    plannedQueryCount: 0,
    resultCount: 0,
  }
}

export async function executeWechatSearchRun({
  maximumQueries = MAXIMUM_QUERIES_PER_RUN,
  now = () => new Date(),
  provider,
  run,
  store,
}: ExecuteOptions): Promise<WechatSearchStatistics> {
  const statistics = emptyStatistics()
  const startedAt = now().toISOString()

  await store.updateRun(run.id, { startedAt, status: 'running' })

  try {
    const members = await store.getActiveMembers()
    const limit = Math.min(
      MAXIMUM_QUERIES_PER_RUN,
      Math.max(0, Math.floor(maximumQueries)),
    )
    const jobs = buildWechatSearchJobs(members, limit)
    statistics.memberCount = members.length
    statistics.plannedQueryCount = jobs.length

    await store.updateRun(run.id, {
      memberCount: statistics.memberCount,
      plannedQueryCount: statistics.plannedQueryCount,
    })

    const seenReferences = new Set<string>()
    const errors: string[] = []

    for (const [index, job] of jobs.entries()) {
      statistics.apiCallCount += 1

      try {
        const items = await provider.search(job.query)
        statistics.resultCount += items.length

        for (const item of items) {
          const sourceReference = createWechatArticleReference(item.url)
          if (!sourceReference) continue

          if (seenReferences.has(sourceReference)) {
            statistics.duplicateCount += 1
            continue
          }
          seenReferences.add(sourceReference)

          if (await store.candidateExists(sourceReference)) {
            statistics.duplicateCount += 1
            continue
          }

          await store.createCandidate({ item, query: job.query, sourceReference })
          statistics.createdCount += 1
        }
      } catch (error) {
        statistics.failedQueryCount += 1
        errors.push(`第 ${index + 1} 个搜索词：${safeFailureMessage(error)}`)
      }
    }

    const status = finalStatus(
      statistics.failedQueryCount,
      statistics.plannedQueryCount,
    )
    const completedAt = now().toISOString()
    const errorSummary = errors.length > 0 ? errors.join('\n').slice(0, 5000) : null

    await store.updateRun(run.id, {
      ...statistics,
      completedAt,
      errorSummary,
      status,
    })

    return { ...statistics, status }
  } catch (error) {
    const status = 'failed' as const
    const completedAt = now().toISOString()

    await store.updateRun(run.id, {
      ...statistics,
      completedAt,
      errorSummary: safeFailureMessage(error),
      status,
    })

    return { ...statistics, status }
  }
}

export async function runWechatSearch({
  maximumQueries,
  now,
  provider,
  store,
  trigger,
}: RunOptions): Promise<{
  run: WechatSearchRun
  statistics: WechatSearchStatistics
}> {
  const run = await store.createRun(trigger)
  const statistics = await executeWechatSearchRun({
    maximumQueries,
    now,
    provider,
    run,
    store,
  })

  return { run, statistics }
}
