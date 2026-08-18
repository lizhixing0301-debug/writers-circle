import type { Payload } from 'payload'

import { ingestNewsCandidate } from '../newsCandidates/ingestNewsCandidate'
import { createPayloadNewsCandidateStore } from '../newsCandidates/payloadNewsCandidateStore'
import { generateWechatSearchRunNumber } from '../collections/WechatSearchRuns'
import type {
  WechatCandidateInput,
  WechatSearchRunUpdate,
  WechatSearchStore,
  WechatSearchTrigger,
} from './searchTypes'

function textValues(
  values: null | undefined | Array<{ value?: null | string }>,
): Array<{ value: string }> {
  return (values ?? []).flatMap(({ value }) =>
    typeof value === 'string' ? [{ value }] : [],
  )
}

export function createPayloadWechatSearchStore(payload: Payload): WechatSearchStore {
  return {
    async getActiveMembers() {
      const result = await payload.find({
        collection: 'members',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        select: {
          aliases: true,
          id: true,
          name: true,
          penName: true,
          searchKeywords: true,
        },
        where: { status: { equals: 'active' } },
      })

      return result.docs.map((member) => ({
        aliases: textValues(member.aliases),
        id: member.id,
        name: member.name,
        penName: member.penName,
        searchKeywords: textValues(member.searchKeywords),
      }))
    },

    async candidateExists(sourceReference) {
      const result = await payload.find({
        collection: 'news-candidates',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        select: { id: true },
        where: { sourceReference: { equals: sourceReference } },
      })

      return result.docs.length > 0
    },

    async createCandidate({ item, query, sourceReference }: WechatCandidateInput) {
      const result = await ingestNewsCandidate(
        {
          category: 'other',
          publishedAt: item.publishedAt ?? '',
          relatedPersonName: query.slice(0, 100),
          sourceName: item.sourceName ?? '',
          sourceReference,
          sourceType: 'automaticSearch',
          sourceUrl: item.url,
          summary: item.summary ?? '',
          title: item.title,
        },
        createPayloadNewsCandidateStore(payload),
      )

      if (result.kind !== 'created') {
        throw new Error('搜索结果格式不符合新闻候选要求。')
      }

      return { candidateNumber: result.candidateNumber }
    },

    async createRun(trigger: WechatSearchTrigger) {
      const created = await payload.create({
        collection: 'wechat-search-runs',
        data: {
          apiCallCount: 0,
          completedAt: null,
          createdCount: 0,
          duplicateCount: 0,
          errorSummary: null,
          failedQueryCount: 0,
          memberCount: 0,
          plannedQueryCount: 0,
          resultCount: 0,
          runNumber: generateWechatSearchRunNumber(),
          startedAt: null,
          status: 'queued',
          trigger,
        },
        overrideAccess: true,
      })

      return { id: created.id, runNumber: created.runNumber }
    },

    async updateRun(id: number | string, data: WechatSearchRunUpdate) {
      await payload.update({
        collection: 'wechat-search-runs',
        data,
        id,
        overrideAccess: true,
      })
    },
  }
}
