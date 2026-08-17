import { describe, expect, it } from 'vitest'

import {
  processPublicSubmission,
  SubmissionRateLimiter,
  type SubmissionStore,
  type ValidSubmission,
  validatePublicSubmission,
} from './publicSubmission'

const validInput = {
  category: 'prose',
  contact: 'fictional-wechat-contact',
  content: '这是一篇完全虚构、只用于自动化测试的投稿正文。',
  notes: '',
  penName: '测试笔名',
  requestToken: '12345678-abcd-4abc-8def-1234567890ab',
  rightsConfirmed: true,
  submitterName: '虚构投稿人',
  title: '虚构测试稿件',
  website: '',
}

class FakeSubmissionStore implements SubmissionStore {
  created: ValidSubmission[] = []
  existing: { submissionNumber: string } | null = null
  createError: Error | null = null

  async findByRequestToken() {
    return this.existing
  }

  async create(data: ValidSubmission) {
    if (this.createError) throw this.createError
    this.created.push(data)
    return { submissionNumber: 'WC-20260817-ABCDEF12' }
  }
}

describe('公开投稿校验', () => {
  it('整理合法字段并移除反垃圾字段', () => {
    const result = validatePublicSubmission({
      ...validInput,
      contact: '  fictional-wechat-contact  ',
      content: `  ${validInput.content}  `,
      notes: '  虚构补充说明  ',
      penName: '  测试笔名  ',
      submitterName: '  虚构投稿人  ',
      title: '  虚构测试稿件  ',
    })

    expect(result).toEqual({
      data: {
        category: 'prose',
        contact: 'fictional-wechat-contact',
        content: validInput.content,
        notes: '虚构补充说明',
        penName: '测试笔名',
        requestToken: validInput.requestToken,
        rightsConfirmed: true,
        submitterName: '虚构投稿人',
        title: '虚构测试稿件',
      },
      ok: true,
    })
  })

  it.each([
    ['submitterName', { submitterName: '   ' }],
    ['contact', { contact: '' }],
    ['title', { title: '' }],
    ['category', { category: '' }],
    ['content', { content: '' }],
    ['requestToken', { requestToken: '' }],
    ['rightsConfirmed', { rightsConfirmed: false }],
  ] as const)('缺少 %s 时拒绝保存', (field, replacement) => {
    const result = validatePublicSubmission({ ...validInput, ...replacement })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors[field]).toBeTruthy()
  })

  it('拒绝过短和过长的正文', () => {
    const tooShort = validatePublicSubmission({ ...validInput, content: '不足二十字' })
    const tooLong = validatePublicSubmission({
      ...validInput,
      content: '文'.repeat(100_001),
    })

    expect(tooShort.ok).toBe(false)
    expect(tooLong.ok).toBe(false)
    if (!tooShort.ok) expect(tooShort.fieldErrors.content).toContain('20')
    if (!tooLong.ok) expect(tooLong.fieldErrors.content).toContain('100000')
  })

  it('拒绝不在列表中的作品类别', () => {
    const result = validatePublicSubmission({ ...validInput, category: 'unknown' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fieldErrors.category).toBeTruthy()
  })

  it.each(['status', 'reviewNotes', 'relatedMember']) (
    '拒绝公开请求写入后台字段 %s',
    (field) => {
      const result = validatePublicSubmission({
        ...validInput,
        [field]: 'malicious-value',
      })

      expect(result).toMatchObject({ ok: false })
      if (!result.ok) expect(result.message).toContain('不允许')
    },
  )

  it('隐藏反垃圾字段被填写时拒绝投稿', () => {
    const result = validatePublicSubmission({ ...validInput, website: 'https://spam.test' })

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) expect(result.message).toBe('投稿未能通过验证，请返回后重试。')
  })
})

describe('投稿频率限制', () => {
  it('十分钟内允许五次并拒绝第六次', () => {
    const limiter = new SubmissionRateLimiter()

    expect(Array.from({ length: 5 }, () => limiter.consume('source-a', 1_000))).toEqual([
      true,
      true,
      true,
      true,
      true,
    ])
    expect(limiter.consume('source-a', 1_000)).toBe(false)
    expect(limiter.consume('source-b', 1_000)).toBe(true)
  })

  it('十分钟后允许同一来源再次投稿', () => {
    const limiter = new SubmissionRateLimiter(1, 600_000)

    expect(limiter.consume('source-a', 1_000)).toBe(true)
    expect(limiter.consume('source-a', 600_999)).toBe(false)
    expect(limiter.consume('source-a', 601_000)).toBe(true)
  })
})

describe('公开投稿处理', () => {
  it('相同请求标识返回原编号且不重复保存', async () => {
    const store = new FakeSubmissionStore()
    store.existing = { submissionNumber: 'WC-20260817-EXISTING' }

    const result = await processPublicSubmission(validInput, 'source-a', {
      limiter: new SubmissionRateLimiter(0),
      store,
    })

    expect(result).toEqual({
      duplicate: true,
      kind: 'created',
      submissionNumber: 'WC-20260817-EXISTING',
    })
    expect(store.created).toHaveLength(0)
  })

  it('超过频率限制时不写入数据库', async () => {
    const store = new FakeSubmissionStore()

    const result = await processPublicSubmission(validInput, 'source-a', {
      limiter: new SubmissionRateLimiter(0),
      store,
    })

    expect(result).toEqual({ kind: 'rateLimited' })
    expect(store.created).toHaveLength(0)
  })

  it('只把整理后的公开字段交给数据库', async () => {
    const store = new FakeSubmissionStore()

    const result = await processPublicSubmission(
      { ...validInput, submitterName: '  虚构投稿人  ' },
      'source-a',
      { limiter: new SubmissionRateLimiter(), store },
    )

    expect(result).toEqual({
      duplicate: false,
      kind: 'created',
      submissionNumber: 'WC-20260817-ABCDEF12',
    })
    expect(store.created).toEqual([
      {
        category: 'prose',
        contact: 'fictional-wechat-contact',
        content: validInput.content,
        notes: '',
        penName: '测试笔名',
        requestToken: validInput.requestToken,
        rightsConfirmed: true,
        submitterName: '虚构投稿人',
        title: '虚构测试稿件',
      },
    ])
  })

  it('数据库异常时不伪造成功结果', async () => {
    const store = new FakeSubmissionStore()
    store.createError = new Error('fictional database failure')

    await expect(
      processPublicSubmission(validInput, 'source-a', {
        limiter: new SubmissionRateLimiter(),
        store,
      }),
    ).rejects.toThrow('fictional database failure')
  })
})
