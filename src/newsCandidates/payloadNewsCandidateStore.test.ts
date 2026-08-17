import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import type { ValidNewsCandidateInput } from './ingestNewsCandidate'
import { createPayloadNewsCandidateStore } from './payloadNewsCandidateStore'

const data: ValidNewsCandidateInput = {
  category: 'media',
  publishedAt: '',
  relatedPersonName: '虚构成员',
  sourceName: '虚构媒体',
  sourceReference: 'fictional-adapter-001',
  sourceType: 'manual',
  sourceUrl: 'https://example.com/fictional-adapter',
  summary: '完全虚构的适配器测试摘要。',
  title: '完全虚构的适配器测试候选',
}

describe('Payload 新闻候选存储适配器', () => {
  it('新候选始终以待核实状态写入，并且只返回候选编号', async () => {
    const createCalls: unknown[] = []
    const payload = {
      async create(args: unknown) {
        createCalls.push(args)
        const request = args as {
          data: { candidateNumber: string; discoveredAt: string }
        }

        return {
          ...data,
          candidateNumber: request.data.candidateNumber,
          createdAt: '2026-08-17T00:00:00.000Z',
          discoveredAt: request.data.discoveredAt,
          id: 101,
          status: 'pending',
          updatedAt: '2026-08-17T00:00:00.000Z',
        }
      },
    } as unknown as Payload

    const result = await createPayloadNewsCandidateStore(payload).create(data)

    expect(result).toEqual({
      candidateNumber: expect.stringMatching(/^NEWS-\d{8}-[A-F0-9]{8}$/),
    })
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0]).toMatchObject({
      collection: 'news-candidates',
      data: {
        candidateNumber: expect.stringMatching(/^NEWS-\d{8}-[A-F0-9]{8}$/),
        category: 'media',
        discoveredAt: expect.any(String),
        relatedPersonName: '虚构成员',
        sourceName: '虚构媒体',
        sourceReference: 'fictional-adapter-001',
        sourceType: 'manual',
        sourceUrl: 'https://example.com/fictional-adapter',
        status: 'pending',
        summary: '完全虚构的适配器测试摘要。',
        title: '完全虚构的适配器测试候选',
      },
      overrideAccess: true,
    })
    expect(createCalls[0]).not.toHaveProperty('data.publishedAt')
  })
})
