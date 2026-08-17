import { describe, expect, it } from 'vitest'

import {
  ingestNewsCandidate,
  type NewsCandidateStore,
  type ValidNewsCandidateInput,
  validateNewsCandidateInput,
} from './ingestNewsCandidate'

const validInput = {
  category: 'activity',
  publishedAt: '2026-08-16T00:00:00.000Z',
  relatedPersonName: '虚构候选成员',
  sourceName: '虚构文学机构',
  sourceReference: 'fictional-source-001',
  sourceType: 'manual',
  sourceUrl: 'https://example.com/fictional-news',
  summary: '这是一条完全虚构、只用于自动化测试的新闻摘要。',
  title: 'Phase 3 虚构新闻候选',
}

class FakeNewsCandidateStore implements NewsCandidateStore {
  created: ValidNewsCandidateInput[] = []
  createError?: Error

  async create(data: ValidNewsCandidateInput) {
    if (this.createError) throw this.createError
    this.created.push(data)

    return { candidateNumber: 'NEWS-20260817-ABCDEF12' }
  }
}

describe('新闻候选内部录入校验', () => {
  it('整理合法字段并保留明确的成员关联', () => {
    const result = validateNewsCandidateInput({
      ...validInput,
      category: '  activity  ',
      relatedMember: 32,
      relatedPersonName: '  虚构候选成员  ',
      sourceName: '  虚构文学机构  ',
      sourceReference: '  fictional-source-001  ',
      sourceType: '  manual  ',
      sourceUrl: '  https://example.com/fictional-news  ',
      summary: '  虚构摘要  ',
      title: '  Phase 3 虚构新闻候选  ',
    })

    expect(result).toEqual({
      data: {
        category: 'activity',
        publishedAt: '2026-08-16T00:00:00.000Z',
        relatedMember: 32,
        relatedPersonName: '虚构候选成员',
        sourceName: '虚构文学机构',
        sourceReference: 'fictional-source-001',
        sourceType: 'manual',
        sourceUrl: 'https://example.com/fictional-news',
        summary: '虚构摘要',
        title: 'Phase 3 虚构新闻候选',
      },
      ok: true,
    })
  })

  it('选填字段留空时仍可录入', () => {
    const result = validateNewsCandidateInput({
      category: 'other',
      publishedAt: '  ',
      relatedPersonName: '',
      sourceName: '',
      sourceReference: '',
      sourceType: 'manual',
      sourceUrl: '',
      summary: '',
      title: '虚构简要候选',
    })

    expect(result).toEqual({
      data: {
        category: 'other',
        publishedAt: '',
        relatedPersonName: '',
        sourceName: '',
        sourceReference: '',
        sourceType: 'manual',
        sourceUrl: '',
        summary: '',
        title: '虚构简要候选',
      },
      ok: true,
    })
  })

  it.each([
    ['title', { title: '   ' }],
    ['category', { category: '' }],
    ['sourceType', { sourceType: '' }],
  ] as const)('缺少 %s 时拒绝录入', (field, replacement) => {
    const result = validateNewsCandidateInput({ ...validInput, ...replacement })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors[field]).toBeTruthy()
  })

  it.each([
    ['category', { category: 'unknown' }],
    ['sourceType', { sourceType: 'unknown' }],
  ] as const)('%s 不在固定列表时拒绝录入', (field, replacement) => {
    const result = validateNewsCandidateInput({ ...validInput, ...replacement })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors[field]).toBeTruthy()
  })

  it.each(['javascript:alert(1)', 'file:///tmp/news', '不是网址'])(
    '拒绝不安全或无效的来源网址 %s',
    (sourceUrl) => {
      const result = validateNewsCandidateInput({ ...validInput, sourceUrl })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.fieldErrors.sourceUrl).toBeTruthy()
    },
  )

  it('拒绝无效的发表日期', () => {
    const result = validateNewsCandidateInput({
      ...validInput,
      publishedAt: '不是日期',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors.publishedAt).toContain('日期')
  })

  it.each([0, -1, 1.5, '', 'abc', [], {}])('拒绝无效的成员关联 %j', (relatedMember) => {
    const result = validateNewsCandidateInput({ ...validInput, relatedMember })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors.relatedMember).toBeTruthy()
  })

  it.each([
    ['title', 301],
    ['relatedPersonName', 101],
    ['sourceName', 201],
    ['sourceReference', 501],
    ['sourceUrl', 2001],
    ['summary', 3001],
  ] as const)('%s 超过长度限制时拒绝录入', (field, length) => {
    const value = field === 'sourceUrl' ? `https://example.com/${'x'.repeat(length)}` : '字'.repeat(length)
    const result = validateNewsCandidateInput({ ...validInput, [field]: value })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors[field]).toBeTruthy()
  })

  it.each([
    'candidateNumber',
    'status',
    'verificationNotes',
    'verifiedAt',
    'discoveredAt',
  ])('拒绝内部调用者写入后台管理字段 %s', (field) => {
    const result = validateNewsCandidateInput({
      ...validInput,
      [field]: '不允许的值',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('不允许')
  })

  it.each([null, [], '新闻候选'])('拒绝不是普通对象的输入 %j', (input) => {
    const result = validateNewsCandidateInput(input)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('格式')
  })
})

describe('新闻候选内部录入', () => {
  it('只把整理后的字段交给存储层并只返回候选编号', async () => {
    const store = new FakeNewsCandidateStore()

    const result = await ingestNewsCandidate(
      { ...validInput, title: '  Phase 3 虚构新闻候选  ' },
      store,
    )

    expect(result).toEqual({
      candidateNumber: 'NEWS-20260817-ABCDEF12',
      kind: 'created',
    })
    expect(store.created).toEqual([
      {
        category: 'activity',
        publishedAt: '2026-08-16T00:00:00.000Z',
        relatedPersonName: '虚构候选成员',
        sourceName: '虚构文学机构',
        sourceReference: 'fictional-source-001',
        sourceType: 'manual',
        sourceUrl: 'https://example.com/fictional-news',
        summary: '这是一条完全虚构、只用于自动化测试的新闻摘要。',
        title: 'Phase 3 虚构新闻候选',
      },
    ])
  })

  it('输入无效时不调用存储层', async () => {
    const store = new FakeNewsCandidateStore()

    const result = await ingestNewsCandidate({ ...validInput, title: '' }, store)

    expect(result).toMatchObject({ kind: 'invalid' })
    expect(store.created).toHaveLength(0)
  })

  it('数据库异常时不伪造成功结果', async () => {
    const store = new FakeNewsCandidateStore()
    store.createError = new Error('fictional database failure')

    await expect(ingestNewsCandidate(validInput, store)).rejects.toThrow(
      'fictional database failure',
    )
  })
})
