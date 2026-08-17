import type { Payload } from 'payload'

import type {
  NewsCandidateStore,
  ValidNewsCandidateInput,
} from './ingestNewsCandidate'
import { generateNewsCandidateNumber } from './newsCandidateNumber'

function toPayloadData(data: ValidNewsCandidateInput) {
  return {
    candidateNumber: generateNewsCandidateNumber(),
    category: data.category,
    discoveredAt: new Date().toISOString(),
    ...(data.publishedAt ? { publishedAt: data.publishedAt } : {}),
    ...(data.relatedMember === undefined
      ? {}
      : { relatedMember: data.relatedMember }),
    ...(data.relatedPersonName
      ? { relatedPersonName: data.relatedPersonName }
      : {}),
    ...(data.sourceName ? { sourceName: data.sourceName } : {}),
    ...(data.sourceReference
      ? { sourceReference: data.sourceReference }
      : {}),
    sourceType: data.sourceType,
    ...(data.sourceUrl ? { sourceUrl: data.sourceUrl } : {}),
    status: 'pending' as const,
    ...(data.summary ? { summary: data.summary } : {}),
    title: data.title,
  }
}

export function createPayloadNewsCandidateStore(
  payload: Payload,
): NewsCandidateStore {
  return {
    async create(data) {
      const created = await payload.create({
        collection: 'news-candidates',
        data: toPayloadData(data),
        overrideAccess: true,
      })

      return { candidateNumber: created.candidateNumber }
    },
  }
}
