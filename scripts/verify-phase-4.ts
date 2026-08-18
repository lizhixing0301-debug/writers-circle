import { randomUUID } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type {
  WechatArticleSearchItem,
  WechatArticleSearchProvider,
} from '../src/wechatSearch/justOneApiProvider'
import { createPayloadWechatSearchStore } from '../src/wechatSearch/payloadWechatSearchStore'
import { runWechatSearch } from '../src/wechatSearch/runWechatSearch'
import { createWechatArticleReference } from '../src/wechatSearch/wechatArticleIdentity'

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000'
const runId = randomUUID().slice(0, 8)
const memberSlug = `phase-4-fictional-${runId}`
const articleUrl = `https://mp.weixin.qq.com/s/PHASE4_FICTIONAL_${runId}`
const sourceReference = createWechatArticleReference(articleUrl)
const createdRunNumbers: string[] = []

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

requireCondition(sourceReference, 'Phase 4 虚构微信文章网址无法生成来源标识。')

class FictionalProvider implements WechatArticleSearchProvider {
  calls: string[] = []

  async search(query: string): Promise<WechatArticleSearchItem[]> {
    this.calls.push(query)

    return [
      {
        publishedAt: '2026-08-18T00:00:00.000Z',
        sourceName: 'Phase 4 虚构公众号',
        summary: '这是一条完全虚构、只用于 Phase 4 运行验收的摘要。',
        title: 'Phase 4 完全虚构微信公众号文章',
        url: articleUrl,
      },
    ]
  }
}

async function requireHttpStatus(pathname: string, status: number, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${pathname}`, init)
  requireCondition(
    response.status === status,
    `${pathname} 返回 HTTP ${response.status}，预期为 ${status}。`,
  )
}

async function removeFictionalData(payload: Payload) {
  const candidates = await payload.find({
    collection: 'news-candidates',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: { sourceReference: { equals: sourceReference } },
  })

  for (const candidate of candidates.docs) {
    await payload.delete({
      collection: 'news-candidates',
      id: candidate.id,
      overrideAccess: true,
    })
  }

  for (const runNumber of createdRunNumbers) {
    const runs = await payload.find({
      collection: 'wechat-search-runs',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: { runNumber: { equals: runNumber } },
    })

    for (const run of runs.docs) {
      await payload.delete({
        collection: 'wechat-search-runs',
        id: run.id,
        overrideAccess: true,
      })
    }
  }

  const members = await payload.find({
    collection: 'members',
    depth: 0,
    limit: 10,
    overrideAccess: true,
    where: { slug: { equals: memberSlug } },
  })

  for (const member of members.docs) {
    await payload.delete({
      collection: 'members',
      id: member.id,
      overrideAccess: true,
    })
  }

  const remainingCandidates = await payload.find({
    collection: 'news-candidates',
    limit: 1,
    overrideAccess: true,
    where: { sourceReference: { equals: sourceReference } },
  })
  const remainingMembers = await payload.find({
    collection: 'members',
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: memberSlug } },
  })
  const remainingRuns = await Promise.all(
    createdRunNumbers.map((runNumber) =>
      payload.find({
        collection: 'wechat-search-runs',
        limit: 1,
        overrideAccess: true,
        where: { runNumber: { equals: runNumber } },
      }),
    ),
  )

  requireCondition(remainingCandidates.totalDocs === 0, '虚构新闻候选没有清理干净。')
  requireCondition(remainingMembers.totalDocs === 0, '虚构成员没有清理干净。')
  requireCondition(
    remainingRuns.every((result) => result.totalDocs === 0),
    '虚构公众号搜索记录没有清理干净。',
  )
  console.log('PASS：虚构成员、候选和公众号搜索记录均已清理。')
}

async function main() {
  const payload = await getPayload({ config })

  try {
    await payload.create({
      collection: 'members',
      data: {
        aliases: [{ value: `Phase 4 虚构署名 ${runId}` }],
        consentStatus: 'notRequested',
        name: `Phase 4 虚构成员 ${runId}`,
        penName: `Phase 4 虚构笔名 ${runId}`,
        searchKeywords: [{ value: `Phase 4 虚构关键词 ${runId}` }],
        slug: memberSlug,
        status: 'active',
      },
      overrideAccess: true,
    })

    const provider = new FictionalProvider()
    const store = createPayloadWechatSearchStore(payload)
    const first = await runWechatSearch({
      provider,
      store,
      trigger: 'verification',
    })
    createdRunNumbers.push(first.run.runNumber)

    requireCondition(first.statistics.status === 'succeeded', '第一次虚构搜索未成功。')
    requireCondition(first.statistics.apiCallCount === 4, '第一次搜索调用数不是 4。')
    requireCondition(first.statistics.resultCount === 4, '第一次搜索结果数不是 4。')
    requireCondition(first.statistics.createdCount === 1, '第一次搜索没有只创建一条候选。')
    requireCondition(first.statistics.duplicateCount === 3, '第一次搜索重复数不是 3。')
    console.log('PASS：第一次虚构全公众号搜索创建 1 条候选并跳过 3 条同次重复。')

    const candidates = await payload.find({
      collection: 'news-candidates',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: { sourceReference: { equals: sourceReference } },
    })
    requireCondition(candidates.totalDocs === 1, '数据库中的虚构候选数量不是 1。')
    const candidate = candidates.docs[0]
    requireCondition(candidate.status === 'pending', '自动搜索候选不是待核实状态。')
    requireCondition(candidate.sourceType === 'automaticSearch', '候选来源不是自动搜索。')
    requireCondition(candidate.category === 'other', '候选错误地被自动分类。')
    requireCondition(!candidate.relatedMember, '候选错误地自动关联了成员。')
    console.log('PASS：候选保持待核实、未分类和未自动关联成员。')

    const second = await runWechatSearch({
      provider: new FictionalProvider(),
      store,
      trigger: 'verification',
    })
    createdRunNumbers.push(second.run.runNumber)

    requireCondition(second.statistics.status === 'succeeded', '第二次虚构搜索未成功。')
    requireCondition(second.statistics.createdCount === 0, '第二次搜索错误新增了候选。')
    requireCondition(second.statistics.duplicateCount === 4, '第二次搜索没有跳过全部重复。')
    console.log('PASS：第二次搜索没有重复写入文章。')

    for (const runNumber of createdRunNumbers) {
      const runs = await payload.find({
        collection: 'wechat-search-runs',
        limit: 1,
        overrideAccess: true,
        where: { runNumber: { equals: runNumber } },
      })
      requireCondition(runs.totalDocs === 1, `搜索记录 ${runNumber} 不存在。`)
      requireCondition(runs.docs[0].completedAt, `搜索记录 ${runNumber} 没有完成时间。`)
    }
    console.log('PASS：两次搜索均保存了可追溯运行记录。')

    await requireHttpStatus('/api/wechat-search-runs?limit=1', 403)
    await requireHttpStatus('/api/internal/wechat-search/run', 401, { method: 'POST' })
    console.log('PASS：未登录用户不能读取搜索记录或启动搜索。')

    await requireHttpStatus('/', 200)
    await requireHttpStatus('/submit', 200)
    await requireHttpStatus('/admin', 200)
    console.log('PASS：首页、投稿页和 Payload 后台均返回 HTTP 200。')
  } finally {
    await removeFictionalData(payload)
  }
}

await main()
